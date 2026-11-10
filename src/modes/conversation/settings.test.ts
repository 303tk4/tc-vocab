import { describe, expect, it } from 'vitest'
import { createModeSettingsStore } from '../../db/repos/settings'
import { DEFAULT_OPTIONS, sanitizeOptions } from './options'
import { DEFAULT_SESSION_SIZE, DEFAULT_SETTINGS, loadSettings, sanitizeSettings } from './settings'

describe('場面別会話のモード別設定（仕様書 10.2）', () => {
  it('一回の出題数の初期値は 10 問（FR-CONV-03）', () => {
    expect(DEFAULT_SESSION_SIZE).toBe(10)
  })

  it('初期値：注音・拼音を表示、音声だけで出さない、背景の画像を表示', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      showZhuyin: true,
      showPinyin: true,
      audioOnly: false,
      showBackground: true,
    })
    expect(sanitizeSettings({ audioOnly: 'yes' })).toEqual(DEFAULT_SETTINGS)
  })

  it('保存した値を読む', async () => {
    const store = createModeSettingsStore('conversation')
    await store.set('showBackground', false)
    expect(await loadSettings(store)).toMatchObject({ showBackground: false })
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
