// 会話の文に注音・拼音を付ける（仕様書 18.6）。単語集と同じ辞書と規則（scripts/packs/lib）を使う
import { segment } from '../../packs/lib/reading.mjs'
import { normalizeZhuyin, zhuyinToPinyin } from '../../packs/lib/zhuyin.mjs'

/** 漢字（CJK 統合漢字とその拡張）の並び */
const HAN = /\p{Script=Han}+/gu

/** 全角の句読点と、拼音で使う半角の記号 */
const PUNCT_TO_ASCII = {
  '，': ',',
  '。': '.',
  '？': '?',
  '！': '!',
  '、': ',',
  '：': ':',
  '；': ';',
}

/**
 * 文を、漢字の並びとそれ以外（句読点・英数字・空白）に分ける
 * @param {string} text
 * @returns {{ han: boolean, text: string }[]}
 */
export function splitRuns(text) {
  const out = []
  let last = 0
  for (const m of text.matchAll(HAN)) {
    if (m.index > last) out.push({ han: false, text: text.slice(last, m.index) })
    out.push({ han: true, text: m[0] })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ han: false, text: text.slice(last) })
  return out
}

/**
 * 区切りの読みを決める。優先の表（prefer）にあればそれ、無ければ辞書の候補の先頭。
 * 候補が複数あって優先の表に無いものは、要確認として記録する
 */
function choose(seg, prefer, notes) {
  const p = prefer[seg.text]
  if (p) return normalizeZhuyin(p)
  if (seg.candidates.length === 0) {
    notes.push({ text: seg.text, reason: 'none', candidates: [] })
    return null
  }
  const uniq = [...new Set(seg.candidates)]
  if (uniq.length > 1) notes.push({ text: seg.text, reason: 'ambiguous', candidates: uniq })
  return uniq[0]
}

/**
 * 文の注音と拼音を作る。
 * - 注音は音節を半角スペースで区切り、句読点はそのまま直前に付ける
 * - 拼音も音節を半角スペースで区切り（単語の拼音と同じ。仕様書 6.1）、句読点は半角にする
 * - 漢字以外（英字など）はそのまま残す
 * @param {string} text 繁体字の文
 * @param {Map<string, { main: string[], variant: string[] }>} index 辞書（buildReadingIndex）
 * @param {Record<string, string>} prefer 語や字 → 注音（多音字の読みの指定）
 * @returns {{ zhuyin: string, pinyin: string, notes: { text: string, reason: string, candidates: string[] }[] }}
 */
export function readSentence(text, index, prefer = {}) {
  const notes = []
  const zh = []
  const py = []
  const punct = (s) => {
    const trimmed = s.trim()
    if (!trimmed) return
    const ascii = [...trimmed].map((c) => PUNCT_TO_ASCII[c] ?? c).join('')
    // 句読点は直前の語に付け、英数字などは独立した語にする
    if (/^[\p{P}\s]+$/u.test(trimmed)) {
      if (zh.length > 0) zh[zh.length - 1] += trimmed
      else zh.push(trimmed)
      if (py.length > 0) py[py.length - 1] += ascii
      else py.push(ascii)
    } else {
      zh.push(trimmed)
      py.push(trimmed)
    }
  }
  for (const run of splitRuns(text)) {
    if (!run.han) {
      punct(run.text)
      continue
    }
    for (const seg of segment(run.text, index)) {
      const z = choose(seg, prefer, notes)
      if (z === null) {
        zh.push('?')
        py.push('?')
        continue
      }
      zh.push(z)
      const p = zhuyinToPinyin(z)
      py.push(p === null ? '?' : p)
    }
  }
  // 全角の句読点の後には空白を入れない（句読点自体に幅があるため）
  const zhuyin = zh.join(' ').replace(/([，。？！、：；]) /g, '$1')
  return { zhuyin, pinyin: py.join(' '), notes }
}
