import { Suspense, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { ChevronRightIcon } from '../components/icons'
import { SegmentedControl } from '../components/SegmentedControl'
import { createModeSettingsStore } from '../db/repos/settings'
import { LANGUAGE_NAMES, modeNamespace } from '../i18n'
import { modes } from '../modes/registry'
import type { AnyStudyMode } from '../modes/types'
import { useSettings } from '../settings/context'
import { FONT_SCALES, THEMES, UI_LANGUAGES } from '../settings/types'

export function SettingsPage() {
  const { t } = useTranslation()
  const { settings, update } = useSettings()
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
      </section>

      {modesWithPanel.length > 0 && (
        <section className="stack">
          <h2 className="section-title">{t('settings.modeSettings')}</h2>
          {modesWithPanel.map((mode) => (
            <ModeSettings key={mode.id} mode={mode} />
          ))}
        </section>
      )}

      <section>
        <h2 className="section-title">{t('settings.data')}</h2>
        <Link to="/words" className="button button--block-sm">
          {t('settings.dataLink')}
          <ChevronRightIcon />
        </Link>
      </section>
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
