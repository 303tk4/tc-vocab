import { describe, expect, it } from 'vitest'
import { decodeText } from './encoding'
import { ImportFileError } from './parsed'
import { fileKind, readImportFile } from './readFile'

const ascii = (s: string) => [...new TextEncoder().encode(s)]

/** 失敗の理由（ImportFileError の code）を返す */
async function failure(name: string, body: BlobPart): Promise<string> {
  try {
    await readImportFile(new File([body], name))
  } catch (e) {
    if (e instanceof ImportFileError) return e.code
    throw e
  }
  return 'ok'
}

function utf16le(text: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(2 + text.length * 2)
  bytes.set([0xff, 0xfe])
  for (let i = 0; i < text.length; i++) {
    bytes[2 + i * 2] = text.charCodeAt(i) & 0xff
    bytes[3 + i * 2] = text.charCodeAt(i) >> 8
  }
  return bytes
}

describe('fileKind（FR-IO-01）', () => {
  it('拡張子で形式を判定し、表計算ソフトのファイルは区別する', () => {
    expect(fileKind('a.JSON')).toBe('json')
    expect(fileKind('b.csv')).toBe('csv')
    expect(fileKind('c.xlsx')).toBe('spreadsheet')
    expect(fileKind('d.numbers')).toBe('spreadsheet')
    expect(fileKind('e.txt')).toBe('csv')
    expect(fileKind('f.tsv')).toBe('csv')
    expect(fileKind('g.pdf')).toBeNull()
  })
})

describe('decodeText（FR-IO-08）', () => {
  it('UTF-8 は BOM の有無を問わず読み、BOM は取り除く', () => {
    expect(decodeText(new Uint8Array([0xef, 0xbb, 0xbf, ...ascii('hanzi')]))).toBe('hanzi')
    expect(decodeText(new TextEncoder().encode('捷運'))).toBe('捷運')
  })

  it('BOM 付きの UTF-16 を読む', () => {
    expect(decodeText(utf16le('水,water'))).toBe('水,water')
  })
})

describe('readImportFile：想定外のファイル（FR-IO-08）', () => {
  it('Shift_JIS や Big5 の CSV は文字化けしたまま取り込まずにエラーにする', async () => {
    // 「水」の Shift_JIS（0x90 0x85）と Big5（0xA4 0xF4）
    const sjis = new Uint8Array([...ascii('hanzi,meaning\n'), 0x90, 0x85, 0x2c, 0x90, 0x85])
    const big5 = new Uint8Array([...ascii('hanzi,meaning\n'), 0xa4, 0xf4, ...ascii(',water')])
    expect(await failure('sjis.csv', sjis)).toBe('invalidEncoding')
    expect(await failure('big5.csv', big5)).toBe('invalidEncoding')
  })

  it('Excel のファイルは、拡張子を .csv に変えてあっても見分ける', async () => {
    const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0, 0, 0])
    expect(await failure('words.xlsx', zip)).toBe('spreadsheet')
    expect(await failure('renamed.csv', zip)).toBe('spreadsheet')
  })

  it('空のファイル、テキストでないファイル、対応しない拡張子はエラーにする', async () => {
    expect(await failure('empty.csv', '')).toBe('empty')
    expect(await failure('blank.csv', '  \n\n')).toBe('empty')
    expect(await failure('binary.csv', new Uint8Array([0x68, 0x00, 0x69]))).toBe('notText')
    expect(await failure('notes.pdf', 'hanzi,meaning')).toBe('unsupportedType')
  })

  it('日本語や中国語の列名は、列名の誤りとして直し方を示す', async () => {
    try {
      await readImportFile(new File(['繁体字,意味,標籤\n水,みず,a\n'], 'ja.csv'))
      expect.unreachable()
    } catch (e) {
      expect(e).toBeInstanceOf(ImportFileError)
      expect((e as ImportFileError).code).toBe('wrongColumnNames')
      expect((e as ImportFileError).params).toEqual({
        columns: 'hanzi, meaning',
        found: '繁体字, 意味, 標籤',
        hints: '繁体字 → hanzi, 意味 → meaning, 標籤 → tags',
      })
    }
  })

  it('列名の推測ができないときは、必須の列が無いことを示す', async () => {
    try {
      await readImportFile(new File(['foo,bar\n1,2\n'], 'x.csv'))
      expect.unreachable()
    } catch (e) {
      expect((e as ImportFileError).code).toBe('missingColumns')
    }
  })

  it('Unicode テキスト（UTF-16・.txt）をそのまま選べる', async () => {
    const parsed = await readImportFile(new File([utf16le('hanzi\tmeaning\n水\twater\n')], 'u.txt'))
    expect(parsed.rows.map((r) => r.word?.meaning)).toEqual(['water'])
  })

  it('UTF-16 のタブ区切り（Excel の「Unicode テキスト」）も読める', async () => {
    const parsed = await readImportFile(new File([utf16le('hanzi\tmeaning\n水\twater\n')], 'u.csv'))
    expect(parsed.rows.map((r) => r.word?.meaning)).toEqual(['water'])
  })

  it('JSON の拡張子で中身が CSV なら JSON のエラーにする', async () => {
    expect(await failure('data.json', 'hanzi,meaning\n水,water\n')).toBe('invalidJson')
  })
})
