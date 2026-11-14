import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { dismissStorageNotice, useStorageNoticeVisible } from '../services/storage-notice'
import { detectCurrentInstallEnv } from './installEnv'
import { promptInstall, useInstallPrompt } from './installPrompt'
import { useStudying } from './studyActivity'
import styles from './UpdateNotice.module.css'

/**
 * データが消えうることの知らせ（FR-PWA-06、仕様書 12.1）。更新の通知と同じ画面下部のバーで、1回だけ示す。
 * 学習セッション中は示さない。更新の通知が出ているときは、呼び出し側がこれを出さない。
 * ブラウザがその場で追加できると知らせているときは、「詳しく」の代わりに追加のボタンを置く（版 1.50）
 */
export function StorageNotice() {
  const { t } = useTranslation()
  const visible = useStorageNoticeVisible()
  const studying = useStudying()
  const navigate = useNavigate()
  const { canPrompt } = useInstallPrompt()
  const desktop = useMemo(() => detectCurrentInstallEnv() === 'desktop', [])
  if (!visible || studying) return null

  const more = () => {
    dismissStorageNotice()
    void navigate('/settings', { state: { focus: 'storage' } })
  }

  const install = () => {
    dismissStorageNotice()
    void promptInstall()
  }

  return (
    <>
      <div className={styles.spacer} aria-hidden="true" />
      <div className={styles.bar} role="status" aria-live="polite">
        <div className={styles.inner}>
          <p className={styles.text}>
            <strong>{t('storageNotice.title')}</strong>
            <span className={styles.body}>{t('storageNotice.body')}</span>
          </p>
          <div className={styles.actions}>
            <button type="button" className="button" onClick={dismissStorageNotice}>
              {t('common.close')}
            </button>
            {canPrompt ? (
              <button type="button" className="button button--primary" onClick={install}>
                {t(desktop ? 'install.buttonDesktop' : 'install.button')}
              </button>
            ) : (
              <button type="button" className="button button--primary" onClick={more}>
                {t('storageNotice.more')}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
