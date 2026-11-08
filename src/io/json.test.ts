import { describe, expect, it } from 'vitest'
import { jieyun, tricky } from '../test/fixtures'
import type { Progress } from '../types/word'
import { buildJson, parseJson } from './json'
import { BOM, ImportFileError } from './parsed'

const progress: Progress = {
  modeId: 'flashcard',
  wordId: 'jieyun',
  due: 1_700_086_400_000,
  state: { ease: 2.5, interval: 1 },
  updatedAt: 1_700_000_000_000,
}

describe('buildJson', () => {
  it('仕様書 9.1 の形式で出力し、進捗は選んだときだけ含める', () => {
    const now = new Date('2026-11-09T12:00:00.000Z')
    const without = JSON.parse(buildJson([jieyun], undefined, now))
    expect(without).toEqual({
      format: 'tc-vocab',
      version: 1,
      exportedAt: '2026-11-09T12:00:00.000Z',
      words: [jieyun],
    })
    expect(JSON.parse(buildJson([jieyun], [progress], now)).progress).toEqual([progress])
  })
})

describe('parseJson', () => {
  it('往復：全項目と進捗が元に戻る（仕様書 9.5）', () => {
    const file = parseJson(buildJson([jieyun, tricky], [progress]))
    expect(file.rows.map((r) => r.word)).toEqual([jieyun, tricky])
    expect(file.progress).toEqual([progress])
  })

  it('id・日時が無くても読み込め、エラーは配列の番号つきで返す', () => {
    const file = parseJson(
      BOM +
        JSON.stringify({
          format: 'tc-vocab',
          version: 1,
          words: [{ hanzi: '茶', meaning: 'お茶' }, { hanzi: '水' }, 'x'],
          progress: [{ modeId: 'a' }],
        }),
    )
    expect(file.rows.map((r) => [r.position, r.errors.map((e) => e.code)])).toEqual([
      [0, []],
      [1, ['required']],
      [2, ['notObject']],
    ])
    expect(file.progress).toEqual([])
  })

  it.each([
    ['{', 'invalidJson'],
    ['[]', 'invalidFormat'],
    ['{"format":"other","version":1,"words":[]}', 'invalidFormat'],
    ['{"format":"tc-vocab","version":1}', 'invalidFormat'],
    ['{"format":"tc-vocab","version":2,"words":[]}', 'unsupportedVersion'],
  ])('読み込めないファイル %s → %s', (text, code) => {
    expect(() => parseJson(text)).toThrow(ImportFileError)
    try {
      parseJson(text)
    } catch (e) {
      expect((e as ImportFileError).code).toBe(code)
    }
  })
})
