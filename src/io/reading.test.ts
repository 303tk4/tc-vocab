// 読みの入力補助のテスト（仕様書 16.4 段階1・FR-WORDS-18）
import { describe, expect, it } from 'vitest'
import {
  hasToneNumber,
  normalizePinyin,
  normalizeZhuyin,
  pinyinToZhuyin,
  syllableToPinyin,
  zhuyinToPinyin,
} from './reading'

describe('normalizeZhuyin', () => {
  it('全角スペースや連続する空白を半角スペース1つにする', () => {
    expect(normalizeZhuyin('ㄐㄧㄝˊ　　ㄩㄣˋ ')).toBe('ㄐㄧㄝˊ ㄩㄣˋ')
  })
  it('軽声の記号を音節の先頭に置き、第一声の記号は書かない', () => {
    expect(normalizeZhuyin('ㄒㄧㄝˋ ㄒㄧㄝ˙')).toBe('ㄒㄧㄝˋ ˙ㄒㄧㄝ')
    expect(normalizeZhuyin('ㄅㄚˉ')).toBe('ㄅㄚ')
  })
})

// 注音と拼音の対応（どちらの向きにも使う）
const PAIRS: [string, string][] = [
  ['ㄐㄧㄝˊ', 'jié'],
  ['ㄩㄣˋ', 'yùn'],
  ['ㄓ', 'zhī'],
  ['ㄘˋ', 'cì'],
  ['ㄖˋ', 'rì'],
  ['ㄐㄩ', 'jū'],
  ['ㄒㄩㄝˊ', 'xué'],
  ['ㄌㄩˋ', 'lǜ'],
  ['ㄋㄩㄝˋ', 'nüè'],
  ['ㄑㄩㄥˊ', 'qióng'],
  ['ㄧㄡˇ', 'yǒu'],
  ['ㄌㄧㄡˊ', 'liú'],
  ['ㄉㄨㄟˋ', 'duì'],
  ['ㄏㄨㄣ', 'hūn'],
  ['ㄨ', 'wū'],
  ['ㄨㄥ', 'wēng'],
  ['ㄉㄨㄥ', 'dōng'],
  ['ㄩㄥˇ', 'yǒng'],
  ['ㄦˊ', 'ér'],
  ['˙ㄇㄜ', 'me'],
  ['ㄉㄧㄢˇㄦ', 'diǎnr'],
  ['ㄍㄡˇ', 'gǒu'],
  ['ㄓㄨㄤ', 'zhuāng'],
]

describe('syllableToPinyin', () => {
  for (const [z, p] of PAIRS) it(`${z} → ${p}`, () => expect(syllableToPinyin(z)).toBe(p))
  it('組み合わせのない音節は null', () => {
    expect(syllableToPinyin('ㄅ')).toBeNull()
    expect(syllableToPinyin('ㄅㄩ')).toBeNull()
    expect(syllableToPinyin('abc')).toBeNull()
  })
})

describe('zhuyinToPinyin', () => {
  it('音節を半角スペースで区切る', () => {
    expect(zhuyinToPinyin('ㄐㄧㄝˊ ㄩㄣˋ')).toBe('jié yùn')
    expect(zhuyinToPinyin('ㄒㄧㄝˋ ˙ㄒㄧㄝ')).toBe('xiè xie')
  })
  it('変換できない音節があれば null', () => {
    expect(zhuyinToPinyin('ㄐㄧㄝˊ ，')).toBeNull()
    expect(zhuyinToPinyin('')).toBeNull()
  })
})

