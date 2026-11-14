// 暗記カードのモード別の表示の設定（仕様書 10.2、FR-FC-12）。自動の読み上げは準備画面のチェックボックス（FR-PLUG-09・FR-FC-14）
import type { ModeSettingsStore } from '../../db/repos/settings'

export interface FlashcardSettings {
  showZhuyin: boolean
  showPinyin: boolean
}

export const DEFAULT_SETTINGS: FlashcardSettings = {
  showZhuyin: true,
  showPinyin: true,
}

/** 音声の自動再生の初期値（FR-PLUG-09・FR-FC-14）。裏返したときに繁体字を読み上げる */
export const DEFAULT_AUTO_SPEAK = false

/** 一回の出題数の初期値（FR-PLUG-08。入力欄はコアの準備画面にある。版 1.41） */
export const DEFAULT_SESSION_SIZE = 20

/** 保存キー（ModeSettingsStore が "mode.flashcard." を付ける） */
export const SETTING_KEYS = {
  showZhuyin: 'showZhuyin',
  showPinyin: 'showPinyin',
} as const satisfies Record<keyof FlashcardSettings, string>

/** 保存値を検証し、不正な値は初期値で補う */
export function sanitizeSettings(raw: Partial<Record<keyof FlashcardSettings, unknown>>) {
  const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback)
  return {
    showZhuyin: bool(raw.showZhuyin, DEFAULT_SETTINGS.showZhuyin),
    showPinyin: bool(raw.showPinyin, DEFAULT_SETTINGS.showPinyin),
  } satisfies FlashcardSettings
}

export async function loadSettings(store: ModeSettingsStore): Promise<FlashcardSettings> {
  const keys = Object.keys(SETTING_KEYS) as (keyof FlashcardSettings)[]
  const values = await Promise.all(keys.map((k) => store.get(SETTING_KEYS[k])))
  return sanitizeSettings(Object.fromEntries(keys.map((k, i) => [k, values[i]])))
}
