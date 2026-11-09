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
export type CsvColumn = (typeof CSV_COLUMNS)[number]
export const REQUIRED_COLUMNS = ['hanzi', 'meaning'] as const
const TAG_SEPARATOR = ';'

/**
 * 正しくない列名から、意図していそうな列を推測するための表（仕様書 9.2）。
 * 推測した列で取り込むことはせず、列名の直し方として示すだけにする
 */
const COLUMN_ALIASES: Record<CsvColumn, readonly string[]> = {
  hanzi: [
    '繁体字',
    '繁體字',
    '漢字',
    '汉字',
    '中文',
    '単語',
    '單字',
    '單詞',
    '词语',
    '詞語',
    '單語',
    'word',
    'chinese',
    'character',
    'characters',
    'traditional',
  ],
  zhuyin: ['注音', '注音符号', '注音符號', 'ボポモフォ', 'bopomofo'],
  pinyin: ['ピンイン', '拼音', '読み', 'よみ', '読み方', 'reading'],
  meaning: [
    '意味',
    '意思',
    '訳',
    '和訳',
    '日本語',
    '解釋',
    '解释',
    '釋義',
    '释义',
    '翻譯',
    '翻译',
    '中文意思',
    'definition',
    'translation',
    'english',
    'japanese',
  ],
  example: ['例文', '例句', 'example sentence', 'sentence', 'examples'],
  example_translation: [
    '例文の訳',
    '例文訳',
    '例文の意味',
    '例文の和訳',
    '例句翻譯',
    '例句翻译',
    '例句意思',
    'example translation',
    'example-translation',
    'exampletranslation',
    'sentence translation',
  ],
  tags: [
    'タグ',
    '標籤',
    '标签',
    '分類',
    '分类',
    'カテゴリ',
    'カテゴリー',
    'tag',
    'category',
    'categories',
  ],
}

/** 列名を比べるための形にする（全角英数字を半角に、前後の空白を除き、小文字に） */
export function normalizeColumnName(name: string): string {
  return name.normalize('NFKC').trim().toLowerCase()
}

/** 正しくない列名から、意図していそうな列を返す。見当たらなければ null */
export function suggestColumn(name: string): CsvColumn | null {
  const key = normalizeColumnName(name)
  for (const column of CSV_COLUMNS) {
    if (COLUMN_ALIASES[column].includes(key)) return column
  }
  return null
}

/** 列名だけのテンプレート（FR-IO-09） */
export function buildCsvHeaderTemplate(): string {
  return BOM + CSV_COLUMNS.join(',') + '\r\n'
}

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
  const columns = header.map(normalizeColumnName)
  const known: readonly string[] = CSV_COLUMNS
  // 日本語・中国語などの列名で、意図していそうな列がわかるもの（例：「繁体字 → hanzi」）
  const hints = header.flatMap((h, i) => {
    if (known.includes(columns[i])) return []
    const to = suggestColumn(h)
    return to && !columns.includes(to) ? [`${h.trim()} → ${to}`] : []
  })
  const missing = REQUIRED_COLUMNS.filter((c) => !columns.includes(c))
  if (missing.length > 0) {
    const found = header
      .map((h) => h.trim())
      .filter((h) => h !== '')
      .join(', ')
    const params = {
      columns: missing.join(', '),
      found: found.length > 100 ? `${found.slice(0, 100)}…` : found || '—',
    }
    if (hints.length > 0) {
      throw new ImportFileError('wrongColumnNames', { ...params, hints: hints.join(', ') })
    }
    throw new ImportFileError('missingColumns', params)
  }
  // 取り込まない列（未知の列名、2つ目以降の同じ列名）。プレビューで知らせる
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
  return { kind: 'csv', rows, progress: [], ignoredColumns, columnHints: hints }
}
