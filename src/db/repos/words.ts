import {
  byRegistration,
  DuplicateIndex,
  findDuplicateGroups,
  mergeWords,
  pickProgress,
} from '../../io/duplicates'
import { planImport, type ImportOptions, type ImportPlan } from '../../io/importer'
import type { ParsedFile } from '../../io/parsed'
import { afterWordsSaved } from '../../services/storage-notice'
import type { Progress, Word, WordContent } from '../../types/word'
import { db } from '../schema'

export function countWords(): Promise<number> {
  return db.words.count()
}

/** タグを1つ以上指定した場合は、いずれかのタグを持つ単語に絞り込む */
export async function listWords(tags: string[] = []): Promise<Word[]> {
  if (tags.length === 0) return db.words.toArray()
  return db.words.where('tags').anyOf(tags).distinct().toArray()
}

/** 指定したタグのいずれかを持つ単語の数（単語集の登録状況。仕様書 16.5） */
export async function countWordsWithAnyTag(tags: readonly string[]): Promise<number> {
  if (tags.length === 0) return 0
  const ids = await db.words
    .where('tags')
    .anyOf([...tags])
    .primaryKeys()
  return new Set(ids).size
}

/** 登録済みの全タグ（重複なし・昇順） */
export async function listTags(): Promise<string[]> {
  const keys = await db.words.orderBy('tags').uniqueKeys()
  return (keys as string[]).sort((a, b) => a.localeCompare(b))
}

/** 指定した単語の進捗（エクスポート用） */
export function listProgressForWords(wordIds: string[]): Promise<Progress[]> {
  return db.progress.where('wordId').anyOf(wordIds).toArray()
}

export type ImportResult = Pick<
  ImportPlan,
  | 'added'
  | 'updated'
  | 'skipped'
  | 'merged'
  | 'duplicatesAdded'
  | 'mergeOverflow'
  | 'tagged'
  | 'tagOverflow'
>

/**
 * 解析済みファイルを取り込む。重複の判定から書き込みまでを1つのトランザクションで行い、
 * 途中で失敗した場合は何も取り込まない（FR-IO-06）
 */
export async function importWords(file: ParsedFile, options: ImportOptions): Promise<ImportResult> {
  const result = await importInTransaction(file, options)
  // 守るべきデータができた時点で、自動削除からの保護を要求する（FR-PWA-04）。
  // 保護されていなければ、データが消えうることを1回だけ知らせる（FR-PWA-06）
  if (result.added + result.duplicatesAdded > 0) void afterWordsSaved()
  return result
}

function importInTransaction(file: ParsedFile, options: ImportOptions): Promise<ImportResult> {
  return db.transaction('rw', db.words, db.progress, async () => {
    const existing = await db.words.toArray()
    const plan = planImport(file, existing, options)
    await db.words.bulkPut(plan.words)
    if (plan.progress.length > 0) {
      // 統合した既存の単語は、既存の学習進捗を優先する（仕様書 4.5）
      const keep = new Set(plan.keepExistingProgress)
      const existingKeys = new Set(
        keep.size === 0
          ? []
          : (
              await db.progress
                .where('wordId')
                .anyOf([...keep])
                .toArray()
            ).map((p) => `${p.modeId}:${p.wordId}`),
      )
      const progress = plan.progress.filter((p) => !existingKeys.has(`${p.modeId}:${p.wordId}`))
      if (progress.length > 0) await db.progress.bulkPut(progress)
    }
    const { added, updated, skipped, merged, duplicatesAdded, mergeOverflow, tagged, tagOverflow } =
      plan
    return { added, updated, skipped, merged, duplicatesAdded, mergeOverflow, tagged, tagOverflow }
  })
}

/** 単語と、その単語の学習進捗を削除する（仕様書 6.5） */
export function deleteWords(ids: string[]): Promise<void> {
  return db.transaction('rw', db.words, db.progress, async () => {
    await db.progress.where('wordId').anyOf(ids).delete()
    await db.words.bulkDelete(ids)
  })
}

