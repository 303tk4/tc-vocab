import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'
import { BackLink } from '../components/BackLink'
import { ChevronRightIcon, ExternalLinkIcon } from '../components/icons'
import { InstallHelp } from '../components/InstallHelp'
import { SegmentedControl } from '../components/SegmentedControl'
import { createModeSettingsStore } from '../db/repos/settings'
import { LANGUAGE_NAMES, modeNamespace } from '../i18n'
import { modes } from '../modes/registry'
import type { AnyStudyMode } from '../modes/types'
import { buildFeedbackUrl, FEEDBACK_FORM } from '../services/feedback'
import { COPYRIGHT, REPO_URL } from '../services/licenses'
import { getPersistState, type PersistState } from '../services/storage-persist'
import { useSettings } from '../settings/context'
import { ACCENT_SWATCHES, ACCENTS } from '../settings/accents'
import { resolveTheme } from '../settings/boot'
import { FONT_SCALES, THEMES, UI_LANGUAGES } from '../settings/types'
import { useMediaQuery } from '../hooks/useMediaQuery'
import styles from './SettingsPage.module.css'
import { useOnline } from '../hooks/useOnline'
import { usePageTitle } from '../hooks/usePageTitle'
import { BackupPanel } from './settings/BackupPanel'
import { SourcesDialog } from './settings/SourcesDialog'
import { UpdateCheck } from './settings/UpdateCheck'
import { canCheckForUpdate } from '../app/updateCheck'

export function SettingsPage() {
  const { t } = useTranslation()
  const { settings, update } = useSettings()
  usePageTitle(t('settings.title'))
  // 色見本は、いま表示しているテーマの色にする
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')
  const shownTheme = resolveTheme(settings.theme, prefersDark)
  const modesWithPanel = modes.filter((m) => m.SettingsPanel)

  return (
    <div className="stack">
      <div className="title-row">
        <BackLink />
        <h1 className="page-title">{t('settings.title')}</h1>
      </div>

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
        {/* ボタンなどの色（アクセントカラー。FR-SET-04） */}
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
        {/* バックアップと初期化（仕様書 10.4、FR-SET-11〜13） */}
        <BackupPanel />
        <Link to="/words" className="button button--block-sm">
          {t('settings.dataLink')}
          <ChevronRightIcon />
        </Link>
      </section>

      <About />
    </div>
  )
}

/**
 * このアプリについて（仕様書 10.3）：版の表示（FR-SET-06）、開発者へのフィードバック（FR-SET-05）、
 * 著作権とライセンス（FR-SET-07）、出典とライセンス（FR-SET-08）、免責（FR-SET-09）、データの扱い（FR-SET-10）
 */
function About() {
  const { t, i18n } = useTranslation()
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const feedbackUrl = buildFeedbackUrl(FEEDBACK_FORM, {
    version: __APP_VERSION__,
    language: i18n.language,
  })

  return (
    <section className="stack" aria-labelledby="about-title">
      <h2 id="about-title" className="section-title">
        {t('settings.about')}
      </h2>
      <div className={`panel stack ${styles.about}`}>
        <p className={styles.version}>{t('settings.version', { version: __APP_VERSION__ })}</p>
        {/* 更新を確認（FR-SET-15） */}
        {canCheckForUpdate() && <UpdateCheck />}
        {feedbackUrl && (
          <div className={styles.feedback}>
            <h3 className="section-title">{t('settings.feedback')}</h3>
            <p>{t('settings.feedbackBody')}</p>
            <ExternalButton href={feedbackUrl}>{t('settings.feedbackLink')}</ExternalButton>
            <p className={`muted ${styles.hint}`}>{t('settings.feedbackNote')}</p>
          </div>
        )}
        {/* 著作権とライセンス（FR-SET-07）、出典とライセンス（FR-SET-08） */}
        <div className={styles.feedback}>
          <h3 className="section-title">{t('about.rightsTitle')}</h3>
          <p>{COPYRIGHT}</p>
          <p>{t('about.codeLicense')}</p>
          <ExternalButton href={REPO_URL}>{t('about.sourceCodeLink')}</ExternalButton>
          <button
            type="button"
            className="button button--block-sm"
            onClick={() => setSourcesOpen(true)}
          >
            {t('about.sourcesTitle')}
          </button>
        </div>
        {/* 免責（FR-SET-09） */}
        <div className={styles.feedback}>
          <h3 className="section-title">{t('about.disclaimerTitle')}</h3>
          <p>{t('about.disclaimerBody')}</p>
        </div>
        {/* データの扱い（FR-SET-10、NFR-06） */}
        <div className={styles.feedback}>
          <h3 className="section-title">{t('about.privacyTitle')}</h3>
          <p>{t('about.privacyBody')}</p>
        </div>
      </div>
      <SourcesDialog open={sourcesOpen} onClose={() => setSourcesOpen(false)} />
    </section>
  )
}

/** 新しいタブで開く外部のリンク。オフラインでは開けないため、押せない状態にする（仕様書 10.3） */
function ExternalButton({ href, children }: { href: string; children: string }) {
  const { t } = useTranslation()
  const online = useOnline()
  if (!online) {
    return (
      <>
        <button type="button" className="button button--block-sm" disabled>
          {children}
          <ExternalLinkIcon />
        </button>
        <p className={`muted ${styles.hint}`}>{t('settings.feedbackOffline')}</p>
      </>
    )
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="button button--block-sm">
      {children}
      <span className="visually-hidden">{t('settings.newTab')}</span>
      <ExternalLinkIcon />
    </a>
  )
}

/** データの保存の状態（FR-PWA-04） */
function StorageStatus() {
  const { t } = useTranslation()
  const [state, setState] = useState<PersistState | null>(null)
  const location = useLocation()
  const ref = useRef<HTMLDivElement>(null)

  // データが消えうることの知らせ（FR-PWA-06）の「詳しく」から開いたときは、この欄を示す
  useEffect(() => {
    if ((location.state as { focus?: string } | null)?.focus === 'storage') {
      ref.current?.scrollIntoView({ block: 'start' })
      ref.current?.focus()
    }
  }, [location.state])

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
    <div ref={ref} tabIndex={-1} className={`panel ${styles.storage}`} aria-busy={state === null}>
      <h3 className="section-title">{t('settings.storage')}</h3>
      {state === null ? (
        <p className="muted">{t('common.loading')}</p>
      ) : (
        <>
          <p data-state={state}>{t(`settings.storageStates.${state}`)}</p>
          {/* ホーム画面への追加の手助け（FR-PWA-05）。追加済みのアプリでは、その旨を示す（版 1.19） */}
          <InstallHelp
            className={`muted ${styles.hint}`}
            fallback={t('settings.storageHint')}
            showInstalled
          />
          {state !== 'persisted' && (
            <p className={`muted ${styles.hint}`}>{t('settings.exportHint')}</p>
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
