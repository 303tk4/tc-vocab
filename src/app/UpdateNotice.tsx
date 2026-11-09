import { useTranslation } from 'react-i18next'
import { useStudying } from './studyActivity'
import styles from './UpdateNotice.module.css'

type Props = {
  /** 新しいバージョンが待機しているか */
  needRefresh: boolean
  /** 新しいバージョンに切り替えて再読み込みする */
  onReload: () => void
  /** 今回は閉じる（次に起動したときに改めて通知する） */
  onDismiss: () => void
}

/** 「更新があります」の通知（FR-PWA-03）。学習セッション中は表示を保留する */
export function UpdateNotice({ needRefresh, onReload, onDismiss }: Props) {
  const { t } = useTranslation()
  const studying = useStudying()
  if (!needRefresh || studying) return null

  return (
    <>
      {/* 固定表示のバーがページの末尾を隠さないよう、同じ高さの余白を取る */}
      <div className={styles.spacer} aria-hidden="true" />
      <div className={styles.bar} role="status" aria-live="polite">
        <div className={styles.inner}>
          <p className={styles.text}>
            <strong>{t('update.title')}</strong>
            <span className={styles.body}>{t('update.body')}</span>
          </p>
          <div className={styles.actions}>
            <button type="button" className="button" onClick={onDismiss}>
              {t('update.later')}
            </button>
            <button type="button" className="button button--primary" onClick={onReload}>
              {t('update.reload')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
