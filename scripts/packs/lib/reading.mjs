// 繁体字から注音を決める（仕様書 16.4 段階2）
// 教育部《重編國語辭典修訂本》の見出し語と注音を使う。辞書の拼音は使わない。
// 詞語表（TBCL）の読みは、辞書の候補から選ぶための手がかりとして使う。
import { normalizeZhuyin } from './zhuyin.mjs'

/**
 * 辞書の行から、見出し語 → 注音の候補（主な読みと、又音などの変体）の Map を作る。
 * 変体のうち「變」（連読変調などの変読）は候補に入れない。
 * @param {string[][]} rows 辞書のシート（1行目は見出し）
 * @returns {Map<string, { main: string[], variant: string[] }>}
 */
export function buildReadingIndex(rows) {
  const [header, ...body] = rows
  const col = (prefix) => {
    const i = header.findIndex((h) => h.startsWith(prefix))
    if (i < 0) throw new Error(`辞書に列「${prefix}」がありません`)
    return i
  }
  const cName = col('字詞名')
  const cZhuyin = col('注音一式')
  const cVarType = col('變體類型')
  const cVarZhuyin = col('變體注音')
  const index = new Map()
  for (const r of body) {
    const name = (r[cName] ?? '').trim()
    const z = normalizeZhuyin(r[cZhuyin] ?? '')
    if (!name || !z) continue
    let e = index.get(name)
    if (!e) index.set(name, (e = { main: [], variant: [] }))
    if (!e.main.includes(z)) e.main.push(z)
    const vt = (r[cVarType] ?? '').trim()
    const vz = normalizeZhuyin(r[cVarZhuyin] ?? '')
    if (vz && vt && !vt.startsWith('變') && !e.variant.includes(vz)) e.variant.push(vz)
  }
  return index
}

/**
 * 詞語表では一般的な字で、辞書では別の字体で見出しになっている字。
 * 辞書を引くときだけ置き換える（単語の繁体字は詞語表のまま）。
 */
// 「唇」は辞書では ㄓㄣ（驚く）の見出しで、くちびるの意味は「脣」にある
export const DICT_VARIANT_CHARS = {
  台: '臺',
  裏: '裡',
  着: '著',
  污: '汙',
  唇: '脣',
  曬: '晒',
  羡: '羨',
  癡: '痴',
  舖: '鋪',
  樑: '梁',
}

/**
 * 辞書を引く。字体を置き換えた見出し（「台灣」→「臺灣」）があれば、その読みも候補に加える。
 * @returns {{ main: string[], variant: string[] } | undefined}
 */
export function lookup(text, index) {
  const e = index.get(text)
  const altText = [...text].map((c) => DICT_VARIANT_CHARS[c] ?? c).join('')
  const alt = altText !== text ? index.get(altText) : undefined
  if (!e || !alt) return e ?? alt
  const uniq = (xs) => [...new Set(xs)]
  return { main: uniq([...e.main, ...alt.main]), variant: uniq([...e.variant, ...alt.variant]) }
}

/** 候補の組み合わせの上限（長い語で組み合わせが増えすぎないように） */
const MAX_COMBINATIONS = 256

/**
 * 最長一致で語を辞書の見出し語に区切る。辞書にない字は1字のまま、候補なしで返す。
 * @param {string} hanzi
 * @param {Map<string, { main: string[], variant: string[] }>} index
 * @returns {{ text: string, candidates: string[] }[]}
 */
export function segment(hanzi, index) {
  const chars = [...hanzi]
  const out = []
  let i = 0
  while (i < chars.length) {
    let found = null
    for (let j = chars.length; j > i; j--) {
      const text = chars.slice(i, j).join('')
      const e = lookup(text, index)
      if (e) {
        found = { text, candidates: [...e.main, ...e.variant] }
        i = j
        break
      }
    }
    if (found) out.push(found)
    else out.push({ text: chars[i++], candidates: [] })
  }
  return out
}

/** 区切りごとの候補の組み合わせ（直積）を作る */
function combinations(segments) {
  let acc = ['']
  for (const s of segments) {
    const next = []
    for (const a of acc) {
      for (const c of s.candidates) {
        if (next.length < MAX_COMBINATIONS) next.push(a ? `${a} ${c}` : c)
      }
    }
    acc = next
  }
  return acc
}

