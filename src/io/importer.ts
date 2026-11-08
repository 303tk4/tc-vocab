// 取り込みのプレビューと計画（仕様書 9.3）。DB には触れない純粋な処理
import type { Progress, Word } from '../types/word'
import type { ParsedFile, ParsedRow } from './parsed'
import { charLength, duplicateKey, LIMITS, type WordDraft } from './validate'

export const DUPLICATE_STRATEGIES = ['skip', 'overwrite', 'keepBoth'] as const
export type DuplicateStrategy = (typeof DUPLICATE_STRATEGIES)[number]

export type RowStatus = 'new' | 'duplicate' | 'error'

export interface PreviewRow extends ParsedRow {
  status: RowStatus
}

export interface ImportPreview {
  rows: PreviewRow[]
  counts: Record<RowStatus, number>
}

/**
 * 各行を「新規」「重複」「エラー」に分類する。
 * 登録済みの単語に加え、ファイル内で先に出てきた単語と同じものも重複とみなす。
 */
export function previewImport(file: ParsedFile, existing: readonly Word[]): ImportPreview {
  const seen = new Set(existing.map(duplicateKey))
  const counts: Record<RowStatus, number> = { new: 0, duplicate: 0, error: 0 }
  const rows = file.rows.map((row): PreviewRow => {
    let status: RowStatus
    if (!row.word) {
      status = 'error'
    } else {
      const key = duplicateKey(row.word)
      status = seen.has(key) ? 'duplicate' : 'new'
      seen.add(key)
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
  added: number
  updated: number
  skipped: number
}

export function isValidExtraTag(tag: string): boolean {
  return charLength(tag.trim()) <= LIMITS.tag
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
  /** 重複キー → 対象の単語（登録済み、またはこの取り込みで追加するもの） */
  const byKey = new Map<string, Word>(existing.map((w) => [duplicateKey(w), w]))
  /** 書き込む単語（id → 単語）。同じ単語を何度上書きしても最後の内容になる */
  const output = new Map<string, Word>()
  /** ファイル内の id → 取り込み後の id（進捗の付け替えに使う） */
  const idMap = new Map<string, string>()
  const existingIds = new Set(existing.map((w) => w.id))
  let added = 0
  let skipped = 0
  const updatedIds = new Set<string>()

  const fields = (draft: WordDraft) => ({
    hanzi: draft.hanzi,
    zhuyin: draft.zhuyin,
    pinyin: draft.pinyin,
    meaning: draft.meaning,
    examples: draft.examples,
    tags: extraTag && !draft.tags.includes(extraTag) ? [...draft.tags, extraTag] : draft.tags,
  })

  for (const row of file.rows) {
    const draft = row.word
    if (!draft) continue // エラー行は取り込まない（FR-IO-05）
    const key = duplicateKey(draft)
    const target = byKey.get(key)

    if (target && options.strategy === 'skip') {
      skipped++
      continue
    }

    if (target && options.strategy === 'overwrite') {
      const word: Word = { ...target, ...fields(draft), updatedAt: now }
      output.set(word.id, word)
      byKey.set(key, word)
      if (existingIds.has(word.id)) updatedIds.add(word.id)
      if (draft.id) idMap.set(draft.id, word.id)
      continue
    }

    // 新規、または「両方残す」。ファイルの id は、使われていなければ引き継ぐ
    const id = draft.id && !usedIds.has(draft.id) ? draft.id : newId()
    usedIds.add(id)
    const word: Word = {
      id,
      ...fields(draft),
      createdAt: draft.createdAt ?? now,
      updatedAt: draft.updatedAt ?? now,
    }
    output.set(id, word)
    if (!target) byKey.set(key, word)
    if (draft.id) idMap.set(draft.id, id)
    added++
  }

  const progress = file.progress.flatMap((p) => {
    const wordId = idMap.get(p.wordId)
    return wordId ? [{ ...p, wordId }] : []
  })

  return { words: [...output.values()], progress, added, updated: updatedIds.size, skipped }
}
