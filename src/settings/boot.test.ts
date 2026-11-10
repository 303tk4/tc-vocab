import { afterEach, describe, expect, it } from 'vitest'
import { themeColorFor } from './accents'
import { applyToDocument } from './boot'
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
