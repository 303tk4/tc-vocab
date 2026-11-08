import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getSettingsByPrefix, setSetting } from '../db/repos/settings'
import { useMediaQuery } from '../hooks/useMediaQuery'
import i18n from '../i18n'
import { applyToDocument, readBootSettings, writeBootSettings } from './boot'
import { SettingsContext, type SettingsContextValue } from './context'
import { defaultSettings, sanitizeSettings, SETTING_KEYS, type AppSettings } from './types'

export function SettingsProvider({ children }: { children: ReactNode }) {
  // 初期値は localStorage の写し（同期的に読める）。その後 IndexedDB の値で確定する
  const [settings, setSettings] = useState<AppSettings>(() =>
    sanitizeSettings(readBootSettings(), defaultSettings()),
  )
  const [loaded, setLoaded] = useState(false)
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')

  useEffect(() => {
    let cancelled = false
    getSettingsByPrefix('app.')
      .then((rows) => {
        if (cancelled) return
        const stored = {
          uiLanguage: rows[SETTING_KEYS.uiLanguage],
          fontScale: rows[SETTING_KEYS.fontScale],
          theme: rows[SETTING_KEYS.theme],
        }
        setSettings((current) => sanitizeSettings(stored, current))
      })
      .catch((error: unknown) => console.error('設定の読み込みに失敗しました', error))
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    applyToDocument(settings, prefersDark)
    writeBootSettings(settings)
    if (i18n.language !== settings.uiLanguage) void i18n.changeLanguage(settings.uiLanguage)
  }, [settings, prefersDark])

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((current) => ({ ...current, ...patch }))
    for (const [name, value] of Object.entries(patch)) {
      const key = SETTING_KEYS[name as keyof AppSettings]
      setSetting(key, value).catch((error: unknown) =>
        console.error('設定の保存に失敗しました', error),
      )
    }
  }, [])

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, loaded, update }),
    [settings, loaded, update],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
