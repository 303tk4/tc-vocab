import { describe, expect, it } from 'vitest'
import { createModeSettingsStore } from '../../db/repos/settings'
import { DEFAULT_OPTIONS, sanitizeOptions } from './options'
import {
  DEFAULT_SETTINGS,
  extraNewCount,
  loadSettings,
  parseNewPerDay,
  sanitizeSettings,
} from './settings'

describe('場面別会話のモード別設定（仕様書 10.2）', () => {
  it('新しい項目の上限は 0〜100 の整数', () => {
    expect(parseNewPerDay(0)).toBe(0)
    expect(parseNewPerDay('100')).toBe(100)
    expect(parseNewPerDay(101)).toBeNull()
    expect(parseNewPerDay(-1)).toBeNull()
    expect(parseNewPerDay(2.5)).toBeNull()
    expect(parseNewPerDay('')).toBeNull()
  })

  it('初期値：上限 10、注音・拼音を表示、音声だけで出さない、背景の画像を表示', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      newPerDay: 10,
      showZhuyin: true,
      showPinyin: true,
      audioOnly: false,
      showBackground: true,
    })
    expect(sanitizeSettings({ newPerDay: 500, audioOnly: 'yes' })).toEqual(DEFAULT_SETTINGS)
  })

  it('保存した値を読む', async () => {
    const store = createModeSettingsStore('conversation')
    await store.set('newPerDay', 25)
    await store.set('showBackground', false)
    expect(await loadSettings(store)).toMatchObject({ newPerDay: 25, showBackground: false })
  })

  it('上限が 0 でも、追加で学習するときは 10 問出す', () => {
    expect(extraNewCount(0)).toBe(10)
    expect(extraNewCount(15)).toBe(15)
  })
})

describe('準備画面のオプション（FR-CONV-01）', () => {
  it('不正な値は初期値で補う', () => {
    expect(sanitizeOptions(undefined)).toEqual(DEFAULT_OPTIONS)
    expect(sanitizeOptions({ language: '', scenes: ['a', 1], kinds: 'x' })).toEqual({
      language: null,
      scenes: ['a'],
      kinds: 'both',
    })
    expect(sanitizeOptions({ language: 'en', scenes: [], kinds: 'say' })).toEqual({
      language: 'en',
      scenes: [],
      kinds: 'say',
    })
  })
})
