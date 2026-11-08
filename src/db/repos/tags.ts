// タグの編集（FR-WORDS-08〜11）。単語の updatedAt は更新し、学習進捗には触れない
import { LIMITS, normalizeTags, tagError } from '../../io/validate'
import type { Word } from '../../types/word'
import { db } from '../schema'

export class InvalidTagError extends Error {
  constructor() {
    super('invalid tag')
    this.name = 'InvalidTagError'
  }
}

function checkedTag(tag: string): string {
  if (tagError(tag)) throw new InvalidTagError()
  return tag.trim()
}

export interface AddTagSummary {
  /** タグを付ける単語 */
  targets: Word[]
  /** 既に付いている単語の数 */
  already: number
  /** タグが上限に達していて付けられない単語の数 */
  overLimit: number
}

/** 単語にタグを付けた場合の内訳（確認画面と書き込みの両方で使う） */
export function summarizeAddTag(words: readonly Word[], tag: string): AddTagSummary {
  const name = tag.trim()
  const targets: Word[] = []
  let already = 0
  let overLimit = 0
  for (const w of words) {
    if (w.tags.includes(name)) already++
    else if (w.tags.length >= LIMITS.tags) overLimit++
    else targets.push(w)
  }
  return { targets, already, overLimit }
}

/** 選択した単語にタグを付ける。付けた単語の数などを返す */
export async function addTagToWords(
  ids: readonly string[],
  tag: string,
  now = Date.now(),
): Promise<Omit<AddTagSummary, 'targets'> & { added: number }> {
  const name = checkedTag(tag)
  return db.transaction('rw', db.words, async () => {
    const words = (await db.words.bulkGet([...ids])).filter((w): w is Word => !!w)
    const { targets, already, overLimit } = summarizeAddTag(words, name)
    await db.words.bulkPut(targets.map((w) => ({ ...w, tags: [...w.tags, name], updatedAt: now })))
    return { added: targets.length, already, overLimit }
  })
}

/** 選択した単語からタグを外し、外した単語の数を返す */
export function removeTagFromWords(
  ids: readonly string[],
  tag: string,
  now = Date.now(),
): Promise<number> {
  return db.transaction('rw', db.words, async () => {
    const words = (await db.words.bulkGet([...ids])).filter(
      (w): w is Word => !!w && w.tags.includes(tag),
    )
    await db.words.bulkPut(
      words.map((w) => ({ ...w, tags: w.tags.filter((x) => x !== tag), updatedAt: now })),
    )
    return words.length
  })
}

/** 1語のタグをまとめて置き換える */
export async function setWordTags(id: string, tags: readonly string[], now = Date.now()) {
  const next = normalizeTags(tags)
  if (next.length > LIMITS.tags || next.some((t) => tagError(t))) throw new InvalidTagError()
  const changed = await db.words.update(id, { tags: next, updatedAt: now })
  if (changed === 0) throw new Error('word not found')
}

/**
 * タグの名前を変える。新しい名前のタグが既にあれば1つにまとめる。
 * 変更した単語の数を返す
 */
export async function renameTag(from: string, to: string, now = Date.now()): Promise<number> {
  const name = checkedTag(to)
  if (name === from) return 0
  return db.transaction('rw', db.words, async () => {
    const words = await db.words.where('tags').equals(from).toArray()
    await db.words.bulkPut(
      words.map((w) => ({
        ...w,
        // 元の位置に新しい名前を入れ、既に付いていれば重ねない
        tags: normalizeTags(w.tags.map((x) => (x === from ? name : x))),
        updatedAt: now,
      })),
    )
    return words.length
  })
}

/** タグを全単語から外し（単語は残す）、外した単語の数を返す */
export function removeTagEverywhere(tag: string, now = Date.now()): Promise<number> {
  return db.transaction('rw', db.words, async () => {
    const words = await db.words.where('tags').equals(tag).toArray()
    await db.words.bulkPut(
      words.map((w) => ({ ...w, tags: w.tags.filter((x) => x !== tag), updatedAt: now })),
    )
    return words.length
  })
}
