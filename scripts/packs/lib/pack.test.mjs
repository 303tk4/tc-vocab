// 単語パッケージの組み立てと出力の整形のテスト（仕様書 16.5）
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatPackJson, renderReadingReport, upsertIndex } from './output.mjs'
import { buildWords, NEEDS_CHECK_TAG, packFile, parseMeanings, tbclTag } from './pack.mjs'

describe('tbclTag', () => {
  it('級をタグにする', () => {
    assert.equal(tbclTag('第1級'), 'TBCL:1級')
    assert.equal(tbclTag('第7級'), 'TBCL:7級')
  })
  it('「*」の級は同じ番号の級にまとめる', () => {
    assert.equal(tbclTag('第1*級'), 'TBCL:1級')
    assert.equal(tbclTag('第2*級'), 'TBCL:2級')
  })
})

describe('parseMeanings', () => {
  it('コメントと空行を飛ばして読む', () => {
    const m = parseMeanings('# コメント\n\n1\t愛\t愛する\r\n4\t爸\t父さん\n')
    assert.equal(m.get('1:愛'), '愛する')
    assert.equal(m.get('4:爸'), '父さん')
  })
  it('重複・列不足・空の意味はエラー', () => {
    assert.throws(() => parseMeanings('1\t愛\ta\n1\t愛\tb'), /重複/)
    assert.throws(() => parseMeanings('1\t愛'), /列が足りません/)
    assert.throws(() => parseMeanings('1\t愛\t '), /意味が空/)
  })
})

describe('buildWords', () => {
  const decide = (hanzi, hints) =>
    hanzi === '市場'
      ? { zhuyin: 'ㄕˋ ㄔㄤˊ', sure: false, reason: 'differ', hint: hints[0] }
      : { zhuyin: hints[0], sure: true, reason: 'match', hint: hints[0] }
  const tagsFor = (e) => ['TOCFL', tbclTag(e.level)]

  it('読み・拼音・意味・タグを付ける', () => {
    const { words, missing, readingNotes } = buildWords(
      [
        { id: '1', hanzi: '愛', level: '第1級', readings: ['ㄞˋ'] },
        { id: '527', hanzi: '市場', level: '第2級', readings: ['ㄕˋ ㄔㄤˇ'] },
      ],
      { decide, meanings: new Map([['1:愛', '愛する']]), tagsFor },
    )
    assert.deepEqual(words[0], {
      hanzi: '愛',
      zhuyin: 'ㄞˋ',
      pinyin: 'ài',
      meaning: '愛する',
      examples: [],
      tags: ['TOCFL', 'TBCL:1級'],
    })
    assert.deepEqual(words[1].tags, ['TOCFL', 'TBCL:2級', NEEDS_CHECK_TAG])
    assert.equal(words[1].pinyin, 'shì cháng')
    assert.deepEqual(
      missing.map((m) => m.key),
      ['527:市場'],
    )
    assert.deepEqual(
      readingNotes.map((n) => n.hanzi),
      ['市場'],
    )
  })
  it('同じ繁体字・同じ拼音の語は最初だけを残す（仕様書 6.1）', () => {
    const { words } = buildWords(
      [
        { id: '10', hanzi: '車', level: '第1級', readings: ['ㄔㄜ'] },
        { id: '99', hanzi: '車', level: '第2級', readings: ['ㄔㄜ'] },
        { id: '100', hanzi: '車', level: '第2級', readings: ['ㄐㄩ'] },
      ],
      { decide, meanings: new Map(), tagsFor },
    )
    assert.deepEqual(
      words.map((w) => [w.pinyin, w.tags[1]]),
      [
        ['chē', 'TBCL:1級'],
        ['jū', 'TBCL:2級'],
      ],
    )
  })
})

describe('formatPackJson', () => {
  it('1行に1語の JSON にし、読み戻すと同じ内容になる', () => {
    const pack = packFile(
      [
        { hanzi: '愛', meaning: 'a', tags: [] },
        { hanzi: '八', meaning: 'b', tags: [] },
      ],
      '2026-11-09T00:00:00.000Z',
    )
    const text = formatPackJson(pack)
    assert.deepEqual(JSON.parse(text), pack)
    assert.match(text, /\n {4}\{"hanzi":"愛",.*\},\n {4}\{"hanzi":"八"/)
    assert.ok(text.endsWith('}\n'))
  })
})

describe('upsertIndex', () => {
  it('同じ ID は置き換え、新しい ID は末尾に加える', () => {
    const a = upsertIndex(null, { id: 'a', v: 1 })
    const b = upsertIndex(a, { id: 'b', v: 1 })
    const c = upsertIndex(b, { id: 'a', v: 2 })
    assert.equal(c.format, 'tc-vocab-packs')
    assert.deepEqual(c.packs, [
      { id: 'a', v: 2 },
      { id: 'b', v: 1 },
    ])
  })
})

describe('renderReadingReport', () => {
  it('理由ごとに表にする', () => {
    const md = renderReadingReport('tocfl-1', [
      {
        hanzi: '市場',
        level: '第2級',
        zhuyin: 'ㄕˋ ㄔㄤˊ',
        hint: 'ㄕˋ ㄔㄤˇ',
        sure: false,
        reason: 'differ',
      },
    ])
    assert.match(md, /辞書と詞語表で読みが異なる.*（1 語）/)
    assert.match(md, /\| 市場 \| 第2級 \| ㄕˋ ㄔㄤˊ \| ㄕˋ ㄔㄤˇ \|/)
  })
})
