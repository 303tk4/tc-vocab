// 取り込みのプレビューと計画（仕様書 9.3）。DB には触れない純粋な処理
import type { Progress, Word } from '../types/word'
import { DuplicateIndex, mergeWords } from './duplicates'
import type { ParsedFile, ParsedRow } from './parsed'
import { LIMITS, tagError, type WordDraft } from './validate'

/**
 * 重複した単語の扱い（FR-IO-03）。
 * skip：重複分は追加しない、keepBoth：重複分も追加する、
 * merge：既存の単語と統合する、overwrite：上書きする（JSON のバックアップの復元用）
 */
export const DUPLICATE_STRATEGIES = ['skip', 'keepBoth', 'merge', 'overwrite'] as const

/**
 * 単語パッケージで選べる扱い（仕様書 16.5）。tagOnly：既存の単語にパッケージのタグだけを加える。
 * 「タグだけ付ける」はファイルのインポートでは選べない
 */
export const PACK_STRATEGIES = ['tagOnly', 'skip', 'merge', 'keepBoth'] as const

export type DuplicateStrategy =
  (typeof DUPLICATE_STRATEGIES)[number] | (typeof PACK_STRATEGIES)[number]

/** ファイルの形式ごとに選べる扱い。上書きは JSON だけ */
export function strategiesFor(kind: ParsedFile['kind']): DuplicateStrategy[] {
  return kind === 'json' ? [...DUPLICATE_STRATEGIES] : ['skip', 'keepBoth', 'merge']
}

export type RowStatus = 'new' | 'duplicate' | 'error'

export interface PreviewRow extends ParsedRow {
  status: RowStatus
}

export interface ImportPreview {
  rows: PreviewRow[]
  counts: Record<RowStatus, number>
}

/**
 * 各行を「新規」「重複」「エラー」に分類する（重複の判定は仕様書 6.1）。
 * 登録済みの単語に加え、ファイル内で先に出てきた単語と同じものも重複とみなす。
 */
export function previewImport(file: ParsedFile, existing: readonly Word[]): ImportPreview {
  const index = new DuplicateIndex<Pick<Word, 'hanzi' | 'pinyin'>>(existing)
  const counts: Record<RowStatus, number> = { new: 0, duplicate: 0, error: 0 }
  const rows = file.rows.map((row): PreviewRow => {
    let status: RowStatus
    if (!row.word) {
      status = 'error'
    } else {
      status = index.find(row.word) ? 'duplicate' : 'new'
      index.add(row.word)
    }
    counts[status]++
    return { ...row, status }
  })
  return { rows, counts }
}

export interface ImportOptions {
  strategy: DuplicateStrategy
  /** 取り込む全単語に付けるタグ（FR-IO-04）。空なら付けない */
  extraTag?: string
  now?: number
  newId?: () => string
}

export interface ImportPlan {
  /** 追加・更新する単語（bulkPut する） */
  words: Word[]
  progress: Progress[]
  /** 進捗を書き込む前に、既存の記録があればそちらを残す単語の id（統合した既存の単語） */
  keepExistingProgress: string[]
  added: number
  updated: number
  skipped: number
  /** 既存の単語（またはファイル内で先の単語）に統合した数 */
  merged: number
  /** 重複していたが、別の単語として追加した数（「重複分もインポートする」、または統合の上限超え） */
  duplicatesAdded: number
  /** 統合すると上限を超えるため、別の単語として追加した数 */
  mergeOverflow: number
  /** 「タグだけ付ける」でタグを加えた既存の単語の数 */
  tagged: number
  /** 「タグだけ付ける」で、タグが上限を超えるため変更しなかった単語の数 */
  tagOverflow: number
}

export function isValidExtraTag(tag: string): boolean {
  return tag.trim() === '' || tagError(tag) === null
}

