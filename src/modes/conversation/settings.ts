// 場面別会話のモード別設定（仕様書 10.2、FR-CONV-03・11・15・16）
import type { ModeSettingsStore } from '../../db/repos/settings'

export interface ConversationSettings {
  showZhuyin: boolean
  showPinyin: boolean
  /** セリフを音声だけで出す（FR-CONV-11） */
  audioOnly: boolean
  /** 背景の画像を表示する（FR-CONV-16） */
  showBackground: boolean
}

export const DEFAULT_SETTINGS: ConversationSettings = {
  showZhuyin: true,
  showPinyin: true,
  audioOnly: false,
  showBackground: true,
}

/** 一回の出題数の初期値（FR-PLUG-08。入力欄はコアの準備画面にある。版 1.41） */
export const DEFAULT_SESSION_SIZE = 10

/** 保存キー（ModeSettingsStore が "mode.conversation." を付ける） */
export const SETTING_KEYS = {
  showZhuyin: 'showZhuyin',
  showPinyin: 'showPinyin',
  audioOnly: 'audioOnly',
  showBackground: 'showBackground',
} as const satisfies Record<keyof ConversationSettings, string>

/** 保存値を検証し、不正な値は初期値で補う */
export function sanitizeSettings(
  raw: Partial<Record<keyof ConversationSettings, unknown>>,
): ConversationSettings {
  const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback)
  return {
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
