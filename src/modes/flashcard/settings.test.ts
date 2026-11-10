import { describe, expect, it } from 'vitest'
import { createModeSettingsStore } from '../../db/repos/settings'
import { DEFAULT_SESSION_SIZE, DEFAULT_SETTINGS, loadSettings, sanitizeSettings } from './settings'

describe('一回の出題数の初期値（FR-FC-02）', () => {
  it('20 枚', () => {
    expect(DEFAULT_SESSION_SIZE).toBe(20)
  })
})

describe('sanitizeSettings', () => {
  it('未保存や不正な値は初期値にする', () => {
    expect(sanitizeSettings({})).toEqual(DEFAULT_SETTINGS)
    expect(sanitizeSettings({ showZhuyin: 'yes' })).toEqual(DEFAULT_SETTINGS)
  })
})

describe('loadSettings', () => {
  it('mode.flashcard.* のキーから読み込む', async () => {
    const store = createModeSettingsStore('flashcard')
    await store.set('showPinyin', false)
    expect(await loadSettings(store)).toEqual({
      ...DEFAULT_SETTINGS,
      showPinyin: false,
    })
  })
})
