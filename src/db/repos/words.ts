import type { Word } from '../../types/word'
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
