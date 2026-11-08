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
const REQUIRED_COLUMNS = ['hanzi', 'meaning'] as const
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

export function parseCsv(text: string): ParsedFile {
  const result = Papa.parse<string[]>(stripBom(text), { skipEmptyLines: false })
  const [header = [], ...records] = result.data
  const columns = header.map((h) => h.trim().toLowerCase())
  const missing = REQUIRED_COLUMNS.filter((c) => !columns.includes(c))
  if (missing.length > 0)
    throw new ImportFileError('missingColumns', { columns: missing.join(', ') })

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
  return { kind: 'csv', rows, progress: [] }
}
