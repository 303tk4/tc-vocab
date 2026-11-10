// 一回の出題数（仕様書 7.2 FR-PLUG-08、8.1 FR-FC-02、18.1 FR-CONV-03）。React から独立した純粋な処理

export const SESSION_SIZE_MIN = 1
export const SESSION_SIZE_MAX = 200

/** 保存キー（ModeSettingsStore が "mode.<modeId>." を付ける） */
export const SESSION_SIZE_KEY = 'sessionSize'
/** 版 1.40 までの「1日の上限」の保存キー。値を引き継ぐためだけに読む */
export const LEGACY_DAILY_LIMIT_KEY = 'newPerDay'

/** 入力値を検証する。1〜200 の整数でなければ null */
export function parseSessionSize(value: unknown): number | null {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  if (typeof n !== 'number' || !Number.isInteger(n)) return null
  return n >= SESSION_SIZE_MIN && n <= SESSION_SIZE_MAX ? n : null
}

/**
 * 使う出題数を決める。保存した値 → 版 1.40 までの「1日の上限」（1〜200 なら引き継ぐ。0 は除く）
 * → モードの初期値、の順
 */
export function resolveSessionSize(saved: unknown, legacy: unknown, defaultValue: number): number {
  return parseSessionSize(saved) ?? parseSessionSize(legacy) ?? defaultValue
}
