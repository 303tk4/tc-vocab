import { describe, expect, it } from 'vitest'
import { detectLanguage, sanitizeSettings, type AppSettings } from './types'

describe('detectLanguage', () => {
  it.each([
    [['ja-JP'], 'ja'],
    [['ja'], 'ja'],
    [['zh-TW'], 'zh-TW'],
    [['zh-HK'], 'zh-TW'],
    [['zh-Hant-TW'], 'zh-TW'],
    [['en-US'], 'en'],
    [['zh-CN'], 'en'],
    [['fr-FR'], 'en'],
    [[], 'en'],
    [['fr-FR', 'ja-JP'], 'ja'],
  ] as const)('%j → %s', (languages, expected) => {
    expect(detectLanguage(languages)).toBe(expected)
  })
})

describe('sanitizeSettings', () => {
  const base: AppSettings = { uiLanguage: 'ja', fontScale: 'md', theme: 'system', accent: 'red' }

  it('正しい値はそのまま使う', () => {
    expect(
      sanitizeSettings({ uiLanguage: 'en', fontScale: 'xl', theme: 'dark', accent: 'green' }, base),
    ).toEqual({
      uiLanguage: 'en',
      fontScale: 'xl',
      theme: 'dark',
      accent: 'green',
    })
  })

  it('不正な値や欠けた値は初期値で補う', () => {
    expect(
      sanitizeSettings({ uiLanguage: 'fr', fontScale: 3, theme: undefined, accent: 'pink' }, base),
    ).toEqual(base)
  })
})
