// 仕様書 10.1
import { ACCENTS, DEFAULT_ACCENT, type Accent } from './accents'

export const UI_LANGUAGES = ['ja', 'zh-TW', 'en'] as const
export type UiLanguage = (typeof UI_LANGUAGES)[number]

export const FONT_SCALES = ['sm', 'md', 'lg', 'xl'] as const
export type FontScale = (typeof FONT_SCALES)[number]

export const THEMES = ['light', 'dark', 'system'] as const
export type Theme = (typeof THEMES)[number]

export interface AppSettings {
  uiLanguage: UiLanguage
  fontScale: FontScale
  theme: Theme
  accent: Accent
}

/** settings テーブルでのキー */
export const SETTING_KEYS = {
  uiLanguage: 'app.uiLanguage',
  fontScale: 'app.fontScale',
  theme: 'app.theme',
  accent: 'app.accent',
} as const satisfies Record<keyof AppSettings, string>

/** ブラウザの言語設定から UI 言語を決める（FR-SET-01） */
export function detectLanguage(languages: readonly string[]): UiLanguage {
  for (const raw of languages) {
    const lang = raw.toLowerCase()
    if (lang.startsWith('ja')) return 'ja'
    if (lang === 'zh-tw' || lang === 'zh-hk' || lang.startsWith('zh-hant')) return 'zh-TW'
    if (lang.startsWith('en')) return 'en'
  }
  return 'en'
}

export function defaultSettings(languages: readonly string[] = navigator.languages): AppSettings {
  return {
    uiLanguage: detectLanguage(languages),
    fontScale: 'md',
    theme: 'system',
    accent: DEFAULT_ACCENT,
  }
}

function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (list as readonly string[]).includes(value)
}

/** 保存値を検証し、不正な値は初期値で補う */
export function sanitizeSettings(
  raw: Partial<Record<keyof AppSettings, unknown>>,
  base: AppSettings,
): AppSettings {
  return {
    uiLanguage: isOneOf(UI_LANGUAGES, raw.uiLanguage) ? raw.uiLanguage : base.uiLanguage,
    fontScale: isOneOf(FONT_SCALES, raw.fontScale) ? raw.fontScale : base.fontScale,
    theme: isOneOf(THEMES, raw.theme) ? raw.theme : base.theme,
    accent: isOneOf(ACCENTS, raw.accent) ? raw.accent : base.accent,
  }
}
