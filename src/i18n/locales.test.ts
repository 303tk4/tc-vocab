import { describe, expect, it } from 'vitest'
import { modes } from '../modes/registry'
import { UI_LANGUAGES } from '../settings/types'
import en from './locales/en.json'
import ja from './locales/ja.json'
import zhTW from './locales/zh-TW.json'

/** ネストしたオブジェクトのキーを "a.b.c" 形式で列挙する */
function keysOf(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj)
    .flatMap(([key, value]) =>
      value && typeof value === 'object'
        ? keysOf(value as Record<string, unknown>, `${prefix}${key}.`)
        : [`${prefix}${key}`],
    )
    .sort()
}

describe('共通の翻訳文言', () => {
  it('3言語でキーが一致する', () => {
    expect(keysOf(zhTW)).toEqual(keysOf(ja))
    expect(keysOf(en)).toEqual(keysOf(ja))
  })
})

describe.each(modes.map((m) => [m.id, m] as const))('モード %s の翻訳文言', (_id, mode) => {
  it('3言語でキーが一致する', () => {
    const base = keysOf(mode.locales.ja)
    for (const lang of UI_LANGUAGES) expect(keysOf(mode.locales[lang])).toEqual(base)
  })

  it('名称と説明のキーが存在する', () => {
    for (const lang of UI_LANGUAGES) {
      expect(mode.locales[lang][mode.titleKey]).toBeTruthy()
      expect(mode.locales[lang][mode.descriptionKey]).toBeTruthy()
    }
  })
})
