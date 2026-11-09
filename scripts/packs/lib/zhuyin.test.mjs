// 注音の正規化と拼音への変換のテスト（仕様書 16.4）
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { normalizeZhuyin, syllableToPinyin, zhuyinToPinyin } from './zhuyin.mjs'

describe('normalizeZhuyin', () => {
  it('全角スペースや連続する空白を半角スペース1つにする', () => {
    assert.equal(normalizeZhuyin('ㄐㄧㄝˊ　　ㄩㄣˋ '), 'ㄐㄧㄝˊ ㄩㄣˋ')
  })
  it('軽声の記号を音節の先頭に置く', () => {
    assert.equal(normalizeZhuyin('ㄉㄜ˙'), '˙ㄉㄜ')
    assert.equal(normalizeZhuyin('ㄒㄧㄝˋ ˙ㄒㄧㄝ'), 'ㄒㄧㄝˋ ˙ㄒㄧㄝ')
  })
  it('第一声の記号は書かない', () => {
    assert.equal(normalizeZhuyin('ㄅㄚˉ'), 'ㄅㄚ')
  })
})

describe('syllableToPinyin', () => {
  const cases = [
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
    ['ㄝ', 'ê̄'],
    ['˙ㄇㄜ', 'me'],
    ['ㄉㄧㄢˇㄦ', 'diǎnr'],
    ['ㄍㄡˇ', 'gǒu'],
  ]
  for (const [z, p] of cases) {
    it(`${z} → ${p}`, () => assert.equal(syllableToPinyin(z), p))
  }
  it('組み合わせのない音節は null', () => {
    assert.equal(syllableToPinyin('ㄅ'), null)
    assert.equal(syllableToPinyin('ㄅㄩ'), null)
    assert.equal(syllableToPinyin('abc'), null)
  })
})

describe('zhuyinToPinyin', () => {
  it('音節を半角スペースで区切る', () => {
    assert.equal(zhuyinToPinyin('ㄐㄧㄝˊ ㄩㄣˋ'), 'jié yùn')
    assert.equal(zhuyinToPinyin('ㄒㄧㄝˋ ˙ㄒㄧㄝ'), 'xiè xie')
  })
  it('変換できない音節があれば null', () => {
    assert.equal(zhuyinToPinyin('ㄐㄧㄝˊ ，'), null)
    assert.equal(zhuyinToPinyin(''), null)
  })
})
