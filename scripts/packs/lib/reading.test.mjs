// 繁体字から注音を決める処理のテスト（仕様書 16.4 段階2）
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  alignChars,
  buildReadingIndex,
  decideReading,
  looselyEqual,
  lookup,
  segment,
} from './reading.mjs'

const HEADER = [
  '字詞名',
  '辭條別名',
  '字數',
  '字詞號',
  '部首字',
  '總筆畫數',
  '部首外筆畫數',
  '多音排序',
  '注音一式',
  '變體類型 1:變 2:又音 3:語音 4:讀音 5:或讀',
  '變體注音',
]
const row = (name, zhuyin, varType = '', varZhuyin = '') => [
  name,
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  zhuyin,
  varType,
  varZhuyin,
]

const index = buildReadingIndex([
  HEADER,
  row('行', 'ㄒㄧㄥˊ'),
  row('行', 'ㄏㄤˊ'),
  row('銀行', 'ㄧㄣˊ ㄏㄤˊ'),
  row('什麼', 'ㄕㄣˊ ˙ㄇㄜ', '又音 ', 'ㄕㄜˊ ˙ㄇㄜ'),
  row('一點兒', 'ㄧ ㄉㄧㄢˇㄦ ', '變 ', 'ㄧˋ ㄉㄧㄚˇㄦ'),
  row('一起', 'ㄧ ㄑㄧˇ'),
  row('晚上', 'ㄨㄢˇ ˙ㄕㄤ'),
  row('臺灣', 'ㄊㄞˊ ㄨㄢ'),
  row('臺', 'ㄊㄞˊ'),
  row('台', 'ㄊㄞ'),
  row('台', 'ㄧˊ'),
  row('哪', 'ㄋㄚˇ'),
  row('兒', 'ㄦˊ'),
  row('市場', 'ㄕˋ ㄔㄤˊ'),
  row('語', 'ㄩˇ'),
  row('語', 'ㄩˋ'),
  row('人', 'ㄖㄣˊ'),
  row('這裡', 'ㄓㄜˋ ㄌㄧˇ'),
  row('唇', 'ㄓㄣ'),
  row('脣', 'ㄔㄨㄣˊ'),
])

describe('buildReadingIndex', () => {
  it('多音字の読みを集める', () => {
    assert.deepEqual(index.get('行').main, ['ㄒㄧㄥˊ', 'ㄏㄤˊ'])
  })
  it('又音は候補に入れ、變（変読）は入れない', () => {
    assert.deepEqual(index.get('什麼').variant, ['ㄕㄜˊ ˙ㄇㄜ'])
    assert.deepEqual(index.get('一點兒'), { main: ['ㄧ ㄉㄧㄢˇㄦ'], variant: [] })
  })
})

describe('lookup と segment', () => {
  it('字体を置き換えた見出しの読みも候補にする', () => {
    assert.deepEqual(lookup('台', index).main, ['ㄊㄞ', 'ㄧˊ', 'ㄊㄞˊ'])
    assert.deepEqual(lookup('台灣', index).main, ['ㄊㄞˊ ㄨㄢ'])
    // くちびるの「唇」は、辞書では「脣」の見出しにある
    assert.deepEqual(lookup('唇', index).main, ['ㄓㄣ', 'ㄔㄨㄣˊ'])
  })
  it('最長一致で区切る', () => {
    assert.deepEqual(
      segment('臺灣人', index).map((s) => s.text),
      ['臺灣', '人'],
    )
  })
  it('辞書にない字は候補なし', () => {
    assert.deepEqual(segment('X人', index)[0], { text: 'X', candidates: [] })
  })
})

