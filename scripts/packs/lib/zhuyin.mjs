// 注音の正規化と、注音 → 拼音の変換（仕様書 16.4 段階2「拼音は注音から音節の対応表で変換する」）
// 声母・韻母の組み合わせ規則で変換する。結果は声調記号つき、音節は半角スペース区切り（仕様書 6.1）。

const INITIALS = {
  ㄅ: 'b',
  ㄆ: 'p',
  ㄇ: 'm',
  ㄈ: 'f',
  ㄉ: 'd',
  ㄊ: 't',
  ㄋ: 'n',
  ㄌ: 'l',
  ㄍ: 'g',
  ㄎ: 'k',
  ㄏ: 'h',
  ㄐ: 'j',
  ㄑ: 'q',
  ㄒ: 'x',
  ㄓ: 'zh',
  ㄔ: 'ch',
  ㄕ: 'sh',
  ㄖ: 'r',
  ㄗ: 'z',
  ㄘ: 'c',
  ㄙ: 's',
}

// 声母がある場合の韻母（v は ü を表す。あとで置き換える）
const FINALS = {
  '': '',
  ㄚ: 'a',
  ㄛ: 'o',
  ㄜ: 'e',
  ㄝ: 'ê',
  ㄞ: 'ai',
  ㄟ: 'ei',
  ㄠ: 'ao',
  ㄡ: 'ou',
  ㄢ: 'an',
  ㄣ: 'en',
  ㄤ: 'ang',
  ㄥ: 'eng',
  ㄦ: 'er',
  ㄧ: 'i',
  ㄧㄚ: 'ia',
  ㄧㄛ: 'io',
  ㄧㄝ: 'ie',
  ㄧㄞ: 'iai',
  ㄧㄠ: 'iao',
  ㄧㄡ: 'iu',
  ㄧㄢ: 'ian',
  ㄧㄣ: 'in',
  ㄧㄤ: 'iang',
  ㄧㄥ: 'ing',
  ㄨ: 'u',
  ㄨㄚ: 'ua',
  ㄨㄛ: 'uo',
  ㄨㄞ: 'uai',
  ㄨㄟ: 'ui',
  ㄨㄢ: 'uan',
  ㄨㄣ: 'un',
  ㄨㄤ: 'uang',
  ㄨㄥ: 'ong',
  ㄩ: 'v',
  ㄩㄝ: 've',
  ㄩㄢ: 'van',
  ㄩㄣ: 'vn',
  ㄩㄥ: 'iong',
}

// 声母がない場合の韻母
const ZERO_INITIAL = {
  ㄚ: 'a',
  ㄛ: 'o',
  ㄜ: 'e',
  ㄝ: 'ê',
  ㄞ: 'ai',
  ㄟ: 'ei',
  ㄠ: 'ao',
  ㄡ: 'ou',
  ㄢ: 'an',
  ㄣ: 'en',
  ㄤ: 'ang',
  ㄥ: 'eng',
  ㄦ: 'er',
  ㄧ: 'yi',
  ㄧㄚ: 'ya',
  ㄧㄛ: 'yo',
  ㄧㄝ: 'ye',
  ㄧㄞ: 'yai',
  ㄧㄠ: 'yao',
  ㄧㄡ: 'you',
  ㄧㄢ: 'yan',
  ㄧㄣ: 'yin',
  ㄧㄤ: 'yang',
  ㄧㄥ: 'ying',
  ㄨ: 'wu',
  ㄨㄚ: 'wa',
  ㄨㄛ: 'wo',
  ㄨㄞ: 'wai',
  ㄨㄟ: 'wei',
  ㄨㄢ: 'wan',
  ㄨㄣ: 'wen',
  ㄨㄤ: 'wang',
  ㄨㄥ: 'weng',
  ㄩ: 'yu',
  ㄩㄝ: 'yue',
  ㄩㄢ: 'yuan',
  ㄩㄣ: 'yun',
  ㄩㄥ: 'yong',
}

