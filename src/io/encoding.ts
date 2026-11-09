// 取り込むファイルの文字コードの判定（仕様書 9.3 FR-IO-08）
import { ImportFileError } from './parsed'

const startsWith = (bytes: Uint8Array, sig: readonly number[]) =>
  sig.every((b, i) => bytes[i] === b)

/** Excel などの表計算ソフトのファイル（.xlsx は ZIP、.xls は OLE2） */
const SPREADSHEET_SIGNATURES = [
  [0x50, 0x4b, 0x03, 0x04],
  [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
] as const

/**
 * ファイルの中身を文字列にする。
 * UTF-8（BOM の有無を問わない）と、BOM 付きの UTF-16 を受け付ける。
 * Shift_JIS や Big5 などは推測せずにエラーにする（文字化けしたまま取り込まないため）
 */
export function decodeText(bytes: Uint8Array): string {
  if (bytes.length === 0) throw new ImportFileError('empty')
  if (SPREADSHEET_SIGNATURES.some((sig) => startsWith(bytes, sig))) {
    throw new ImportFileError('spreadsheet')
  }
  let encoding = 'utf-8'
  if (startsWith(bytes, [0xff, 0xfe])) encoding = 'utf-16le'
  else if (startsWith(bytes, [0xfe, 0xff])) encoding = 'utf-16be'

  let text: string
  try {
    // BOM は取り除かれる
    text = new TextDecoder(encoding, { fatal: true }).decode(bytes)
  } catch {
    throw new ImportFileError('invalidEncoding')
  }
  // NUL を含むものはテキストではない（画像や圧縮ファイルなど）
  if (text.includes('\u0000')) throw new ImportFileError('notText')
  if (text.trim() === '') throw new ImportFileError('empty')
  return text
}
