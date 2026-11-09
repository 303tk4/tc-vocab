import { describe, expect, it } from 'vitest'
import { createModeSettingsStore } from '../../db/repos/settings'
import {
  DEFAULT_SETTINGS,
  extraNewCount,
  loadSettings,
  parseNewPerDay,
  sanitizeSettings,
} from './settings'

describe('parseNewPerDay（範囲 0〜200 の整数）', () => {
  it('範囲内の整数を受け付ける', () => {
    expect(parseNewPerDay(0)).toBe(0)
    expect(parseNewPerDay(200)).toBe(200)
    expect(parseNewPerDay('35')).toBe(35)
  })

  it('範囲外・小数・空文字は null', () => {
    expect(parseNewPerDay(-1)).toBeNull()
    expect(parseNewPerDay(201)).toBeNull()
    expect(parseNewPerDay(1.5)).toBeNull()
    expect(parseNewPerDay('')).toBeNull()
    expect(parseNewPerDay('abc')).toBeNull()
  })
})

describe('sanitizeSettings', () => {
  it('未保存や不正な値は初期値にする', () => {
    expect(sanitizeSettings({})).toEqual(DEFAULT_SETTINGS)
    expect(sanitizeSettings({ newPerDay: 999, showZhuyin: 'yes' })).toEqual(DEFAULT_SETTINGS)
  })
})

describe('loadSettings', () => {
  it('mode.flashcard.* のキーから読み込む', async () => {
    const store = createModeSettingsStore('flashcard')
    await store.set('newPerDay', 5)
    await store.set('showPinyin', false)
    expect(await loadSettings(store)).toEqual({
      ...DEFAULT_SETTINGS,
      newPerDay: 5,
      showPinyin: false,
    })
  })
})

describe('extraNewCount（FR-FC-03）', () => {
  it('上限と同じ枚数。上限が 0 なら 20 枚', () => {
    expect(extraNewCount(15)).toBe(15)
    expect(extraNewCount(0)).toBe(20)
  })
})