export function planImport(
  file: ParsedFile,
  existing: readonly Word[],
  options: ImportOptions,
): ImportPlan {
  const now = options.now ?? Date.now()
  const newId = options.newId ?? (() => crypto.randomUUID())
  const extraTag = options.extraTag?.trim() ?? ''
  const usedIds = new Set(existing.map((w) => w.id))
  const existingIds = new Set(existing.map((w) => w.id))
  /** 重複の判定に使う索引。値は最新の内容を持つ単語を id で引くための入れ物 */
  const index = new DuplicateIndex<{ hanzi: string; pinyin: string; id: string }>(
    existing.map((w) => ({ hanzi: w.hanzi, pinyin: w.pinyin, id: w.id })),
  )
  /** id → 最新の内容（登録済み、またはこの取り込みで追加・変更するもの） */
  const current = new Map<string, Word>(existing.map((w) => [w.id, w]))
  /** 書き込む単語（id → 単語）。同じ単語を何度変更しても最後の内容になる */
  const output = new Map<string, Word>()
  /** ファイル内の id → 取り込み後の id（進捗の付け替えに使う） */
  const idMap = new Map<string, string>()
  const keepExistingProgress = new Set<string>()

  let added = 0
  let skipped = 0
  let merged = 0
  let duplicatesAdded = 0
  let mergeOverflow = 0
  const taggedIds = new Set<string>()
  let tagOverflow = 0
  const updatedIds = new Set<string>()

  const fields = (draft: WordDraft) => ({
    hanzi: draft.hanzi,
    zhuyin: draft.zhuyin,
    pinyin: draft.pinyin,
    meaning: draft.meaning,
    examples: draft.examples,
    tags: extraTag && !draft.tags.includes(extraTag) ? [...draft.tags, extraTag] : draft.tags,
  })

  const write = (word: Word) => {
    output.set(word.id, word)
    current.set(word.id, word)
    if (existingIds.has(word.id)) updatedIds.add(word.id)
  }

  for (const row of file.rows) {
    const draft = row.word
    if (!draft) continue // エラー行は取り込まない（FR-IO-05）
    const found = index.find(draft)
    const target = found ? current.get(found.id) : undefined

    if (target && options.strategy === 'skip') {
      skipped++
      continue
    }
    if (target && options.strategy === 'tagOnly') {
      // 既存の単語の内容と進捗は変えず、タグだけを加える（仕様書 16.5）
      const tags = fields(draft).tags.filter((tag) => !target.tags.includes(tag))
      if (tags.length === 0) {
        skipped++
      } else if (target.tags.length + tags.length > LIMITS.tags) {
        tagOverflow++
      } else {
        write({ ...target, tags: [...target.tags, ...tags], updatedAt: now })
        if (existingIds.has(target.id)) taggedIds.add(target.id)
      }
      continue
    }
    if (target && options.strategy === 'overwrite') {
      write({ ...target, ...fields(draft), updatedAt: now })
      if (draft.id) idMap.set(draft.id, target.id)
      continue
    }
    if (target && options.strategy === 'merge') {
      // 既存の単語を先に置き、読みと学習進捗は既存の側を優先する（仕様書 4.5）
      const incoming: Word = {
        id: target.id,
        ...fields(draft),
        createdAt: draft.createdAt ?? now,
        updatedAt: now,
      }
      const result = mergeWords([target, incoming], now)
      if (result.ok) {
        write(result.word)
        if (draft.id) idMap.set(draft.id, target.id)
        if (existingIds.has(target.id)) keepExistingProgress.add(target.id)
        merged++
        continue
      }
      mergeOverflow++ // 上限を超えるため、別の単語として追加する
    }

    // 新規、または重複を別の単語として追加。ファイルの id は、使われていなければ引き継ぐ
    const id = draft.id && !usedIds.has(draft.id) ? draft.id : newId()
    usedIds.add(id)
    const word: Word = {
      id,
      ...fields(draft),
      createdAt: draft.createdAt ?? now,
      updatedAt: draft.updatedAt ?? now,
    }
    write(word)
    index.add({ hanzi: word.hanzi, pinyin: word.pinyin, id })
    if (draft.id) idMap.set(draft.id, id)
    added++
    if (target) duplicatesAdded++
  }

  const progress = file.progress.flatMap((p) => {
    const wordId = idMap.get(p.wordId)
    return wordId ? [{ ...p, wordId }] : []
  })
  return {
    words: [...output.values()],
    progress,
    keepExistingProgress: [...keepExistingProgress],
    added,
    updated: updatedIds.size - mergedExisting(updatedIds, keepExistingProgress) - taggedIds.size,
    skipped,
    merged,
    duplicatesAdded,
    mergeOverflow,
    tagged: taggedIds.size,
    tagOverflow,
  }
}

/** 統合で変更した既存の単語は「更新」に数えない */
function mergedExisting(updated: Set<string>, mergedIds: Set<string>): number {
  let n = 0
  for (const id of mergedIds) if (updated.has(id)) n++
  return n
}
