import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { checkForUpdate } from '../../app/updateCheck'
import { useOnline } from '../../hooks/useOnline'
import styles from './UpdateCheck.module.css'

type State = 'idle' | 'checking' | 'latest' | 'available' | 'failed'

/** 「更新を確認」（FR-SET-15、仕様書 10.3）。押すとその場で新しい版を確かめる */
export function UpdateCheck() {
  const { t } = useTranslation()
  const online = useOnline()
  const [state, setState] = useState<State>('idle')

  const check = async () => {
    setState('checking')
    try {
      setState(await checkForUpdate())
    } catch {
      setState('failed')
    }
  }

  return (
    <div className={styles.root}>
      <button
        type="button"
        className="button button--block-sm"
        disabled={!online || state === 'checking'}
        onClick={() => void check()}
      >
        {state === 'checking' ? t('update.checking') : t('update.check')}
      </button>
      {!online && <p className={styles.hint}>{t('update.checkOffline')}</p>}
      {state === 'latest' && <p role="status">{t('update.latest')}</p>}
      {state === 'available' && <p role="status">{t('update.available')}</p>}
      {state === 'failed' && (
        <p className={styles.error} role="alert">
          {t('update.checkFailed')}
        </p>
      )}
      <p className={styles.hint}>{t('update.reopenNote')}</p>
    </div>
  )
}