const TONE_MARKS = { ˊ: 2, ˇ: 3, ˋ: 4, '˙': 5 }
// 第1〜4声の母音（ê の第1・3声は結合文字を含むため、配列で持つ）
const TONED = {
  a: ['ā', 'á', 'ǎ', 'à'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  e: ['ē', 'é', 'ě', 'è'],
  ê: ['ê̄', 'ế', 'ê̌', 'ề'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
}

/**
 * 注音の表記を揃える。
 * - 全角スペース・連続する空白を半角スペース1つに
 * - 軽声の「˙」は音節の先頭に置く（例：「ㄉㄜ˙」→「˙ㄉㄜ」）
 * - 第一声の記号「ˉ」は書かない
 * @param {string} s
 * @returns {string}
 */
export function normalizeZhuyin(s) {
  return s
    .replace(/[　\s]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((syl) => {
      let t = syl.replace(/ˉ/g, '').replace(/[·•・]/g, '˙')
      if (t.includes('˙')) t = '˙' + t.replace(/˙/g, '')
      return t
    })
    .join(' ')
}

/** 声調記号を付ける母音の位置（a・e があればそれ、ou なら o、それ以外は最後の母音） */
function markVowelIndex(base) {
  const a = base.indexOf('a')
  if (a >= 0) return a
  const e = base.search(/[eê]/)
  if (e >= 0) return e
  const ou = base.indexOf('ou')
  if (ou >= 0) return ou
  for (let i = base.length - 1; i >= 0; i--) if ('iouü'.includes(base[i])) return i
  return -1
}

function applyTone(base, tone) {
  if (tone === 1 || tone === 2 || tone === 3 || tone === 4) {
    const i = markVowelIndex(base)
    if (i < 0) return base
    return base.slice(0, i) + TONED[base[i]][tone - 1] + base.slice(i + 1)
  }
  return base
}

/**
 * 注音1音節を拼音にする。変換できなければ null。
 * @param {string} syl 例：「ㄐㄧㄝˊ」「˙ㄇㄜ」「ㄉㄧㄢˇㄦ」
 * @returns {string | null}
 */
export function syllableToPinyin(syl) {
  let tone = 1
  let body = ''
  for (const ch of syl) {
    if (ch in TONE_MARKS) tone = TONE_MARKS[ch]
    else body += ch
  }
  // 儿化（「ㄉㄧㄢˇㄦ」のように ㄦ が後ろに付く）
  let erhua = false
  if (body.length > 1 && body.endsWith('ㄦ')) {
    erhua = true
    body = body.slice(0, -1)
  }
  const first = body[0]
  let base
  if (first in INITIALS) {
    const initial = INITIALS[first]
    const fin = body.slice(1)
    if (!(fin in FINALS)) return null
    // ㄩ で始まる韻母は ㄋㄌㄐㄑㄒ のあとにしか来ない
    if (fin.startsWith('ㄩ') && !'ㄋㄌㄐㄑㄒ'.includes(first)) return null
    let f = FINALS[fin]
    if (fin === '') {
      // 舌尖母音：ㄓㄔㄕㄖㄗㄘㄙ だけで音節になる（zhi, ci など）
      if (!'ㄓㄔㄕㄖㄗㄘㄙ'.includes(first)) return null
      f = 'i'
    }
    // ㄐㄑㄒ のあとの ü は u と書く
    if ('ㄐㄑㄒ'.includes(first)) f = f.replace('v', 'u')
    base = initial + f
  } else {
    if (!(body in ZERO_INITIAL)) return null
    base = ZERO_INITIAL[body]
  }
  base = base.replace('v', 'ü')
  let out = applyTone(base, tone)
  if (erhua) out += 'r'
  return out
}

/**
 * 注音（音節は空白区切り）を拼音にする。変換できない音節があれば null。
 * @param {string} zhuyin
 * @returns {string | null}
 */
export function zhuyinToPinyin(zhuyin) {
  const syls = normalizeZhuyin(zhuyin).split(' ').filter(Boolean)
  if (syls.length === 0) return null
  const out = []
  for (const s of syls) {
    const p = syllableToPinyin(s)
    if (p === null) return null
    out.push(p)
  }
  return out.join(' ')
}