/**
 * 読みの音節と対応させる字の並び。儿化（「一點兒」の「ㄉㄧㄢˇㄦ」）で音節が1つ少ないときは、末尾の「兒」を除く。
 * 音節の数と合わなければ null。
 * @param {string} hanzi
 * @param {number} syllables
 * @returns {string[] | null}
 */
export function alignChars(hanzi, syllables) {
  const chars = [...hanzi]
  if (chars.length === syllables) return chars
  if (chars.length === syllables + 1 && chars.at(-1) === '兒') return chars.slice(0, -1)
  return null
}

/** 声調記号を除いた音節 */
const toneless = (s) => s.replace(/[ˊˇˋ˙]/g, '')

/**
 * 2つの読みが、表記の流儀の違いを除いて同じかどうか。
 * - 「一」「不」の連読変調（辞書は本来の声調、詞語表は変調後で書くことがある）
 * - 片方が軽声（˙）で、もう片方が本来の声調
 * @param {string} hanzi
 * @param {string} a
 * @param {string} b
 */
export function looselyEqual(hanzi, a, b) {
  const sa = a.split(' ')
  const sb = b.split(' ')
  if (sa.length !== sb.length) return false
  const chars = alignChars(hanzi, sa.length)
  return sa.every((x, i) => {
    const y = sb[i]
    if (x === y) return true
    if (toneless(x) !== toneless(y)) return false
    if (chars && (chars[i] === '一' || chars[i] === '不')) return true
    return x.startsWith('˙') || y.startsWith('˙')
  })
}

/**
 * 語の注音を決める。
 * 1. 辞書の候補（語全体。なければ最長一致で区切った組み合わせ）を集める
 * 2. 詞語表の読みと一致する候補があれば、それを使う（確定。2つの公式の資料で一致）
 * 3. 表記の流儀の違い（looselyEqual）だけで一致する候補があれば、辞書の表記を使う（確定）
 * 4. 辞書に語として載っていて主な読みが1つだけで、詞語表の読みが欠けている → 辞書の読み（確定）
 * 5. それ以外 → 候補の先頭（なければ詞語表の読み）を使い、要確認とする
 * @param {string} hanzi
 * @param {string[]} hints 詞語表の読み（優先順）
 * @param {Map<string, { main: string[], variant: string[] }>} index
 * @returns {{ zhuyin: string, sure: boolean, reason: string, hint: string }}
 */
export function decideReading(hanzi, hints, index) {
  const hs = hints.map(normalizeZhuyin).filter(Boolean)
  const whole = lookup(hanzi, index)
  let cands
  if (whole) {
    cands = [...whole.main, ...whole.variant]
  } else {
    const segs = segment(hanzi, index)
    cands = segs.every((s) => s.candidates.length > 0) ? combinations(segs) : []
    // 「哪兒」のような儿化の語は、「哪」の読みに「ㄦ」を付けた読みも候補にする
    if (hanzi.length > 1 && hanzi.endsWith('兒')) {
      const base = lookup(hanzi.slice(0, -1), index)
      if (base) for (const z of [...base.main, ...base.variant]) cands.push(`${z}ㄦ`)
    }
  }
  const hint = hs[0] ?? ''
  for (const h of hs)
    if (cands.includes(h)) return { zhuyin: h, sure: true, reason: 'match', hint: h }
  for (const h of hs) {
    const c = cands.find((x) => looselyEqual(hanzi, x, h))
    if (c) return { zhuyin: c, sure: true, reason: 'loose', hint: h }
  }
  if (whole && whole.main.length === 1) {
    const n = whole.main[0].split(' ').length
    const incomplete = hs.every((h) => h.split(' ').length !== n)
    return { zhuyin: whole.main[0], sure: incomplete, reason: incomplete ? 'dict' : 'differ', hint }
  }
  if (cands.length > 0) return { zhuyin: cands[0], sure: false, reason: 'ambiguous', hint }
  if (hint) return { zhuyin: hint, sure: false, reason: 'tbcl-only', hint }
  return { zhuyin: '', sure: false, reason: 'none', hint }
}
