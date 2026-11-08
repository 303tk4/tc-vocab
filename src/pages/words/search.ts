import type { Word } from '../../types/word'

const compact = (s: string) => s.replace(/\s+/g, '')
/** 拼音の声調記号を外す（"jié" → "jie"） */
const stripTones = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

/**
 * 繁体字・注音・拼音・意味の部分一致で絞り込む関数を作る（FR-WORDS-02）。
 * 拼音は声調記号と空白を無視して比べる（"jieyun" で "jié yùn" が見つかる）
 */
export function createMatcher(query: string): (word: Word) => boolean {
  const q = query.trim().toLowerCase()
  if (q === '') return () => true
  const qCompact = compact(q)
  const qPinyin = stripTones(qCompact)
  return (w) =>
    w.hanzi.includes(q) ||
    w.meaning.toLowerCase().includes(q) ||
    compact(w.zhuyin).includes(qCompact) ||
    stripTones(compact(w.pinyin.toLowerCase())).includes(qPinyin)
}

/** 新しく登録した順。同時に登録したものは繁体字の順 */
export function sortWords(words: readonly Word[]): Word[] {
  const collator = new Intl.Collator('zh-Hant-TW')
  return [...words].sort((a, b) => b.createdAt - a.createdAt || collator.compare(a.hanzi, b.hanzi))
}
