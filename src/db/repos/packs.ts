// 追加済みの単語パッケージの記録（仕様書 16.5）
import type { InstalledPacks } from '../../io/packs'
import { getSetting, setSetting } from './settings'

const INSTALLED_KEY = 'packs.installed'

export async function getInstalledPacks(): Promise<InstalledPacks> {
  const saved = await getSetting<unknown>(INSTALLED_KEY)
  if (typeof saved !== 'object' || saved === null || Array.isArray(saved)) return {}
  return Object.fromEntries(
    Object.entries(saved).filter((e): e is [string, number] => Number.isInteger(e[1])),
  )
}

export async function markPackInstalled(id: string, version: number): Promise<void> {
  const installed = await getInstalledPacks()
  await setSetting(INSTALLED_KEY, { ...installed, [id]: version })
}
