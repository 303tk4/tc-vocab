import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { SpeakerIcon } from '../../components/icons'
import styles from './AutoSpeakField.module.css'

interface Props {
  checked: boolean
  /** 保存に失敗したか（NFR-07） */
  saveFailed: boolean
  onChange(checked: boolean): void
}

/**
 * 準備画面の「音声を自動で再生する」（FR-PLUG-09）。
 * 音を出せない場所で学習する利用者が見落とさないよう、枠で囲み、今の状態を文で添えて目立たせる
 */
export function AutoSpeakField({ checked, saveFailed, onChange }: Props) {
  const { t } = useTranslation()
  const id = useId()
  return (
    <div className={styles.field} data-checked={checked || undefined}>
      <label className={styles.label} htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          aria-describedby={`${id}-state`}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className={styles.icon}>
          <SpeakerIcon />
        </span>
        <span className={styles.text}>{t('mode.autoSpeak')}</span>
      </label>
      <p id={`${id}-state`} className={styles.state}>
        {checked ? t('mode.autoSpeakOn') : t('mode.autoSpeakOff')}
      </p>
      {saveFailed && (
        <p className={styles.invalid} role="alert">
          {t('mode.autoSpeakSaveFailed')}
        </p>
      )}
    </div>
  )
}
