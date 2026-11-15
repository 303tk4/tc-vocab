import { afterEach, describe, expect, it } from 'vitest'
import { themeColorFor } from './accents'
import {
  applyToDocument,
  BOOT_STORAGE_KEY,
  lockBootSettings,
  readBootSettings,
  writeBootSettings,
} from './boot'
import { defaultSettings } from './types'

function themeMeta() {
  return document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
}

describe('ウィンドウ上部の色（FR-SET-04、版 1.46）', () => {
  afterEach(() => themeMeta()?.remove())

  it('アクセントカラーを変えると、その場で theme-color も変わる', () => {
    const base = defaultSettings(['ja'])
    applyToDocument({ ...base, accent: 'red' }, false)
    expect(themeMeta()?.content).toBe(themeColorFor('red'))
    applyToDocument({ ...base, accent: 'green' }, false)
    expect(themeMeta()?.content).toBe(themeColorFor('green'))
    // 1つだけを書き換え、増やさない
    expect(document.querySelectorAll('meta[name="theme-color"]')).toHaveLength(1)
  })

  it('黒の背景でも、濃い方の色を使う', () => {
    const base = defaultSettings(['ja'])
    applyToDocument({ ...base, theme: 'dark', accent: 'blue' }, true)
    expect(themeMeta()?.content).toBe('#1f5fbf')
  })
})

// このページでは以後書き換えなくなるため、このファイルの最後に置く
describe('起動時の写しの固定（FR-SET-12・13）', () => {
  it('固定したあとは、写しを書き換えない', () => {
    writeBootSettings({ ...defaultSettings(['ja']), theme: 'dark' })
    expect(readBootSettings().theme).toBe('dark')
    localStorage.removeItem(BOOT_STORAGE_KEY)
    lockBootSettings()
    writeBootSettings({ ...defaultSettings(['ja']), theme: 'dark' })
    expect(localStorage.getItem(BOOT_STORAGE_KEY)).toBeNull()
  })
})
