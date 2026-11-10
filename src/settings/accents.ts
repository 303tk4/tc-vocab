// アクセントカラー（FR-SET-04、仕様書 10.1）
// 実際の色は src/styles/tokens.css で定義する。ここの値は設定画面の色見本に使い、
// tokens.test.ts で tokens.css と一致することを確かめる

export const ACCENTS = ['red', 'green', 'blue', 'purple', 'orange', 'mono'] as const
export type Accent = (typeof ACCENTS)[number]

export const DEFAULT_ACCENT: Accent = 'red'

/** 色見本に使う、テーマごとのアクセントカラー（--color-accent） */
export const ACCENT_SWATCHES: Record<Accent, { light: string; dark: string }> = {
  red: { light: '#b4232f', dark: '#e5636c' },
  green: { light: '#1d6b40', dark: '#5cc489' },
  blue: { light: '#1f5fbf', dark: '#6ea2f0' },
  purple: { light: '#6a3fb5', dark: '#b39af0' },
  orange: { light: '#b04a0c', dark: '#f0954f' },
  mono: { light: '#1f1d1a', dark: '#ece8e2' },
}

/**
 * ウィンドウ上部（アドレスバー・タイトルバー）の色（`<meta name="theme-color">`。FR-SET-04、版 1.46）。
 * 背景が黒でも、白い文字が読みやすい濃い方（白い背景のときの色）を使う。
 * index.html のインラインスクリプトにも同じ表があり、tokens.test.ts で一致を確かめる
 */
export function themeColorFor(accent: Accent): string {
  return ACCENT_SWATCHES[accent].light
}
