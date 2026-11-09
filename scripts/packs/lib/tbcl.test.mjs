// TBCL 詞語表の読み取りのテスト（仕様書 16.5）
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { normalizeTbclZhuyin, parseTbclRows, splitHeadword, splitReadings } from './tbcl.mjs'

const HEADER = [
  'id',
  'word',
  'deng',
  'ji',
  'situation',
  'wfreq',
  'sfreq',
  'newlink',
  'bopomofo',
  'pinyin',
]
const row = (id, word, ji, bopomofo) => [id, word, '基礎', ji, '核心詞', '', '', '', bopomofo, '']

describe('splitHeadword', () => {
  it('「/」で分け、末尾の数字を除く', () => {
    assert.deepEqual(splitHeadword('爸爸/爸'), ['爸爸', '爸'])
    assert.deepEqual(splitHeadword('和1'), ['和'])
    assert.deepEqual(splitHeadword('聲音/聲1'), ['聲音', '聲'])
  })
})

describe('normalizeTbclZhuyin', () => {
  it('注音の代わりの漢字「一」を「ㄧ」に直す', () => {
    assert.equal(normalizeTbclZhuyin('一ㄡˇ ㄕˊ'), 'ㄧㄡˇ ㄕˊ')
  })
  it('独立した「ㄦ」を前の音節に付ける', () => {
    assert.equal(normalizeTbclZhuyin('ㄋㄚˇ ㄦ'), 'ㄋㄚˇㄦ')
  })
  it('後ろに付いた軽声の記号を前に移す', () => {
    assert.equal(normalizeTbclZhuyin('ㄉㄜ˙'), '˙ㄉㄜ')
  })
})

describe('splitReadings', () => {
  it('「/」で分ける', () => {
    assert.deepEqual(splitReadings('ㄅㄚˋ ˙ㄅㄚ / ㄅㄚˋ'), ['ㄅㄚˋ ˙ㄅㄚ', 'ㄅㄚˋ'])
  })
})

describe('parseTbclRows', () => {
  it('見出しと読みを同じ順で対応させる', () => {
    const out = parseTbclRows([HEADER, row('4', '爸爸/爸', '第1級', 'ㄅㄚˋ ˙ㄅㄚ / ㄅㄚˋ')])
    assert.deepEqual(
      out.map((e) => [e.id, e.hanzi, e.level, e.readings]),
      [
        ['4', '爸爸', '第1級', ['ㄅㄚˋ ˙ㄅㄚ']],
        ['4', '爸', '第1級', ['ㄅㄚˋ']],
      ],
    )
  })
  it('見出しが1つで読みが複数なら、すべてを候補にする', () => {
    const [e] = parseTbclRows([HEADER, row('39', '和1', '第1級', 'ㄏㄢˋ / ㄏㄜˊ')])
    assert.deepEqual(e.readings, ['ㄏㄢˋ', 'ㄏㄜˊ'])
  })
  it('見出しと読みの数が合わなければ、音節の数が合う読みだけを候補にする', () => {
    const out = parseTbclRows([
      HEADER,
      row('82', '那裡/那裏/那兒', '第1級', 'ㄋㄚˋ ㄌㄧˇ / ㄋㄚˋ ㄦ'),
    ])
    // 「那兒」は2字なので、2音節の読みと儿化の1音節の読みの両方が候補になる（辞書との照合で決まる）
    assert.deepEqual(
      out.map((e) => e.readings),
      [['ㄋㄚˋ ㄌㄧˇ'], ['ㄋㄚˋ ㄌㄧˇ'], ['ㄋㄚˋ ㄌㄧˇ', 'ㄋㄚˋㄦ']],
    )
  })
  it('必要な列がなければエラー', () => {
    assert.throws(
      () =>
        parseTbclRows([
          ['id', 'word'],
          ['1', '愛'],
        ]),
      /列「deng」/,
    )
  })
})
