// xlsx の読み取りのテスト
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { deflateRawSync } from 'node:zlib'
import {
  columnIndex,
  decodeXml,
  parseSheet,
  parseSharedStrings,
  readFirstSheet,
  readZip,
} from './xlsx.mjs'

/** テスト用に zip を組み立てる（deflate と無圧縮を交互に使う） */
function makeZip(files) {
  const locals = []
  const centrals = []
  let offset = 0
  Object.entries(files).forEach(([name, text], i) => {
    const raw = Buffer.from(text, 'utf8')
    const method = i % 2 === 0 ? 8 : 0
    const data = method === 8 ? deflateRawSync(raw) : raw
    const nameBuf = Buffer.from(name, 'utf8')
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(method, 8)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(raw.length, 22)
    local.writeUInt16LE(nameBuf.length, 26)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(method, 10)
    central.writeUInt32LE(data.length, 20)
    central.writeUInt32LE(raw.length, 24)
    central.writeUInt16LE(nameBuf.length, 28)
    central.writeUInt32LE(offset, 42)
    locals.push(local, nameBuf, data)
    centrals.push(central, nameBuf)
    offset += 30 + nameBuf.length + data.length
  })
  const cd = Buffer.concat(centrals)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(Object.keys(files).length, 8)
  eocd.writeUInt16LE(Object.keys(files).length, 10)
  eocd.writeUInt32LE(cd.length, 12)
  eocd.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, cd, eocd])
}

describe('readZip', () => {
  it('deflate と無圧縮のファイルを読める', () => {
    const files = readZip(makeZip({ 'a.txt': '捷運', 'b.txt': 'hello' }))
    assert.equal(files.get('a.txt').toString('utf8'), '捷運')
    assert.equal(files.get('b.txt').toString('utf8'), 'hello')
  })
  it('zip でなければエラー', () => {
    assert.throws(() => readZip(Buffer.from('not a zip file at all, really')), /zip の形式/)
  })
})

describe('xlsx の XML', () => {
  it('文字参照を戻す', () => {
    assert.equal(decodeXml('a&amp;b&lt;&#x4E00;&#19968;'), 'a&b<一一')
  })
  it('列の記号を番号にする', () => {
    assert.equal(columnIndex('A1'), 0)
    assert.equal(columnIndex('Z9'), 25)
    assert.equal(columnIndex('AB12'), 27)
  })
  it('共有文字列を読み、ふりがな（rPh）は除く', () => {
    const xml =
      '<sst><si><t>愛</t></si><si><r><t>爸</t></r><r><t xml:space="preserve">爸 </t></r></si><si><t>台</t><rPh><t>x</t></rPh></si></sst>'
    assert.deepEqual(parseSharedStrings(xml), ['愛', '爸爸 ', '台'])
  })
  it('空のセルを詰めずに行を読む', () => {
    const xml =
      '<sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1"><v>12</v></c></row>' +
      '<row r="2"><c r="B2" t="inlineStr"><is><t>a&amp;b</t></is></c></row></sheetData>'
    assert.deepEqual(parseSheet(xml, ['見出し']), [
      ['見出し', '', '12'],
      ['', 'a&b'],
    ])
  })
  it('xlsx の1つ目のシートを読む', () => {
    const buf = makeZip({
      'xl/sharedStrings.xml': '<sst><si><t>word</t></si><si><t>捷運</t></si></sst>',
      'xl/worksheets/sheet1.xml':
        '<sheetData><row r="1"><c r="A1" t="s"><v>0</v></c></row><row r="2"><c r="A2" t="s"><v>1</v></c></row></sheetData>',
    })
    assert.deepEqual(readFirstSheet(buf), [['word'], ['捷運']])
  })
})
