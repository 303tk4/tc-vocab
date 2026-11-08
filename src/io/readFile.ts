// 取り込むファイルの読み込み（FR-IO-01・FR-IO-07）
import { parseCsv } from './csv'
import { parseJson } from './json'
import { ImportFileError, type ParsedFile } from './parsed'

export const MAX_FILE_SIZE = 20 * 1024 * 1024

/** 形式は拡張子で判定する */
export function fileKind(name: string): 'json' | 'csv' | null {
  const lower = name.toLowerCase()
  if (lower.endsWith('.json')) return 'json'
  if (lower.endsWith('.csv')) return 'csv'
  return null
}

/** ファイルを読み込んで解析する。読めない場合は ImportFileError を投げる */
export async function readImportFile(file: File): Promise<ParsedFile> {
  const kind = fileKind(file.name)
  if (!kind) throw new ImportFileError('unsupportedType')
  if (file.size > MAX_FILE_SIZE) throw new ImportFileError('tooLarge')
  let text: string
  try {
    text = await file.text()
  } catch {
    throw new ImportFileError('readFailed')
  }
  return kind === 'json' ? parseJson(text) : parseCsv(text)
}