describe('alignChars と looselyEqual', () => {
  it('儿化では末尾の「兒」を除いて対応させる', () => {
    assert.deepEqual(alignChars('一點兒', 2), ['一', '點'])
    assert.equal(alignChars('一點兒', 1), null)
  })
  it('「一」「不」の変調は同じとみなす', () => {
    assert.ok(looselyEqual('一起', 'ㄧ ㄑㄧˇ', 'ㄧˋ ㄑㄧˇ'))
    assert.ok(looselyEqual('一點兒', 'ㄧ ㄉㄧㄢˇㄦ', 'ㄧˋ ㄉㄧㄢˇㄦ'))
  })
  it('片方が軽声なら同じとみなす', () => {
    assert.ok(looselyEqual('晚上', 'ㄨㄢˇ ˙ㄕㄤ', 'ㄨㄢˇ ㄕㄤˋ'))
  })
  it('声調だけが異なる（軽声でない）ものは別とみなす', () => {
    assert.equal(looselyEqual('市場', 'ㄕˋ ㄔㄤˊ', 'ㄕˋ ㄔㄤˇ'), false)
  })
  it('音が違えば別とみなす', () => {
    assert.equal(looselyEqual('行', 'ㄒㄧㄥˊ', 'ㄏㄤˊ'), false)
  })
})

describe('decideReading', () => {
  it('詞語表の読みと一致する辞書の読みを選ぶ（多音字）', () => {
    assert.deepEqual(decideReading('行', ['ㄏㄤˊ'], index), {
      zhuyin: 'ㄏㄤˊ',
      sure: true,
      reason: 'match',
      hint: 'ㄏㄤˊ',
    })
  })
  it('又音でも一致すれば確定', () => {
    assert.equal(decideReading('什麼', ['ㄕㄜˊ ˙ㄇㄜ'], index).sure, true)
  })
  it('表記の流儀の違いだけなら辞書の表記で確定', () => {
    const r = decideReading('一起', ['ㄧˋ ㄑㄧˇ'], index)
    assert.equal(r.zhuyin, 'ㄧ ㄑㄧˇ')
    assert.equal(r.sure, true)
    assert.equal(r.reason, 'loose')
  })
  it('辞書にない語は区切った組み合わせから選ぶ', () => {
    const r = decideReading('台灣人', ['ㄊㄞˊ ㄨㄢ ㄖㄣˊ'], index)
    assert.equal(r.zhuyin, 'ㄊㄞˊ ㄨㄢ ㄖㄣˊ')
    assert.equal(r.sure, true)
  })
  it('辞書にない儿化の語は、元の語の読みに「ㄦ」を付けた候補を使う', () => {
    const r = decideReading('哪兒', ['ㄋㄚˇㄦ'], index)
    assert.equal(r.zhuyin, 'ㄋㄚˇㄦ')
    assert.equal(r.sure, true)
  })
  it('辞書と詞語表の読みが異なれば辞書の読みを使い、要確認', () => {
    const r = decideReading('市場', ['ㄕˋ ㄔㄤˇ'], index)
    assert.equal(r.zhuyin, 'ㄕˋ ㄔㄤˊ')
    assert.equal(r.sure, false)
    assert.equal(r.reason, 'differ')
  })
  it('詞語表の読みが欠けていれば、辞書の読みで確定', () => {
    const r = decideReading('這裡', ['ㄓㄜˋ'], index)
    assert.equal(r.zhuyin, 'ㄓㄜˋ ㄌㄧˇ')
    assert.equal(r.sure, true)
  })
  it('辞書に読みが複数あって決められなければ、先頭の読みで要確認', () => {
    const r = decideReading('語', [], index)
    assert.equal(r.zhuyin, 'ㄩˇ')
    assert.equal(r.sure, false)
    assert.equal(r.reason, 'ambiguous')
  })
  it('辞書にない字を含めば、詞語表の読みで要確認', () => {
    assert.deepEqual(decideReading('X', ['ㄒㄧ'], index), {
      zhuyin: 'ㄒㄧ',
      sure: false,
      reason: 'tbcl-only',
      hint: 'ㄒㄧ',
    })
    assert.equal(decideReading('X', [], index).reason, 'none')
  })
})
