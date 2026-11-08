// JSON 形式（仕様書 9.1）
import type { Progress, Word } from '../types/word'
import { ImportFileError, stripBom, type ParsedFile, type ParsedRow } from './parsed'
import { normalizeWord } from './validate'

export const JSON_FORMAT = 'tc-vocab'
export const JSON_VERSION = 1

export interface ExportJson {
  format: typeof JSON_FORMAT
  version: typeof JSON_VERSION
  exportedAt: string
  words: Word[]
  progress?: Progress[]
}

export function buildJson(words: Word[], progress?: Progress[], now = new Date()): string {
  const data: ExportJson = {
    format: JSON_FORMAT,
    version: JSON_VERSION,
    exportedAt: now.toISOString(),
    words: words.map((w) => ({
      id: w.id,
      hanzi: w.hanzi,
      zhuyin: w.zhuyin,
      pinyin: w.pinyin,
      meaning: w.meaning,
      examples: w.examples,
      tags: w.tags,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    })),
  }
  if (progress) data.progress = progress
  return JSON.stringify(data, null, 2) + '\n'
}

function isProgress(value: unknown): value is Progress {
  if (typeof value !== 'object' || value === null) return false
  const p = value as Record<string, unknown>
  return (
    typeof p.modeId === 'string' &&
    typeof p.wordId === 'string' &&
    (p.due === null || (typeof p.due === 'number' && Number.isFinite(p.due))) &&
    typeof p.updatedAt === 'number' &&
    'state' in p
  )
}

export function parseJson(text: string): ParsedFile {
  let data: unknown
  try {
    data = JSON.parse(stripBom(text))
  } catch {
    throw new ImportFileError('invalidJson')
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new ImportFileError('invalidFormat')
  }
  const root = data as Record<string, unknown>
  if (root.format !== JSON_FORMAT || !Array.isArray(root.words)) {
    throw new ImportFileError('invalidFormat')
  }
  if (root.version !== JSON_VERSION) throw new ImportFileError('unsupportedVersion')

  const rows: ParsedRow[] = root.words.map((raw, position) => {
    const result = normalizeWord(raw)
    return result.ok
      ? { position, word: result.word, errors: [] }
      : { position, errors: result.errors }
  })
  // 形式の正しくない進捗は黙って読み飛ばす
  const progress = Array.isArray(root.progress)
    ? root.progress.filter(isProgress).map((p): Progress => ({
        modeId: p.modeId,
        wordId: p.wordId,
        due: p.due,
        state: p.state,
        updatedAt: p.updatedAt,
      }))
    : []
  return { kind: 'json', rows, progress }
}
