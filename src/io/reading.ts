// 読みの入力補助（仕様書 16.4 段階1・FR-WORDS-18）。DB に依存しない純粋な処理
// 注音 → 拼音の変換は、単語パッケージを作るスクリプト scripts/packs/lib/zhuyin.mjs と同じ規則。
// 結果は声調記号つき、音節は半角スペース区切り（仕様書 6.1）。

const INITIALS: Record<string, string> = {
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
const FINALS: Record<string, string> = {
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
const ZERO_INITIAL: Record<string, string> = {
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

/** 声調（1〜4、5 は軽声） */
type Tone = 1 | 2 | 3 | 4 | 5

const ZHUYIN_TONE_MARKS: Record<string, Tone> = { ˊ: 2, ˇ: 3, ˋ: 4, '˙': 5 }
const ZHUYIN_MARK_OF: Record<Tone, string> = { 1: '', 2: 'ˊ', 3: 'ˇ', 4: 'ˋ', 5: '˙' }

// 第1〜4声の母音（ê の第1・3声は結合文字を含むため、配列で持つ）
const TONED: Record<string, readonly string[]> = {
  a: ['ā', 'á', 'ǎ', 'à'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  e: ['ē', 'é', 'ě', 'è'],
  ê: ['ê̄', 'ế', 'ê̌', 'ề'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
}

// 拼音の声調記号（分解したときの結合文字）
const COMBINING_TONES: Record<string, Tone> = {
  '\u0304': 1,
  '\u0301': 2,
  '\u030c': 3,
  '\u0300': 4,
}

/**
 * 注音の表記を揃える。
 * - 全角スペース・連続する空白を半角スペース1つに
 * - 軽声の「˙」は音節の先頭に置く（例：「ㄉㄜ˙」→「˙ㄉㄜ」）
 * - 第一声の記号「ˉ」は書かない
 */
export function normalizeZhuyin(s: string): string {
  return s
    .replace(/[\u3000\s]+/g, ' ')
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
function markVowelIndex(base: string): number {
  const a = base.indexOf('a')
  if (a >= 0) return a
  const e = base.search(/[eê]/)
  if (e >= 0) return e
  const ou = base.indexOf('ou')
  if (ou >= 0) return ou
  for (let i = base.length - 1; i >= 0; i--) if ('iouü'.includes(base[i])) return i
  return -1
}

/** 声調記号を付ける。base は小文字で判定し、大文字はそのまま大文字で返す */
function applyTone(base: string, tone: Tone): string {
  if (tone === 5) return base
  const i = markVowelIndex(base.toLowerCase())
  if (i < 0) return base
  const ch = base[i]
  const toned = TONED[ch.toLowerCase()][tone - 1]
  return (
    base.slice(0, i) + (ch === ch.toLowerCase() ? toned : toned.toUpperCase()) + base.slice(i + 1)
  )
}

/** 注音1音節の本体（声調記号なし）を、声調のない拼音にする。組み合わせがなければ null */
function zhuyinBodyToBase(body: string): string | null {
  const first = body[0]
  if (first === undefined) return null
  let base: string
  if (first in INITIALS) {
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
    base = INITIALS[first] + f
  } else {
    if (!(body in ZERO_INITIAL)) return null
    base = ZERO_INITIAL[body]
  }
  return base.replace('v', 'ü')
}

/** 注音1音節を拼音にする。変換できなければ null。例：「ㄐㄧㄝˊ」→「jié」 */
export function syllableToPinyin(syl: string): string | null {
  let tone: Tone = 1
  let body = ''
  for (const ch of syl) {
    if (ch in ZHUYIN_TONE_MARKS) tone = ZHUYIN_TONE_MARKS[ch]
    else body += ch
  }
  // 儿化（「ㄉㄧㄢˇㄦ」のように ㄦ が後ろに付く）
  let erhua = false
  if (body.length > 1 && body.endsWith('ㄦ')) {
    erhua = true
    body = body.slice(0, -1)
  }
  const base = zhuyinBodyToBase(body)
  if (base === null) return null
  return applyTone(base, tone) + (erhua ? 'r' : '')
}

/** 注音（音節は空白区切り）を拼音にする。変換できない音節があれば null */
export function zhuyinToPinyin(zhuyin: string): string | null {
  const syls = normalizeZhuyin(zhuyin).split(' ').filter(Boolean)
  if (syls.length === 0) return null
  const out: string[] = []
  for (const s of syls) {
    const p = syllableToPinyin(s)
    if (p === null) return null
    out.push(p)
  }
  return out.join(' ')
}

// ---- 拼音 → 注音 ----

/** 声調のない拼音 → 注音の本体。実在する組み合わせだけを載せる */
const BASE_TO_ZHUYIN: ReadonlyMap<string, string> = (() => {
  const map = new Map<string, string>()
  for (const body of Object.keys(ZERO_INITIAL)) {
    const base = zhuyinBodyToBase(body)
    if (base) map.set(base, body)
  }
  for (const initial of Object.keys(INITIALS)) {
    for (const fin of Object.keys(FINALS)) {
      const medialIU = fin.startsWith('ㄧ') || fin.startsWith('ㄩ')
      // ㄐㄑㄒ は ㄧ・ㄩ の韻母とだけ、ㄍㄎㄏ・ㄓㄔㄕㄖ・ㄗㄘㄙ・ㄈ は ㄧ・ㄩ 以外とだけ組み合わさる
      if ('ㄐㄑㄒ'.includes(initial) && !medialIU) continue
      if ('ㄍㄎㄏㄓㄔㄕㄖㄗㄘㄙㄈ'.includes(initial) && medialIU) continue
      const base = zhuyinBodyToBase(initial + fin)
      if (base && !map.has(base)) map.set(base, initial + fin)
    }
  }
  return map
})()

/** 拼音の1音節（声調は別に持つ）。base は声調記号を除いた文字（大文字・小文字はそのまま） */
interface PinyinSyllable {
  base: string
  /** null は声調の記号も数字もないもの */
  tone: Tone | null
}

/** 一文字ずつ、声調記号を除いた文字と声調に分ける。ü・ê の点や山は残す */
function splitToneMarks(s: string): { chars: string[]; tones: (Tone | null)[] } | null {
  const chars: string[] = []
  const tones: (Tone | null)[] = []
  for (const ch of s.normalize('NFC')) {
    const parts = [...ch.normalize('NFD')]
    let tone: Tone | null = null
    let rest = ''
    for (const p of parts) {
      if (p in COMBINING_TONES) tone = COMBINING_TONES[p]
      else rest += p
    }
    rest = rest.normalize('NFC')
    if (rest === '') {
      // 前の文字に付いた結合文字（ê̄ の ̄ など）
      if (chars.length === 0 || tone === null) return null
      tones[tones.length - 1] = tone
      continue
    }
    chars.push(rest)
    tones.push(tone)
  }
  return { chars, tones }
}

const MAX_SYLLABLE = 7 // zhuang + r など

/**
 * 区切りのない拼音（例：jieyun）を音節に分け、各音節の終わりの位置を返す。分けられなければ null。
 * 長い音節（儿化の dianr を含む）を優先する。
 * 1音節に声調記号が2つ入る分け方はしない（nǚér を nüe + r にしない）。
 * lower は小文字で ü に揃えたもの。tones は文字ごとの声調記号
 */
function segment(lower: string, tones: readonly (Tone | null)[]): number[] | null {
  const n = lower.length
  // memo[i]：位置 i から最後まで分けたときの区切り
  const memo = new Map<number, number[] | null>()
  const oneTone = (i: number, j: number) => tones.slice(i, j).filter((t) => t !== null).length <= 1
  const plain = (s: string) => BASE_TO_ZHUYIN.has(s)
  const erhua = (s: string) => s.length > 1 && s.endsWith('r') && plain(s.slice(0, -1))
  const rec = (i: number): number[] | null => {
    if (i === n) return []
    const cached = memo.get(i)
    if (cached !== undefined) return cached
    let result: number[] | null = null
    for (let len = Math.min(MAX_SYLLABLE, n - i); len >= 1 && !result; len--) {
      const s = lower.slice(i, i + len)
      if (!(plain(s) || erhua(s)) || !oneTone(i, i + len)) continue
      const rest = rec(i + len)
      if (rest) result = [i + len, ...rest]
    }
    memo.set(i, result)
    return result
  }
  return rec(0)
}

/**
 * 入力された拼音を音節に分ける。声調は記号でも数字（1〜4、軽声は 5 か 0）でもよい。
 * 音節は空白・アポストロフィ・ハイフンで区切るか、区切らずに続けて書ける。
 * 拼音として読めない部分があれば null
 */
export function parsePinyin(input: string): PinyinSyllable[] | null {
  const chunks = input
    .normalize('NFC')
    .trim()
    .split(/[\s\u3000'’-]+/)
    .filter(Boolean)
  if (chunks.length === 0) return null
  const out: PinyinSyllable[] = []
  for (const chunk of chunks) {
    // 数字の声調で区切る（jie2yun4 → jie2 / yun4）
    const pieces = chunk.match(/[^0-9]+[0-9]?|[0-9]/g) ?? []
    for (const piece of pieces) {
      const m = /^([^0-9]+)([0-9])?$/.exec(piece)
      if (!m) return null
      const digit = m[2] === undefined ? null : Number(m[2])
      if (digit !== null && digit > 5) return null
      const split = splitToneMarks(m[1].replace(/u:/gi, (u) => (u[0] === 'U' ? 'Ü' : 'ü')))
      if (!split) return null
      // v は ü として扱う（lv4 → lǜ）
      const chars = split.chars.map((c) => (c === 'v' ? 'ü' : c === 'V' ? 'Ü' : c))
      const lower = chars.join('').toLowerCase()
      if (!/^[a-zêü]+$/.test(lower)) return null
      const bounds = segment(lower, split.tones)
      if (!bounds) return null
      let start = 0
      bounds.forEach((end, k) => {
        const base = chars.slice(start, end).join('')
        const marked = split.tones.slice(start, end).find((t) => t !== null) ?? null
        const last = k === bounds.length - 1
        // 数字の声調は、その直前の音節に付く。0 は軽声
        const tone = last && digit !== null ? ((digit === 0 ? 5 : digit) as Tone) : marked
        out.push({ base, tone })
        start = end
      })
    }
  }
  return out
}

/** 数字の声調を含むか（jie2、lv4 など） */
export function hasToneNumber(pinyin: string): boolean {
  return /[a-zA-ZüÜêÊ:][0-5]/.test(pinyin)
}

/**
 * 数字の声調の拼音を、声調記号つき・音節ごとに半角スペース区切りにする（仕様書 16.4）。
 * 数字を含まない、または拼音として読めない場合は、前後の空白を除いてそのまま返す
 */
export function normalizePinyin(pinyin: string): string {
  const trimmed = pinyin.trim()
  if (!hasToneNumber(trimmed)) return trimmed
  const syllables = parsePinyin(trimmed)
  if (!syllables) return trimmed
  return syllables.map((s) => applyTone(s.base, s.tone ?? 5)).join(' ')
}

/**
 * 拼音を注音にする。変換できない音節がある場合と、声調が1つも書かれていない場合
 * （声調を省いた入力を、すべて軽声と誤って変換しないため）は null
 */
export function pinyinToZhuyin(pinyin: string): string | null {
  const syllables = parsePinyin(pinyin)
  if (!syllables || syllables.every((s) => s.tone === null)) return null
  const out: string[] = []
  for (const { base, tone } of syllables) {
    let lower = base.toLowerCase()
    let erhua = ''
    if (!BASE_TO_ZHUYIN.has(lower) && lower.endsWith('r')) {
      lower = lower.slice(0, -1)
      erhua = 'ㄦ'
    }
    const body = BASE_TO_ZHUYIN.get(lower)
    if (body === undefined) return null
    const t = tone ?? 5
    out.push(t === 5 ? `˙${body}${erhua}` : `${body}${ZHUYIN_MARK_OF[t]}${erhua}`)
  }
  return out.join(' ')
}
