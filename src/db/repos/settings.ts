import { db } from '../schema'

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const row = await db.settings.get(key)
  return row?.value as T | undefined
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value })
}

/** 指定した接頭辞（例: "app."）で始まる設定をまとめて取得する */
export async function getSettingsByPrefix(prefix: string): Promise<Record<string, unknown>> {
  const rows = await db.settings.where('key').startsWith(prefix).toArray()
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}

/** モード専用の設定 API。キーには "mode.<modeId>." が自動で付く（FR-PLUG-05） */
export interface ModeSettingsStore {
  get<T>(key: string): Promise<T | undefined>
  set(key: string, value: unknown): Promise<void>
}

export function createModeSettingsStore(modeId: string): ModeSettingsStore {
  const prefix = `mode.${modeId}.`
  return {
    get: <T>(key: string) => getSetting<T>(prefix + key),
    set: (key, value) => setSetting(prefix + key, value),
  }
}
