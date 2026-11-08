import type { AppSettings, Theme } from './types'

/**
 * 起動時のちらつきを防ぐため、表示に関わる設定を localStorage にも写しておく。
 * index.html のインラインスクリプトが React の描画前にこれを読んで適用する。
 * 正本は IndexedDB の settings テーブル。キー名を変えるときは index.html も直すこと。
 */
export const BOOT_STORAGE_KEY = 'tc-vocab:boot'

export function readBootSettings(): Partial<AppSettings> {
  try {
    const raw = localStorage.getItem(BOOT_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Partial<AppSettings>) : {}
  } catch {
    return {}
  }
}

export function writeBootSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(BOOT_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // プライベートモードなどで保存できなくても動作は続ける
  }
}

export function resolveTheme(theme: Theme, prefersDark: boolean): 'light' | 'dark' {
  if (theme === 'system') return prefersDark ? 'dark' : 'light'
  return theme
}

export function applyToDocument(settings: AppSettings, prefersDark: boolean): void {
  const root = document.documentElement
  root.dataset.theme = resolveTheme(settings.theme, prefersDark)
  root.dataset.fontScale = settings.fontScale
  root.lang = settings.uiLanguage
}
