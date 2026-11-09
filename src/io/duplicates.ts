// 重複の判定と統合（仕様書 6.1・4.5 FR-WORDS-13）。DB には触れない純粋な処理
import type { Progress, Word } from '../types/word'
import { charLength, LIMITS, normalizeTags } from './validate'

type Keyed = Pick<Word, 'hanzi' | 'pinyin'>

const hanziKey = (w: Keyed) => w.hanzi.trim()
const pinyinKey = (w: Keyed) => w.pinyin.trim().toLowerCase()

/** 重複かどうか。繁体字が同じで、拼音が同じか、どちらかの拼音が空 */
export function isDuplicate(a: Keyed, b: Keyed): boolean {
  if (hanziKey(a) !== hanziKey(b)) return false
  const pa = pinyinKey(a)
  const pb = pinyinKey(b)
  return pa === '' || pb === '' || pa === pb
}

/** 重複する単語をすばやく探すための索引（繁体字ごとに分ける） */
export class DuplicateIndex<T extends Keyed> {
  private readonly byHanzi = new Map<string, T[]>()

  constructor(items: Iterable<T> = []) {
    for (const item of items) this.add(item)
  }

  add(item: T): void {
    const key = hanziKey(item)
    const list = this.byHanzi.get(key)
    if (list) list.push(item)
    else this.byHanzi.set(key, [item])
  }

  /** 重複する項目。拼音まで一致するものを優先し、なければ拼音が空のものを返す */
  find(word: Keyed): T | undefined {
    const list = this.byHanzi.get(hanziKey(word))
    if (!list) return undefined
    const pinyin = pinyinKey(word)
    return (
      list.find((item) => pinyin !== '' && pinyinKey(item) === pinyin) ??
      list.find((item) => isDuplicate(item, word))
    )
  }
}

/** 先に登録した順（作成日時が古い順。同じなら id 順） */
export function byRegistration(a: Word, b: Word): number {
  return a.createdAt - b.createdAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
}

/**
 * 重複している単語の組を返す。各組は先に登録した順に並べる。
 * 同じ繁体字で拼音が2種類以上あれば拼音ごとに組にし、拼音が空の単語は組に含めない
 */
export function findDuplicateGroups(words: readonly Word[]): Word[][] {
  const byHanzi = new Map<string, Word[]>()
  for (const w of words) {
    const key = hanziKey(w)
    const list = byHanzi.get(key)
    if (list) list.push(w)
    else byHanzi.set(key, [w])
  }
  const groups: Word[][] = []
  for (const list of byHanzi.values()) {
    if (list.length < 2) continue
    const byPinyin = new Map<string, Word[]>()
    for (const w of list) {
      const key = pinyinKey(w)
      if (key === '') continue
      const sub = byPinyin.get(key)
      if (sub) sub.push(w)
      else byPinyin.set(key, [w])
    }
    const candidates = byPinyin.size <= 1 ? [list] : [...byPinyin.values()]
    for (const group of candidates) {
      if (group.length >= 2) groups.push([...group].sort(byRegistration))
    }
  }
  return groups.sort((a, b) => byRegistration(a[0], b[0]))
}

export type MergeOverflow = 'meaning' | 'examples' | 'tags'

export type MergeResult = { ok: true; word: Word } | { ok: false; overflow: MergeOverflow }

/**
 * 単語を1つにまとめる（仕様書 4.5 の統合の規則）。
 * 先頭の単語を残す単語とし、その id・読みを優先する。words は2語以上
 */
export function mergeWords(words: readonly Word[], now: number): MergeResult {
  const [base] = words
  const first = (pick: (w: Word) => string) =>
    words.map(pick).find((v) => v.trim() !== '') ?? pick(base)

  const meanings: string[] = []
  for (const w of words) {
    const m = w.meaning.trim()
    if (m !== '' && !meanings.includes(m)) meanings.push(m)
  }
  const meaning = meanings.join(' / ')

  const examples: Word['examples'] = []
  for (const w of words) {
    for (const ex of w.examples) {
      const same = examples.findIndex((e) => e.text === ex.text)
      if (same < 0) examples.push(ex)
      else if (!examples[same].translation && ex.translation) examples[same] = ex
    }
  }

  const tags = normalizeTags(words.flatMap((w) => w.tags))

  if (charLength(meaning) > LIMITS.meaning) return { ok: false, overflow: 'meaning' }
  if (examples.length > LIMITS.examples) return { ok: false, overflow: 'examples' }
  if (tags.length > LIMITS.tags) return { ok: false, overflow: 'tags' }

  return {
    ok: true,
    word: {
      id: base.id,
      hanzi: base.hanzi,
      zhuyin: first((w) => w.zhuyin),
      pinyin: first((w) => w.pinyin),
      meaning,
      examples,
      tags,
      createdAt: Math.min(...words.map((w) => w.createdAt)),
      updatedAt: now,
    },
  }
}

/**
 * 統合で残す学習進捗。学習モードごとに、最後に学習した記録（updatedAt が新しい方）を
 * 残す単語の id に付け替えて返す
 */
export function pickProgress(records: readonly Progress[], survivorId: string): Progress[] {
  const byMode = new Map<string, Progress>()
  for (const p of records) {
    const current = byMode.get(p.modeId)
    if (!current || p.updatedAt > current.updatedAt) byMode.set(p.modeId, p)
  }
  return [...byMode.values()].map((p) => ({ ...p, wordId: survivorId }))
}
