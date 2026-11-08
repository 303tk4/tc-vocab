import type { Progress } from '../types/word'
import type { ValidationError, WordDraft } from './validate'

/** UTF-8 の BOM（U+FEFF） */
export const BOM = String.fromCharCode(0xfeff)

export function stripBom(text: string): string {
  return text.startsWith(BOM) ? text.slice(1) : text
}

/** ファイル全体を読み込めない場合の理由 */
export type FatalCode =
  | 'invalidJson'
  | 'invalidFormat'
  | 'unsupportedVersion'
  | 'missingColumns'
  | 'tooLarge'
  | 'unsupportedType'
  | 'readFailed'

export class ImportFileError extends Error {
  readonly code: FatalCode
  readonly params: Record<string, string>

  constructor(code: FatalCode, params: Record<string, string> = {}) {
    super(code)
    this.name = 'ImportFileError'
    this.code = code
    this.params = params
  }
}

export interface ParsedRow {
  /** JSON は words 配列の番号（0始まり）、CSV は行番号（ヘッダーが1行目） */
  position: number
  word?: WordDraft
  errors: ValidationError[]
}

export interface ParsedFile {
  kind: 'json' | 'csv'
  rows: ParsedRow[]
  progress: Progress[]
}