/** 単語・学習進捗・学習履歴をすべて削除する。設定は残す（テストの準備などに使う） */
export function deleteAllData(): Promise<void> {
  return db.transaction('rw', db.words, db.progress, db.sessions, async () => {
    await Promise.all([db.words.clear(), db.progress.clear(), db.sessions.clear()])
  })
}

export interface MergeSummary {
  /** 統合した組の数 */
  merged: number
  /** 統合で取り除いた単語の数 */
  removed: number
  /** 上限を超える、または重複ではなくなっていたため統合しなかった組の数 */
  skipped: number
}

/**
 * 重複単語の組を統合する（FR-WORDS-13、仕様書 4.5 の統合の規則）。
 * 先に登録した単語を残し、学習進捗はモードごとに最後に学習した記録を付け替える。
 * すべての組を1つのトランザクションで書き込む（NFR-07）
 */
export function mergeDuplicateGroups(groups: string[][], now = Date.now()): Promise<MergeSummary> {
  return db.transaction('rw', db.words, db.progress, async () => {
    const summary: MergeSummary = { merged: 0, removed: 0, skipped: 0 }
    for (const ids of groups) {
      const words = (await db.words.bulkGet(ids)).filter((w): w is Word => !!w)
      // 画面を開いた後に内容が変わっていないか、組を作り直して確かめる
      const [group] = findDuplicateGroups(words)
      if (!group || group.length !== words.length) {
        summary.skipped++
        continue
      }
      const result = mergeWords([...group].sort(byRegistration), now)
      if (!result.ok) {
        summary.skipped++
        continue
      }
      const survivor = result.word
      const others = group.map((w) => w.id).filter((id) => id !== survivor.id)
      const records = await db.progress.where('wordId').anyOf(ids).toArray()
      await db.progress.where('wordId').anyOf(ids).delete()
      await db.progress.bulkPut(pickProgress(records, survivor.id))
      await db.words.bulkDelete(others)
      await db.words.put(survivor)
      summary.merged++
      summary.removed += others.length
    }
    return summary
  })
}

function contentOf(draft: WordContent): WordContent {
  const { hanzi, zhuyin, pinyin, meaning, examples, tags } = draft
  return { hanzi, zhuyin, pinyin, meaning, examples, tags }
}

/** 単語を1語追加する（FR-WORDS-15） */
export async function addWord(draft: WordContent, now = Date.now()): Promise<Word> {
  const word: Word = {
    id: crypto.randomUUID(),
    ...contentOf(draft),
    createdAt: now,
    updatedAt: now,
  }
  await db.words.add(word)
  // 守るべきデータができた時点で、自動削除からの保護を要求する（FR-PWA-04、FR-PWA-06）
  void afterWordsSaved()
  return word
}

export class WordNotFoundError extends Error {
  constructor() {
    super('word not found')
    this.name = 'WordNotFoundError'
  }
}

/**
 * 単語の内容を書き換える（FR-WORDS-16・FR-FC-16）。
 * id・作成日時はそのままで `updatedAt` だけを更新し、学習進捗には触れない
 */
export async function updateWord(id: string, draft: WordContent, now = Date.now()): Promise<Word> {
  const word = await db.transaction('rw', db.words, async () => {
    const current = await db.words.get(id)
    if (!current) throw new WordNotFoundError()
    const word: Word = { ...current, ...contentOf(draft), updatedAt: now }
    await db.words.put(word)
    return word
  })
  // 編集したときも、保護されていなければ1回だけ知らせる（FR-PWA-06）
  void afterWordsSaved()
  return word
}

/** 重複する登録済みの単語（仕様書 6.1。FR-WORDS-17）。excludeId は編集中の単語 */
export async function findDuplicateWord(
  draft: Pick<Word, 'hanzi' | 'pinyin'>,
  excludeId?: string,
): Promise<Word | undefined> {
  const candidates = await db.words.where('hanzi').equals(draft.hanzi.trim()).toArray()
  return new DuplicateIndex(candidates.filter((w) => w.id !== excludeId)).find(draft)
}

/** 1語を読む（存在しなければ undefined） */
export function getWord(id: string): Promise<Word | undefined> {
  return db.words.get(id)
}
