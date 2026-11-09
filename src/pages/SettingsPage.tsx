import { Suspense, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { ChevronRightIcon } from '../components/icons'
import { SegmentedControl } from '../components/SegmentedControl'
import { createModeSettingsStore } from '../db/repos/settings'
import { LANGUAGE_NAMES, modeNamespace } from '../i18n'
import { modes } from '../modes/registry'
import type { AnyStudyMode } from '../modes/types'
import { getPersistState, type PersistState } from '../services/storage-persist'
import { useSettings } from '../settings/context'
import { ACCENT_SWATCHES, ACCENTS } from '../settings/accents'
import { resolveTheme } from '../settings/boot'
import { FONT_SCALES, THEMES, UI_LANGUAGES } from '../settings/types'
import { useMediaQuery } from '../hooks/useMediaQuery'
import styles from './SettingsPage.module.css'

export function SettingsPage() {
  const { t } = useTranslation()
  const { settings, update } = useSettings()
  // 色見本は、いま表示しているテーマの色にする
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')
  const shownTheme = resolveTheme(settings.theme, prefersDark)
  const modesWithPanel = modes.filter((m) => m.SettingsPanel)

  return (
    <div className="stack">
      <h1 className="page-title">{t('settings.title')}</h1>

      <section className="panel stack">
        <SegmentedControl
          label={t('settings.language')}
          value={settings.uiLanguage}
          options={UI_LANGUAGES.map((lang) => ({
            value: lang,
            label: LANGUAGE_NAMES[lang],
            lang,
          }))}
          onChange={(uiLanguage) => update({ uiLanguage })}
        />
        <SegmentedControl
          label={t('settings.fontScale')}
          value={settings.fontScale}
          options={FONT_SCALES.map((s) => ({ value: s, label: t(`settings.fontScales.${s}`) }))}
          onChange={(fontScale) => update({ fontScale })}
        />
        <SegmentedControl
          label={t('settings.theme')}
          value={settings.theme}
          options={THEMES.map((th) => ({ value: th, label: t(`settings.themes.${th}`) }))}
          onChange={(theme) => update({ theme })}
        />
        {/* アクセントカラー（FR-SET-04） */}
        <SegmentedControl
          label={t('settings.accent')}
          value={settings.accent}
          options={ACCENTS.map((accent) => ({
            value: accent,
            label: t(`settings.accents.${accent}`),
            swatch: ACCENT_SWATCHES[accent][shownTheme],
          }))}
          onChange={(accent) => update({ accent })}
        />
      </section>

      {modesWithPanel.length > 0 && (
        <section className="stack">
          <h2 className="section-title">{t('settings.modeSettings')}</h2>
          {modesWithPanel.map((mode) => (
            <ModeSettings key={mode.id} mode={mode} />
          ))}
        </section>
      )}

      <section className="stack">
        <h2 className="section-title">{t('settings.data')}</h2>
        <StorageStatus />
        <Link to="/words" className="button button--block-sm">
          {t('settings.dataLink')}
          <ChevronRightIcon />
        </Link>
      </section>
    </div>
  )
}

/** データの保存の状態（FR-PWA-04） */
function StorageStatus() {
  const { t } = useTranslation()
  const [state, setState] = useState<PersistState | null>(null)

  useEffect(() => {
    let active = true
    void getPersistState().then((s) => {
      if (active) setState(s)
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className={`panel ${styles.storage}`} aria-busy={state === null}>
      <h3 className="section-title">{t('settings.storage')}</h3>
      {state === null ? (
        <p className="muted">{t('common.loading')}</p>
      ) : (
        <>
          <p data-state={state}>{t(`settings.storageStates.${state}`)}</p>
          {state !== 'persisted' && (
            <p className={`muted ${styles.hint}`}>{t('settings.storageHint')}</p>
          )}
        </>
      )}
    </div>
  )
}

function ModeSettings({ mode }: { mode: AnyStudyMode }) {
  const { t } = useTranslation(modeNamespace(mode.id))
  const { t: tc } = useTranslation()
  const store = useMemo(() => createModeSettingsStore(mode.id), [mode.id])
  const Panel = mode.SettingsPanel
  return (
    <div className="panel stack">
      <h3 className="section-title">{t(mode.titleKey)}</h3>
      <Suspense fallback={<p className="muted">{tc('common.loading')}</p>}>
        {Panel && <Panel settings={store} />}
      </Suspense>
    </div>
  )
}
