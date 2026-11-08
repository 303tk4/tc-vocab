// 単語データの検証と正規化（仕様書 6.1）
import type { Example, Word } from '../types/word'

export const LIMITS = {
  hanzi: 50,
  zhuyin: 200,
  pinyin: 200,
  meaning: 500,
  examples: 10,
  exampleText: 500,
  tags: 20,
  tag: 50,
} as const

export type WordField = 'word' | 'hanzi' | 'zhuyin' | 'pinyin' | 'meaning' | 'examples' | 'tags'

export interface ValidationError {
  code: 'notObject' | 'required' | 'tooLong' | 'tooMany' | 'invalidType' | 'csvSyntax'
  field: WordField
  max?: number
}

/** 取り込み前の単語。id・日時はファイルに含まれていれば引き継ぐ */
export type WordDraft = Omit<Word, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string
  createdAt?: number
  updatedAt?: number
}

export type NormalizeResult =
  { ok: true; word: WordDraft } | { ok: false; errors: ValidationError[] }

/** 文字数（サロゲートペアを1文字と数える） */
export function charLength(s: string): number {
  return [...s].length
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

/** タグの前後の空白を除き、空のものと重複を取り除く */
export function normalizeTags(tags: readonly string[]): string[] {
  return [...new Set(tags.map((t) => t.trim()).filter((t) => t !== ''))]
}

/**
 * 外部から読み込んだ値を検証し、Word の形に揃える。
 * 必須でない項目は省略可（空文字・空配列として扱う）。
 */
export function normalizeWord(raw: unknown): NormalizeResult {
  if (!isRecord(raw)) return { ok: false, errors: [{ code: 'notObject', field: 'word' }] }
  const errors: ValidationError[] = []

  const text = (field: 'hanzi' | 'zhuyin' | 'pinyin' | 'meaning', required: boolean): string => {
    const value = raw[field]
    if (value === undefined || value === null) {
      if (required) errors.push({ code: 'required', field })
      return ''
    }
    if (typeof value !== 'string') {
      errors.push({ code: 'invalidType', field })
      return ''
    }
    const trimmed = value.trim()
    if (required && trimmed === '') errors.push({ code: 'required', field })
    else if (charLength(trimmed) > LIMITS[field])
      errors.push({ code: 'tooLong', field, max: LIMITS[field] })
    return trimmed
  }

  const hanzi = text('hanzi', true)
  const zhuyin = text('zhuyin', false)
  const pinyin = text('pinyin', false)
  const meaning = text('meaning', true)

  const examples: Example[] = []
  if (raw.examples !== undefined && raw.examples !== null) {
    if (!Array.isArray(raw.examples)) {
      errors.push({ code: 'invalidType', field: 'examples' })
    } else {
      let invalid = false
      for (const item of raw.examples) {
        if (!isRecord(item) || typeof item.text !== 'string') {
          invalid = true
          continue
        }
        if (item.translation !== undefined && typeof item.translation !== 'string') {
          invalid = true
          continue
        }
        const exampleText = item.text.trim()
        const translation = (item.translation ?? '').trim()
        if (exampleText === '') {
          // 訳だけの例文は不正。両方空なら無視する
          if (translation !== '') invalid = true
          continue
        }
        if (charLength(exampleText) > LIMITS.exampleText) {
          errors.push({ code: 'tooLong', field: 'examples', max: LIMITS.exampleText })
          continue
        }
        examples.push(translation ? { text: exampleText, translation } : { text: exampleText })
      }
      if (invalid) errors.push({ code: 'invalidType', field: 'examples' })
      if (examples.length > LIMITS.examples)
        errors.push({ code: 'tooMany', field: 'examples', max: LIMITS.examples })
    }
  }

  let tags: string[] = []
  if (raw.tags !== undefined && raw.tags !== null) {
    if (!Array.isArray(raw.tags) || raw.tags.some((t) => typeof t !== 'string')) {
      errors.push({ code: 'invalidType', field: 'tags' })
    } else {
      tags = normalizeTags(raw.tags as string[])
      if (tags.length > LIMITS.tags)
        errors.push({ code: 'tooMany', field: 'tags', max: LIMITS.tags })
      if (tags.some((t) => charLength(t) > LIMITS.tag))
        errors.push({ code: 'tooLong', field: 'tags', max: LIMITS.tag })
    }
  }

  if (errors.length > 0) return { ok: false, errors }

  const word: WordDraft = { hanzi, zhuyin, pinyin, meaning, examples, tags }
  if (typeof raw.id === 'string' && raw.id.trim() !== '' && raw.id.length <= 100) word.id = raw.id
  if (isTimestamp(raw.createdAt)) word.createdAt = raw.createdAt
  if (isTimestamp(raw.updatedAt)) word.updatedAt = raw.updatedAt
  return { ok: true, word }
}

/** 重複判定のキー。繁体字と拼音（小文字）が両方一致すれば重複とみなす */
export function duplicateKey(word: Pick<Word, 'hanzi' | 'pinyin'>): string {
  return `${word.hanzi.trim()}\u0000${word.pinyin.trim().toLowerCase()}`
}
