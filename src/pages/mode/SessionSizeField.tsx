import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { SESSION_SIZE_MAX, SESSION_SIZE_MIN } from '../../modes/sessionSize'
import styles from './SessionSizeField.module.css'

interface Props {
  /** 入力中の文字 */
  value: string
  /** 入力が正しいか（1〜200 の整数） */
  valid: boolean
  /** 単位（例：「枚」「問」）。モードの文言 sessionSizeUnit */
  unit: string
  /** 保存に失敗したか（NFR-07） */
  saveFailed: boolean
  onChange(value: string): void
}

/** 準備画面の「一回の出題数」（FR-PLUG-08、仕様書 8.1 FR-FC-02） */
export function SessionSizeField({ value, valid, unit, saveFailed, onChange }: Props) {
  const { t } = useTranslation()
  const id = useId()
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {t('mode.sessionSize')}
      </label>
      <div className={styles.row}>
        <input
          id={id}
          className={styles.number}
          type="number"
          inputMode="numeric"
          min={SESSION_SIZE_MIN}
          max={SESSION_SIZE_MAX}
          step={1}
          value={value}
          aria-invalid={!valid}
          aria-describedby={`${id}-hint`}
          onChange={(e) => onChange(e.target.value)}
        />
        <span aria-hidden="true">{unit}</span>
      </div>
      <p id={`${id}-hint`} className={valid ? styles.hint : styles.invalid}>
        {valid ? t('mode.sessionSizeHint') : t('mode.sessionSizeInvalid')}
      </p>
      {saveFailed && (
        <p className={styles.invalid} role="alert">
          {t('mode.sessionSizeSaveFailed')}
        </p>
      )}
    </div>
  )
}
