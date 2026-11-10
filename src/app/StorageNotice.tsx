import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { dismissStorageNotice, useStorageNoticeVisible } from '../services/storage-notice'
import { useStudying } from './studyActivity'
import styles from './UpdateNotice.module.css'

/**
 * データが消えうることの知らせ（FR-PWA-06、仕様書 12.1）。更新の通知と同じ画面下部のバーで、1回だけ示す。
 * 学習セッション中は示さない。更新の通知が出ているときは、呼び出し側がこれを出さない
 */
export function StorageNotice() {
  const { t } = useTranslation()
  const visible = useStorageNoticeVisible()
  const studying = useStudying()
  const navigate = useNavigate()
  if (!visible || studying) return null

  const more = () => {
    dismissStorageNotice()
    void navigate('/settings', { state: { focus: 'storage' } })
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
            <button type="button" className="button button--primary" onClick={more}>
              {t('storageNotice.more')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
