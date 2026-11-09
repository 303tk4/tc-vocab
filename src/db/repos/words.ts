import { planImport, type ImportOptions, type ImportPlan } from '../../io/importer'
import type { ParsedFile } from '../../io/parsed'
import type { Progress, Word } from '../../types/word'
import { db } from '../schema'

export function countWords(): Promise<number> {
  return db.words.count()
}

/** タグを1つ以上指定した場合は、いずれかのタグを持つ単語に絞り込む */
export async function listWords(tags: string[] = []): Promise<Word[]> {
  if (tags.length === 0) return db.words.toArray()
  return db.words.where('tags').anyOf(tags).distinct().toArray()
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

export type ImportResult = Pick<ImportPlan, 'added' | 'updated' | 'skipped'>

/**
 * 解析済みファイルを取り込む。重複の判定から書き込みまでを1つのトランザクションで行い、
 * 途中で失敗した場合は何も取り込まない（FR-IO-06）
 */
export function importWords(file: ParsedFile, options: ImportOptions): Promise<ImportResult> {
  return db.transaction('rw', db.words, db.progress, async () => {
    const existing = await db.words.toArray()
    const plan = planImport(file, existing, options)
    await db.words.bulkPut(plan.words)
    if (plan.progress.length > 0) await db.progress.bulkPut(plan.progress)
    return { added: plan.added, updated: plan.updated, skipped: plan.skipped }
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
