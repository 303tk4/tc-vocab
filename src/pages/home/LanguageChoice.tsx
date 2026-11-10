import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SegmentedControl } from '../../components/SegmentedControl'
import { getSetting, setSetting } from '../../db/repos/settings'
import { LANGUAGE_NAMES } from '../../i18n'
import { useSettings } from '../../settings/context'
import { SETTING_KEYS, UI_LANGUAGES, type UiLanguage } from '../../settings/types'
import styles from './LanguageChoice.module.css'

/**
 * 見出し。まだ言語を選んでいないので、UI 言語によらず3言語で示す（FR-HOME-07）。
 * 日本語以外の利用者が多くなる想定のため、English を先にする（版 1.45）
 */
const HEADING = [
  { lang: 'en', text: 'Display Language' },
  { lang: 'ja', text: 'アプリの表示言語' },
  { lang: 'zh-TW', text: '介面語言' },
] as const

/**
 * 選択肢の並び順。見出しと同じく English を先にし、残りは UI_LANGUAGES の順（日本語・繁體中文）。
 * 設定画面の並びとは別。UI 言語を足したら（仕様書 16.8）自動で加わる（版 1.45）
 */
const CHOICE_ORDER: readonly UiLanguage[] = ['en', ...UI_LANGUAGES.filter((lang) => lang !== 'en')]

/**
 * 初回起動時の言語の選択（FR-HOME-07、仕様書 4.3）。
 * 言語の設定が保存されていない間だけ、ホームの先頭に示す
 */
export function LanguageChoice() {
  const { t } = useTranslation()
  const { settings, update } = useSettings()
  // 保存済みの言語。読み込み中（undefined）と区別するため、未保存は null にする
  const stored = useLiveQuery(
    async () => (await getSetting<string>(SETTING_KEYS.uiLanguage)) ?? null,
  )
  // 選んだあとも、このホームの表示の間は開いたままにして、ほかの言語も試せるようにする
  const [keepOpen, setKeepOpen] = useState(false)
  const [failed, setFailed] = useState(false)

  if (stored === undefined || (stored !== null && !keepOpen)) return null

  const confirm = async () => {
    setFailed(false)
    if (stored === null) {
      try {
        // 選ばずに「決定」を押したら、いま表示している言語を保存する
        await setSetting(SETTING_KEYS.uiLanguage, settings.uiLanguage)
      } catch {
        // 保存に失敗したら知らせる（NFR-07）
        setFailed(true)
        return
      }
    }
    setKeepOpen(false)
  }

  const label = (
    <span className={styles.heading}>
      {HEADING.map((part, i) => (
        <span key={part.lang}>
          {i > 0 && <span aria-hidden="true"> · </span>}
          {/* 狭い画面でも、言語の途中では折り返さない */}
          <span lang={part.lang} className={styles.part}>
            {part.text}
          </span>
        </span>
      ))}
    </span>
  )

  return (
    <section className={`panel ${styles.card}`}>
      <SegmentedControl
        label={label}
        value={settings.uiLanguage}
        options={CHOICE_ORDER.map((lang) => ({ value: lang, label: LANGUAGE_NAMES[lang], lang }))}
        onChange={(uiLanguage) => {
          setKeepOpen(true)
          update({ uiLanguage })
        }}
      />
      {failed && (
        <p className={styles.error} role="alert">
          {t('install.hideFailed')}
        </p>
      )}
      <button
        type="button"
        className="button button--primary button--block-sm"
        onClick={() => void confirm()}
      >
        {t('home.languageConfirm')}
      </button>
    </section>
  )
}
