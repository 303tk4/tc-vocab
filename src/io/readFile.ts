// 取り込むファイルの読み込み（FR-IO-01・FR-IO-07・FR-IO-08）
import { parseCsv } from './csv'
import { decodeText } from './encoding'
import { parseJson } from './json'
import { ImportFileError, type ParsedFile } from './parsed'

export const MAX_FILE_SIZE = 20 * 1024 * 1024

/** 表計算ソフトのファイル。そのままでは読めないため、CSV で保存し直すよう案内する */
const SPREADSHEET_EXTENSIONS = ['.xlsx', '.xls', '.xlsm', '.ods', '.numbers']

/** 形式は拡張子で判定する */
export function fileKind(name: string): 'json' | 'csv' | 'spreadsheet' | null {
  const lower = name.toLowerCase()
  if (lower.endsWith('.json')) return 'json'
  // .tsv と .txt は、Excel の「Unicode テキスト」などのタブ区切りを想定して CSV として読む
  if (['.csv', '.tsv', '.txt'].some((ext) => lower.endsWith(ext))) return 'csv'
  if (SPREADSHEET_EXTENSIONS.some((ext) => lower.endsWith(ext))) return 'spreadsheet'
  return null
}

/** ファイルを読み込んで解析する。読めない場合は ImportFileError を投げる */
export async function readImportFile(file: File): Promise<ParsedFile> {
  const kind = fileKind(file.name)
  if (kind === 'spreadsheet') throw new ImportFileError('spreadsheet')
  if (!kind) throw new ImportFileError('unsupportedType')
  if (file.size > MAX_FILE_SIZE) throw new ImportFileError('tooLarge')
  let bytes: Uint8Array
  try {
    bytes = new Uint8Array(await file.arrayBuffer())
  } catch {
    throw new ImportFileError('readFailed')
  }
  const text = decodeText(bytes)
  return kind === 'json' ? parseJson(text) : parseCsv(text)
}
