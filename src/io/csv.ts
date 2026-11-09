// CSV 形式（仕様書 9.2）
import Papa from 'papaparse'
import type { Word } from '../types/word'
import { BOM, ImportFileError, stripBom, type ParsedFile, type ParsedRow } from './parsed'
import { normalizeWord } from './validate'

export const CSV_COLUMNS = [
  'hanzi',
  'zhuyin',
  'pinyin',
  'meaning',
  'example',
  'example_translation',
  'tags',
] as const
export const REQUIRED_COLUMNS = ['hanzi', 'meaning'] as const
const TAG_SEPARATOR = ';'

/** CSV では例文を1件しか出力できないため、例文の一部が失われる単語の数 */
export function countExampleLoss(words: readonly Word[]): number {
  return words.filter((w) => w.examples.length > 1).length
}

/** Excel で文字化けしないよう BOM を付け、改行は CRLF（RFC 4180） */
export function buildCsv(words: readonly Word[]): string {
  const data = words.map((w) => [
    w.hanzi,
    w.zhuyin,
    w.pinyin,
    w.meaning,
    w.examples[0]?.text ?? '',
    w.examples[0]?.translation ?? '',
    w.tags.join(TAG_SEPARATOR),
  ])
  return BOM + Papa.unparse({ fields: [...CSV_COLUMNS], data }, { newline: '\r\n' }) + '\r\n'
}

/** テンプレート（列の見本）。FR-IO-09 の案内からダウンロードする */
export function buildCsvTemplate(): string {
  const sample = (w: Pick<Word, 'hanzi' | 'zhuyin' | 'pinyin' | 'meaning' | 'examples' | 'tags'>) =>
    ({ ...w, id: '', createdAt: 0, updatedAt: 0 }) satisfies Word
  return buildCsv([
    sample({
      hanzi: '捷運',
      zhuyin: 'ㄐㄧㄝˊ ㄩㄣˋ',
      pinyin: 'jié yùn',
      meaning: 'MRT（都市鉄道）',
      examples: [{ text: '我每天坐捷運去公司。', translation: '毎日MRTで会社に行きます。' }],
      tags: ['交通', '基本'],
    }),
    sample({ hanzi: '好吃', zhuyin: '', pinyin: '', meaning: 'おいしい', examples: [], tags: [] }),
  ])
}

/**
 * 区切り文字を1行目（列名の行）から決める（仕様書 9.2）。
 * カンマを基本とし、カンマが無ければタブ、次にセミコロンとみなす
 */
export function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r\n|\n|\r/, 1)[0]
  if (firstLine.includes(',')) return ','
  if (firstLine.includes('\t')) return '\t'
  if (firstLine.includes(';')) return ';'
  return ','
}

export function parseCsv(text: string): ParsedFile {
  const body = stripBom(text)
  const result = Papa.parse<string[]>(body, {
    skipEmptyLines: false,
    delimiter: detectDelimiter(body),
  })
  const [header = [], ...records] = result.data
  const columns = header.map((h) => h.trim().toLowerCase())
  const missing = REQUIRED_COLUMNS.filter((c) => !columns.includes(c))
  if (missing.length > 0) {
    const found = columns.filter((c) => c !== '').join(', ')
    throw new ImportFileError('missingColumns', {
      columns: missing.join(', '),
      found: found.length > 100 ? `${found.slice(0, 100)}…` : found || '—',
    })
  }
  // 取り込まない列（未知の列名、2つ目以降の同じ列名）。プレビューで知らせる
  const known: readonly string[] = CSV_COLUMNS
  const ignoredColumns = header
    .map((h, i) => ({ name: h.trim(), key: columns[i], i }))
    .filter(({ key, i }) => key !== '' && (!known.includes(key) || columns.indexOf(key) !== i))
    .map(({ name }) => name)

  const index = Object.fromEntries(CSV_COLUMNS.map((c) => [c, columns.indexOf(c)]))
  // 引用符の閉じ忘れなど、構文エラーのあった行（data の添字）
  const syntaxErrorRows = new Set(
    result.errors.map((e) => e.row).filter((r): r is number => typeof r === 'number'),
  )

  const rows: ParsedRow[] = []
  records.forEach((cells, i) => {
    const dataIndex = i + 1
    const position = i + 2 // ヘッダーが1行目
    if (cells.every((c) => c.trim() === '')) return
    if (syntaxErrorRows.has(dataIndex)) {
      rows.push({ position, errors: [{ code: 'csvSyntax', field: 'word' }] })
      return
    }
    const cell = (name: (typeof CSV_COLUMNS)[number]) =>
      index[name] >= 0 ? (cells[index[name]] ?? '') : ''
    const example = cell('example').trim()
    const translation = cell('example_translation').trim()
    const raw = {
      hanzi: cell('hanzi'),
      zhuyin: cell('zhuyin'),
      pinyin: cell('pinyin'),
      meaning: cell('meaning'),
      examples: example || translation ? [{ text: example, translation }] : [],
      tags: cell('tags').split(TAG_SEPARATOR),
    }
    const normalized = normalizeWord(raw)
    rows.push(
      normalized.ok
        ? { position, word: normalized.word, errors: [] }
        : { position, errors: normalized.errors },
    )
  })
  return { kind: 'csv', rows, progress: [], ignoredColumns }
}
