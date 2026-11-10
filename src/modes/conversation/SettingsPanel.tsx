// 場面別会話のモード別設定（仕様書 10.2）。変更は即座に保存する
import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SettingsPanelProps } from '../types'
import {
  loadSettings,
  NEW_PER_DAY_MAX,
  NEW_PER_DAY_MIN,
  parseNewPerDay,
  SETTING_KEYS,
  type ConversationSettings,
} from './settings'
import styles from './SettingsPanel.module.css'

type ToggleKey = 'showZhuyin' | 'showPinyin' | 'audioOnly' | 'showBackground'
const TOGGLES: ToggleKey[] = ['showZhuyin', 'showPinyin', 'audioOnly', 'showBackground']

export default function ConversationSettingsPanel({ settings: store }: SettingsPanelProps) {
  const { t } = useTranslation('mode.conversation')
  const { t: tc } = useTranslation()
  const id = useId()
  const [values, setValues] = useState<ConversationSettings | null>(null)
  const [draft, setDraft] = useState('')
  const [saveFailed, setSaveFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadSettings(store)
      .then((loaded) => {
        if (cancelled) return
        setValues(loaded)
        setDraft(String(loaded.newPerDay))
      })
      .catch((error: unknown) => console.error('設定の読み込みに失敗しました', error))
    return () => {
      cancelled = true
    }
  }, [store])

  if (!values) return <p className="muted">{tc('common.loading')}</p>

  const save = <K extends keyof ConversationSettings>(key: K, value: ConversationSettings[K]) => {
    setValues({ ...values, [key]: value })
    store.set(SETTING_KEYS[key], value).then(
      () => setSaveFailed(false),
      (error: unknown) => {
        console.error('設定の保存に失敗しました', error)
        setSaveFailed(true)
      },
    )
  }

  const parsed = parseNewPerDay(draft)
  const changeDraft = (text: string) => {
    setDraft(text)
    const n = parseNewPerDay(text)
    if (n !== null && n !== values.newPerDay) save('newPerDay', n)
  }

  return (
    <div className="stack">
      <div className={styles.field}>
        <label htmlFor={`${id}-new`} className={styles.label}>
          {t('settings.newPerDay')}
        </label>
        <input
          id={`${id}-new`}
          className={styles.number}
          type="number"
          inputMode="numeric"
          min={NEW_PER_DAY_MIN}
          max={NEW_PER_DAY_MAX}
          step={1}
          value={draft}
          aria-invalid={parsed === null}
          aria-describedby={`${id}-new-hint`}
          onChange={(e) => changeDraft(e.target.value)}
          // 不正な値のまま離れたら、保存済みの値に戻す
          onBlur={() => parsed === null && setDraft(String(values.newPerDay))}
        />
        <p id={`${id}-new-hint`} className={parsed === null ? styles.invalid : styles.hint}>
          {parsed === null ? t('settings.newPerDayInvalid') : t('settings.newPerDayHint')}
        </p>
      </div>

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

      {/* 訓練の言語は準備画面で選ぶ（FR-CONV-05） */}
      <p className={styles.hint}>{t('settings.languageNote')}</p>

      {saveFailed && (
        <p className={styles.invalid} role="alert">
          {t('settings.saveFailed')}
        </p>
      )}
    </div>
  )
}
