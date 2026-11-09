// 暗記カードのモード別設定（仕様書 10.2、FR-FC-02・12・14）
import type { ModeSettingsStore } from '../../db/repos/settings'

export interface FlashcardSettings {
  /** 1日の新規カード上限 */
  newPerDay: number
  showZhuyin: boolean
  showPinyin: boolean
  /** 裏返したときに自動で読み上げる */
  autoSpeak: boolean
}

export const DEFAULT_SETTINGS: FlashcardSettings = {
  newPerDay: 20,
  showZhuyin: true,
  showPinyin: true,
  autoSpeak: false,
}

export const NEW_PER_DAY_MIN = 0
export const NEW_PER_DAY_MAX = 200
/** 上限が 0 のときに「新規カードを追加で学習する」で出す枚数（仕様書 8.1） */
const EXTRA_WHEN_ZERO = 20

/** 保存キー（ModeSettingsStore が "mode.flashcard." を付ける） */
export const SETTING_KEYS = {
  newPerDay: 'newPerDay',
  showZhuyin: 'showZhuyin',
  showPinyin: 'showPinyin',
  autoSpeak: 'autoSpeak',
} as const satisfies Record<keyof FlashcardSettings, string>

/** 新規カード上限の入力値を検証する。範囲外や整数でない値は null */
export function parseNewPerDay(value: unknown): number | null {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  if (typeof n !== 'number' || !Number.isInteger(n)) return null
  return n >= NEW_PER_DAY_MIN && n <= NEW_PER_DAY_MAX ? n : null
}

/** 保存値を検証し、不正な値は初期値で補う */
export function sanitizeSettings(raw: Partial<Record<keyof FlashcardSettings, unknown>>) {
  const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback)
  return {
    newPerDay: parseNewPerDay(raw.newPerDay) ?? DEFAULT_SETTINGS.newPerDay,
    showZhuyin: bool(raw.showZhuyin, DEFAULT_SETTINGS.showZhuyin),
    showPinyin: bool(raw.showPinyin, DEFAULT_SETTINGS.showPinyin),
    autoSpeak: bool(raw.autoSpeak, DEFAULT_SETTINGS.autoSpeak),
  } satisfies FlashcardSettings
}

export async function loadSettings(store: ModeSettingsStore): Promise<FlashcardSettings> {
  const keys = Object.keys(SETTING_KEYS) as (keyof FlashcardSettings)[]
  const values = await Promise.all(keys.map((k) => store.get(SETTING_KEYS[k])))
  return sanitizeSettings(Object.fromEntries(keys.map((k, i) => [k, values[i]])))
}

/** 「新規カードを追加で学習する」の枚数（FR-FC-03） */
export function extraNewCount(newPerDay: number): number {
  return newPerDay > 0 ? newPerDay : EXTRA_WHEN_ZERO
}
