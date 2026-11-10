/// <reference types="node" />
// テーマとアクセントカラーの配色が WCAG 2.1 AA を満たすか（NFR-03・FR-SET-04）
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ACCENT_SWATCHES, ACCENTS, DEFAULT_ACCENT, themeColorFor } from '../settings/accents'

// Vitest では CSS の中身を読み込まない設定のため、ファイルを直接読む
const tokens = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8')

/** セレクター → 変数の表。カンマ区切りのセレクターはそれぞれに割り当てる */
function parseTokens(css: string): Map<string, Record<string, string>> {
  const map = new Map<string, Record<string, string>>()
  const body = css.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const [, selectors, block] of body.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const vars: Record<string, string> = {}
    for (const [, name, value] of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      vars[name] = value.trim()
    }
    for (const selector of selectors.split(',')) {
      const key = selector.trim()
      map.set(key, { ...map.get(key), ...vars })
    }
  }
  return map
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const table = parseTokens(tokens)
const THEMES = ['light', 'dark'] as const

function palette(theme: (typeof THEMES)[number], accent: string): Record<string, string> {
  const base = table.get(`:root[data-theme='${theme}']`)
  if (!base) throw new Error(`テーマ ${theme} がない`)
  return { ...base, ...table.get(`:root[data-theme='${theme}'][data-accent='${accent}']`) }
}

describe.each(THEMES)('テーマ %s', (theme) => {
  it.each(ACCENTS)('アクセントカラー %s のコントラスト', (accent) => {
    const p = palette(theme, accent)
    const accentColor = p['--color-accent']
    // ボタン上の文字（通常時と hover 時）
    expect(contrast(p['--color-on-accent'], accentColor)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(p['--color-on-accent'], p['--color-accent-strong'])).toBeGreaterThanOrEqual(4.5)
    // 文字として使う濃い色（背景・面・選択中の背景の上）
    for (const bg of [
      '--color-bg',
      '--color-surface',
      '--color-surface-2',
      '--color-accent-soft',
    ]) {
      expect(contrast(p['--color-accent-strong'], p[bg])).toBeGreaterThanOrEqual(4.5)
    }
    // 枠や進捗バーなどの部品（1.4.11 非テキストのコントラスト）
    expect(contrast(accentColor, p['--color-bg'])).toBeGreaterThanOrEqual(3)
    // 設定画面の色見本と一致する
    expect(accentColor).toBe(ACCENT_SWATCHES[accent][theme])
  })

  it('危険・注意の色はアクセントカラーによらず同じで、読める', () => {
    const p = palette(theme, 'red')
    for (const accent of ACCENTS) {
      expect(palette(theme, accent)['--color-danger']).toBe(p['--color-danger'])
    }
    for (const bg of ['--color-bg', '--color-surface', '--color-danger-soft']) {
      expect(contrast(p['--color-danger-strong'], p[bg])).toBeGreaterThanOrEqual(4.5)
    }
    expect(contrast(p['--color-danger'], p['--color-bg'])).toBeGreaterThanOrEqual(3)
  })
})

describe('ウィンドウ上部の色（FR-SET-04、版 1.46）', () => {
  const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')

  it.each(ACCENTS)('%s：白い文字が読める濃さで、index.html の表と一致する', (accent) => {
    const color = themeColorFor(accent)
    // タイトルバーの白い文字（3:1 は大きな文字の基準）
    expect(contrast('#ffffff', color)).toBeGreaterThanOrEqual(3)
    // 起動時に描画前に塗るインラインスクリプトの表（index.html）と同じ値
    expect(html).toMatch(new RegExp(`\\b${accent}: '${color}'`))
  })

  it('index.html の初期値は、初期のアクセントカラーの色', () => {
    expect(html).toContain(`<meta name="theme-color" content="${themeColorFor(DEFAULT_ACCENT)}" />`)
  })
})
