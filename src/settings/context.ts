import { createContext, useContext } from 'react'
import type { AppSettings } from './types'

export interface SettingsContextValue {
  settings: AppSettings
  /** IndexedDB からの読み込みが終わったか */
  loaded: boolean
  update(patch: Partial<AppSettings>): void
}

export const SettingsContext = createContext<SettingsContextValue | null>(null)

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext)
  if (!value) throw new Error('useSettings は SettingsProvider の内側で使ってください')
  return value
}
