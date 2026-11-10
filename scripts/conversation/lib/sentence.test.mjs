// 会話の文の読みのテスト（仕様書 18.6）。node --test scripts/conversation/
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readSentence, splitRuns } from './sentence.mjs'

/** 小さな辞書（見出し語 → 候補） */
const index = new Map(
  Object.entries({
    謝謝: { main: ['ㄒㄧㄝˋ ˙ㄒㄧㄝ'], variant: [] },
    不用: { main: ['ㄅㄨˋ ㄩㄥˋ'], variant: [] },
    我: { main: ['ㄜˇ', 'ㄨㄛˇ'], variant: [] },
    有: { main: ['ㄧㄡˇ'], variant: [] },
    嗎: { main: ['ㄇㄚˇ', '˙ㄇㄚ'], variant: [] },
  }),
)

describe('splitRuns', () => {
  it('漢字の並びとそれ以外に分ける', () => {
    assert.deepEqual(splitRuns('有 ATM 嗎？'), [
      { han: true, text: '有' },
      { han: false, text: ' ATM ' },
      { han: true, text: '嗎' },
      { han: false, text: '？' },
    ])
  })
})

describe('readSentence', () => {
  it('音節を半角スペースで区切り、句読点は注音では全角のまま、拼音では半角にする', () => {
    const r = readSentence('不用，謝謝。', index)
    assert.equal(r.zhuyin, 'ㄅㄨˋ ㄩㄥˋ，ㄒㄧㄝˋ ˙ㄒㄧㄝ。')
    assert.equal(r.pinyin, 'bù yòng, xiè xie.')
    assert.deepEqual(r.notes, [])
  })

  it('候補が複数ある語は、指定の読みを使う。指定が無ければ要確認として記録する', () => {
    const prefer = { 我: 'ㄨㄛˇ' }
    const r = readSentence('我有嗎', index, prefer)
    assert.equal(r.zhuyin, 'ㄨㄛˇ ㄧㄡˇ ㄇㄚˇ')
    assert.deepEqual(
      r.notes.map((n) => n.text),
      ['嗎'],
    )
  })

  it('英字はそのまま残す', () => {
    const r = readSentence('有 ATM 嗎？', index, { 嗎: '˙ㄇㄚ' })
    assert.equal(r.zhuyin, 'ㄧㄡˇ ATM ˙ㄇㄚ？')
    assert.equal(r.pinyin, 'yǒu ATM ma?')
  })

  it('辞書に無い字は「?」にして記録する', () => {
    const r = readSentence('貓', index)
    assert.equal(r.zhuyin, '?')
    assert.equal(r.notes[0].reason, 'none')
  })
})
