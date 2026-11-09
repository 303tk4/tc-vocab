import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { detectCurrentInstallEnv, externalBrowserUrl, type InstallEnv } from '../app/installEnv'
import { promptInstall, useInstallPrompt } from '../app/installPrompt'
import styles from './InstallHelp.module.css'

interface Props {
  /** 環境を判定できないとき・ボタンから追加できないときの案内文（今の案内文） */
  fallback: string
  className?: string
  /** 環境を指定する（省略時は端末から判定する。テストや、判定済みの画面で使う） */
  env?: InstallEnv
  /** 追加済みのアプリとして開いているときに、その旨を示す（設定画面。版 1.19） */
  showInstalled?: boolean
}

/**
 * ホーム画面への追加の手助け（FR-PWA-05、仕様書 12.1）。
 * 環境に応じて、追加のボタン・iPhone の手順・ブラウザで開き直す案内のどれかを示す。
 * 追加済みのアプリとして開いているときは、showInstalled のときだけその旨を示す
 */
export function InstallHelp({ fallback, className, env: envProp, showInstalled }: Props) {
  const { t } = useTranslation()
  const env = useMemo(() => envProp ?? detectCurrentInstallEnv(), [envProp])
  const { canPrompt, installed } = useInstallPrompt()
  const rootClass = [styles.help, className].filter(Boolean).join(' ')

  if (env === 'installed') {
    return showInstalled ? (
      <div className={rootClass}>
        <p className={styles.text}>{t('install.installed')}</p>
      </div>
    ) : null
  }

  const desktop = env === 'desktop'

  if (installed) {
    return (
      <div className={rootClass} role="status">
        <p className={styles.text}>{t(desktop ? 'install.doneDesktop' : 'install.done')}</p>
      </div>
    )
  }

  if (env === 'ios') {
    return (
      <div className={rootClass}>
        <p className={styles.text}>{t('install.ios')}</p>
      </div>
    )
  }

  if (env === 'line') {
    return (
      <div className={rootClass}>
        <p className={styles.text}>{t('install.line')}</p>
        <a className="button button--block-sm" href={externalBrowserUrl(window.location.href)}>
          {t('install.lineLink')}
        </a>
      </div>
    )
  }

  if (env === 'in-app') {
    return (
      <div className={rootClass}>
        <p className={styles.text}>{t('install.inApp')}</p>
      </div>
    )
  }

  // Android・パソコンなど：ブラウザが追加できると知らせたときだけボタンを示す
  if (canPrompt) {
    return (
      <div className={rootClass}>
        <p className={styles.text}>{t(desktop ? 'install.promptDesktop' : 'install.prompt')}</p>
        <button
          type="button"
          className="button button--block-sm"
          onClick={() => void promptInstall()}
        >
          {t(desktop ? 'install.buttonDesktop' : 'install.button')}
        </button>
      </div>
    )
  }

  return (
    <div className={rootClass}>
      <p className={styles.text}>{fallback}</p>
    </div>
  )
}
