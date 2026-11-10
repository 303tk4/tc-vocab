// 場面別会話のモード別設定（仕様書 10.2、FR-CONV-03・11・15・16）
import type { ModeSettingsStore } from '../../db/repos/settings'

export interface ConversationSettings {
  /** 1日の新しい項目の上限 */
  newPerDay: number
  showZhuyin: boolean
  showPinyin: boolean
  /** セリフを音声だけで出す（FR-CONV-11） */
  audioOnly: boolean
  /** 背景の画像を表示する（FR-CONV-16） */
  showBackground: boolean
}

export const DEFAULT_SETTINGS: ConversationSettings = {
  newPerDay: 10,
  showZhuyin: true,
  showPinyin: true,
  audioOnly: false,
  showBackground: true,
}

export const NEW_PER_DAY_MIN = 0
export const NEW_PER_DAY_MAX = 100
/** 上限が 0 のときに「新しい項目を追加で学習する」で出す件数（暗記カードと同じ考え方。8.1） */
const EXTRA_WHEN_ZERO = 10

/** 保存キー（ModeSettingsStore が "mode.conversation." を付ける） */
export const SETTING_KEYS = {
  newPerDay: 'newPerDay',
  showZhuyin: 'showZhuyin',
  showPinyin: 'showPinyin',
  audioOnly: 'audioOnly',
  showBackground: 'showBackground',
} as const satisfies Record<keyof ConversationSettings, string>

/** 新しい項目の上限の入力値を検証する。範囲外や整数でない値は null */
export function parseNewPerDay(value: unknown): number | null {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  if (typeof n !== 'number' || !Number.isInteger(n)) return null
  return n >= NEW_PER_DAY_MIN && n <= NEW_PER_DAY_MAX ? n : null
}

/** 保存値を検証し、不正な値は初期値で補う */
export function sanitizeSettings(
  raw: Partial<Record<keyof ConversationSettings, unknown>>,
): ConversationSettings {
  const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback)
  return {
    newPerDay: parseNewPerDay(raw.newPerDay) ?? DEFAULT_SETTINGS.newPerDay,
    showZhuyin: bool(raw.showZhuyin, DEFAULT_SETTINGS.showZhuyin),
    showPinyin: bool(raw.showPinyin, DEFAULT_SETTINGS.showPinyin),
    audioOnly: bool(raw.audioOnly, DEFAULT_SETTINGS.audioOnly),
    showBackground: bool(raw.showBackground, DEFAULT_SETTINGS.showBackground),
  }
}

export async function loadSettings(store: ModeSettingsStore): Promise<ConversationSettings> {
  const keys = Object.keys(SETTING_KEYS) as (keyof ConversationSettings)[]
  const values = await Promise.all(keys.map((k) => store.get(SETTING_KEYS[k])))
  return sanitizeSettings(Object.fromEntries(keys.map((k, i) => [k, values[i]])))
}

/** 「新しい項目を追加で学習する」の件数（FR-FC-03 と同じ） */
export function extraNewCount(newPerDay: number): number {
  return newPerDay > 0 ? newPerDay : EXTRA_WHEN_ZERO
}
