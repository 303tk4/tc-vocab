// 國家教育研究院「臺灣華語文能力基準」三等七級詞語表（TBCL）の読み取り（仕様書 16.5）
import { normalizeZhuyin } from './zhuyin.mjs'

/** TBCL の級（表の「ji」列の値）。「*」の付いた級は、その級と次の級の間（TOCFL の対応図の「+」）とみなす */
export const TBCL_LEVELS = [
  '第1級',
  '第1*級',
  '第2級',
  '第2*級',
  '第3級',
  '第3*級',
  '第4級',
  '第4*級',
  '第5級',
  '第6級',
  '第7級',
]

/**
 * 「爸爸/爸」「和1」のような見出しを、語の配列にする。
 * 末尾の数字（同じ字で読みや意味が異なる語の区別）は取り除く。
 * @param {string} word
 * @returns {string[]}
 */
export function splitHeadword(word) {
  return word
    .split('/')
    .map((w) => w.trim().replace(/[0-9０-９]+$/, ''))
    .filter(Boolean)
}

/**
 * 詞語表の読みを整える。
 * - 注音の「ㄧ」の代わりに漢字の「一」が使われていれば直す
 * - 儿化の「ㄦ」が独立した音節として書かれていれば、前の音節に付ける（「ㄋㄚˇ ㄦ」→「ㄋㄚˇㄦ」）
 * @param {string} z
 * @returns {string}
 */
export function normalizeTbclZhuyin(z) {
  const syls = normalizeZhuyin(z.replace(/一/g, 'ㄧ')).split(' ').filter(Boolean)
  const out = []
  for (const s of syls) {
    if (s === 'ㄦ' && out.length > 0) out[out.length - 1] += 'ㄦ'
    else out.push(s)
  }
  return out.join(' ')
}

/**
 * 「ㄅㄚˋ ˙ㄅㄚ / ㄅㄚˋ」のような読みを、読みの配列にする。
 * @param {string} bopomofo
 * @returns {string[]}
 */
export function splitReadings(bopomofo) {
  return bopomofo.split('/').map(normalizeTbclZhuyin).filter(Boolean)
}

/** 読みの音節の数が、語の字数（儿化なら1つ少なくてもよい）と合うか */
function fitsWord(hanzi, zhuyin) {
  const n = zhuyin.split(' ').length
  const chars = [...hanzi]
  return n === chars.length || (n === chars.length - 1 && chars.at(-1) === '兒')
}

/**
 * 詞語表の行（1行目は見出し）を語の配列にする。
 * 見出しが「A/B」のときは別々の語にし、読みは同じ順の読みを対応させる。
 * 見出しが1つで読みが複数（例：「和1」の「ㄏㄢˋ / ㄏㄜˊ」）のときは、すべての読みを候補として持つ。
 * @param {string[][]} rows
 * @returns {{ id: string, hanzi: string, level: string, stage: string, situation: string, readings: string[] }[]}
 */
export function parseTbclRows(rows) {
  const [header, ...body] = rows
  const col = (name) => {
    const i = header.indexOf(name)
    if (i < 0) throw new Error(`詞語表に列「${name}」がありません`)
    return i
  }
  const c = {
    id: col('id'),
    word: col('word'),
    deng: col('deng'),
    ji: col('ji'),
    situation: col('situation'),
    bopomofo: col('bopomofo'),
  }
  const out = []
  for (const r of body) {
    if (!r[c.word]) continue
    const words = splitHeadword(r[c.word])
    const readings = splitReadings(r[c.bopomofo] ?? '')
    words.forEach((hanzi, i) => {
      // 語と読みの数が合えば同じ順の読みを、合わなければ音節の数が合う読みを手がかりにする
      const cand =
        words.length === 1
          ? readings
          : readings.length === words.length
            ? [readings[i]]
            : readings.filter((z) => fitsWord(hanzi, z))
      out.push({
        id: r[c.id],
        hanzi,
        level: r[c.ji],
        stage: r[c.deng],
        situation: r[c.situation] ?? '',
        readings: cand,
      })
    })
  }
  return out
}
