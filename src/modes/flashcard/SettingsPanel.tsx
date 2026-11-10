// 暗記カードのモード別設定（仕様書 10.2）。変更は即座に保存する
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SettingsPanelProps } from '../types'
import { loadSettings, SETTING_KEYS, type FlashcardSettings } from './settings'
import styles from './SettingsPanel.module.css'

type ToggleKey = 'showZhuyin' | 'showPinyin' | 'autoSpeak'
const TOGGLES: ToggleKey[] = ['showZhuyin', 'showPinyin', 'autoSpeak']

export default function FlashcardSettingsPanel({ settings: store }: SettingsPanelProps) {
  const { t } = useTranslation('mode.flashcard')
  const { t: tc } = useTranslation()
  const [values, setValues] = useState<FlashcardSettings | null>(null)
  const [saveFailed, setSaveFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadSettings(store)
      .then((loaded) => {
        if (!cancelled) setValues(loaded)
      })
      .catch((error: unknown) => console.error('設定の読み込みに失敗しました', error))
    return () => {
      cancelled = true
    }
  }, [store])

  if (!values) return <p className="muted">{tc('common.loading')}</p>

  const save = <K extends keyof FlashcardSettings>(key: K, value: FlashcardSettings[K]) => {
    setValues({ ...values, [key]: value })
    store.set(SETTING_KEYS[key], value).then(
      () => setSaveFailed(false),
      (error: unknown) => {
        console.error('設定の保存に失敗しました', error)
        setSaveFailed(true)
      },
    )
  }

  return (
    <div className="stack">
      {TOGGLES.map((key) => (
        <label key={key} className={styles.toggle}>
          <input
            type="checkbox"
            checked={values[key]}
            onChange={(e) => save(key, e.target.checked)}
          />
          <span>{t(`settings.${key}`)}</span>
        </label>
      ))}

      {saveFailed && (
        <p className={styles.invalid} role="alert">
          {t('settings.saveFailed')}
        </p>
      )}
    </div>
  )
}