describe('pinyinToZhuyin', () => {
  for (const [z, p] of PAIRS) {
    // 軽声だけの音節は、声調が1つもない入力として扱うため除く
    if (z.startsWith('˙')) continue
    it(`${p} → ${z}`, () => expect(pinyinToZhuyin(p)).toBe(z))
  }
  it('空白区切りの複数の音節', () => {
    expect(pinyinToZhuyin('jié yùn')).toBe('ㄐㄧㄝˊ ㄩㄣˋ')
    expect(pinyinToZhuyin('xiè xie')).toBe('ㄒㄧㄝˋ ˙ㄒㄧㄝ')
  })
  it('区切りのない拼音を音節に分ける', () => {
    expect(pinyinToZhuyin('jiéyùn')).toBe('ㄐㄧㄝˊ ㄩㄣˋ')
    expect(pinyinToZhuyin('xièxie')).toBe('ㄒㄧㄝˋ ˙ㄒㄧㄝ')
    expect(pinyinToZhuyin('nǚér')).toBe('ㄋㄩˇ ㄦˊ')
    expect(pinyinToZhuyin('Xīān')).toBe('ㄒㄧ ㄢ')
    expect(pinyinToZhuyin('yìdiǎnr')).toBe('ㄧˋ ㄉㄧㄢˇㄦ')
  })
  it('アポストロフィ・大文字を受け付ける', () => {
    expect(pinyinToZhuyin("Xī'ān")).toBe('ㄒㄧ ㄢ')
    expect(pinyinToZhuyin('Táiwān')).toBe('ㄊㄞˊ ㄨㄢ')
  })
  it('数字の声調・v・u: を受け付ける', () => {
    expect(pinyinToZhuyin('jie2 yun4')).toBe('ㄐㄧㄝˊ ㄩㄣˋ')
    expect(pinyinToZhuyin('jie2yun4')).toBe('ㄐㄧㄝˊ ㄩㄣˋ')
    expect(pinyinToZhuyin('xie4xie5')).toBe('ㄒㄧㄝˋ ˙ㄒㄧㄝ')
    expect(pinyinToZhuyin('lv4')).toBe('ㄌㄩˋ')
    expect(pinyinToZhuyin('nu:3')).toBe('ㄋㄩˇ')
  })
  it('声調が1つもない入力は変換しない（すべて軽声と誤らないため）', () => {
    expect(pinyinToZhuyin('jie yun')).toBeNull()
  })
  it('拼音として読めない入力は null', () => {
    expect(pinyinToZhuyin('')).toBeNull()
    expect(pinyinToZhuyin('hello')).toBeNull()
    expect(pinyinToZhuyin('jié，yùn')).toBeNull()
    expect(pinyinToZhuyin('ㄐㄧㄝˊ')).toBeNull()
    expect(pinyinToZhuyin('jie7')).toBeNull()
  })
  it('注音 → 拼音 → 注音で元に戻る', () => {
    const zhuyin = 'ㄊㄞˊ ㄨㄢ ㄉㄚˋ ㄒㄩㄝˊ ㄏㄣˇ ㄏㄠˇ ˙ㄉㄜ ㄌㄩˇ ㄍㄨㄢˇ'
    expect(pinyinToZhuyin(zhuyinToPinyin(zhuyin)!)).toBe(zhuyin)
  })
})

describe('normalizePinyin', () => {
  it('数字の声調を声調記号に直し、音節を空白で区切る', () => {
    expect(normalizePinyin('jie2 yun4')).toBe('jié yùn')
    expect(normalizePinyin('jie2yun4')).toBe('jié yùn')
    expect(normalizePinyin('xie4 xie5')).toBe('xiè xie')
    expect(normalizePinyin('xie4 xie0')).toBe('xiè xie')
    expect(normalizePinyin('lv4')).toBe('lǜ')
    expect(normalizePinyin('Tai2wan1')).toBe('Tái wān')
    expect(normalizePinyin('hao3 ')).toBe('hǎo')
  })
  it('数字を含まなければ、前後の空白を除くだけ', () => {
    expect(normalizePinyin(' jiéyùn ')).toBe('jiéyùn')
    expect(normalizePinyin('jie yun')).toBe('jie yun')
  })
  it('拼音として読めなければ、そのまま返す', () => {
    expect(normalizePinyin('abc123')).toBe('abc123')
  })
  it('hasToneNumber', () => {
    expect(hasToneNumber('jie2')).toBe(true)
    expect(hasToneNumber('jié')).toBe(false)
    expect(hasToneNumber('2')).toBe(false)
  })
})
