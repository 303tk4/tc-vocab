import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { detectCurrentInstallEnv, externalBrowserUrl, type InstallEnv } from '../app/installEnv'
import { promptInstall, useInstallPrompt } from '../app/installPrompt'
import styles from './InstallHelp.module.css'

interface Props {
  /** 環境を判定できないとき・ボタンから追加できないときの案内文（今の案内文） */
  fallback: string
  className?: string
  /** テスト用：環境を指定する（省略時は端末から判定する） */
  env?: InstallEnv
}

/**
 * ホーム画面への追加の手助け（FR-PWA-05、仕様書 12.1）。
 * 環境に応じて、追加のボタン・iPhone の手順・ブラウザで開き直す案内のどれかを示す。
 * 追加済みのアプリとして開いているときは何も示さない
 */
export function InstallHelp({ fallback, className, env: envProp }: Props) {
  const { t } = useTranslation()
  const env = useMemo(() => envProp ?? detectCurrentInstallEnv(), [envProp])
  const { canPrompt, installed } = useInstallPrompt()

  if (env === 'installed') return null

  const desktop = env === 'desktop'
  const rootClass = [styles.help, className].filter(Boolean).join(' ')

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
