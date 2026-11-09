// 単語パッケージの組み立て（仕様書 16.5）。入出力を持たない純粋な処理だけを置く。
import { zhuyinToPinyin } from './zhuyin.mjs'

/** 読みが決まらない語に付けるタグ（仕様書 16.4） */
export const NEEDS_CHECK_TAG = '要確認:読み'

/**
 * TBCL の級 → タグ。例：「第1級」→「TBCL:1級」
 * 「*」の級（同じ級の中で難度が相対的に高い語）は利用者にわかりにくいため区別せず、
 * 「第1*級」も「TBCL:1級」にまとめる（利用者の決定。README 参照）。
 * @param {string} level
 */
export function tbclTag(level) {
  return `TBCL:${level.replace(/^第/, '').replace('*', '')}`
}

/**
 * 意味の TSV（「id<TAB>繁体字<TAB>意味」。# で始まる行と空行は無視）を読む。
 * キーは「id:繁体字」。
 * @param {string} text
 * @returns {Map<string, string>}
 */
export function parseMeanings(text) {
  const map = new Map()
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim() || line.startsWith('#')) return
    const cols = line.split('\t')
    if (cols.length < 3) throw new Error(`意味の ${i + 1} 行目：列が足りません`)
    const [id, hanzi, ...rest] = cols
    const meaning = rest.join('\t').trim()
    const key = `${id.trim()}:${hanzi.trim()}`
    if (map.has(key)) throw new Error(`意味の ${i + 1} 行目：${key} が重複しています`)
    if (!meaning) throw new Error(`意味の ${i + 1} 行目：意味が空です`)
    map.set(key, meaning)
  })
  return map
}

/**
 * 詞語表の語から、パッケージの単語（仕様書 9.1 の words の要素）を作る。
 * - 読みは decide（reading.mjs の decideReading を部分適用したもの）で決め、拼音は注音から変換する
 * - 同じ繁体字・同じ拼音の語（仕様書 6.1 の重複）は、最初（級の低いほう）だけを残す
 * - 意味がない語は missing に入れる
 * @param {{ id: string, hanzi: string, level: string, readings: string[] }[]} entries
 * @param {{
 *   decide: (hanzi: string, hints: string[]) => { zhuyin: string, sure: boolean, reason: string, hint: string },
 *   meanings: Map<string, string>,
 *   tagsFor: (entry: { level: string }) => string[],
 * }} opts
 */
export function buildWords(entries, { decide, meanings, tagsFor }) {
  const words = []
  const seen = new Set()
  const missing = []
  const readingNotes = []
  for (const e of entries) {
    const r = decide(e.hanzi, e.readings)
    const pinyin = r.zhuyin ? zhuyinToPinyin(r.zhuyin) : ''
    if (pinyin === null) throw new Error(`拼音に変換できません：${e.hanzi}（${r.zhuyin}）`)
    const dupKey = `${e.hanzi}\u0000${pinyin.toLowerCase()}`
    if (seen.has(dupKey)) continue
    seen.add(dupKey)
    const key = `${e.id}:${e.hanzi}`
    const meaning = meanings.get(key)
    if (!meaning) missing.push({ key, hanzi: e.hanzi, zhuyin: r.zhuyin, pinyin, level: e.level })
    const tags = [...tagsFor(e)]
    if (!r.sure) tags.push(NEEDS_CHECK_TAG)
    if (r.reason !== 'match') readingNotes.push({ hanzi: e.hanzi, level: e.level, ...r })
    words.push({
      hanzi: e.hanzi,
      zhuyin: r.zhuyin,
      pinyin,
      meaning: meaning ?? '',
      examples: [],
      tags,
    })
  }
  return { words, missing, readingNotes }
}

/**
 * パッケージのファイル（仕様書 9.1 の形式）の中身を作る。
 * @param {object[]} words
 * @param {string} exportedAt ISO 8601
 */
export function packFile(words, exportedAt) {
  return { format: 'tc-vocab', version: 1, exportedAt, words }
}
