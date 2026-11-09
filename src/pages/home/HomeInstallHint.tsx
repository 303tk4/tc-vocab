import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  canHideHomeInstallHint,
  detectCurrentInstallEnv,
  INSTALL_HINT_HIDDEN_KEY,
  showHomeInstallHint,
  type InstallEnv,
} from '../../app/installEnv'
import { useInstallPrompt } from '../../app/installPrompt'
import { InstallHelp } from '../../components/InstallHelp'
import { getSetting, setSetting } from '../../db/repos/settings'
import styles from './HomeInstallHint.module.css'

interface Props {
  /** 環境を指定する（省略時は端末から判定する。テスト用） */
  env?: InstallEnv
}

/**
 * 単語が1語以上あるときの、ホームの下部での追加の案内（FR-PWA-05、仕様書 12.1 の補足（版 1.19））。
 * iPhone・iPad と、追加できると知らされた Android では「今後表示しない」が押されるまで毎回、
 * アプリの中では毎回示す
 */
export function HomeInstallHint({ env: envProp }: Props) {
  const { t } = useTranslation()
  const env = useMemo(() => envProp ?? detectCurrentInstallEnv(), [envProp])
  // 読み込み中は undefined。読み終えるまでは出さない（ちらつきを防ぐ）
  const hidden = useLiveQuery(
    async () => (await getSetting<boolean>(INSTALL_HINT_HIDDEN_KEY)) === true,
  )
  const { canPrompt, installed } = useInstallPrompt()
  const [failed, setFailed] = useState(false)

  // 追加し終えた直後は、その旨を示すために残す
  if (hidden === undefined || !showHomeInstallHint(env, hidden, canPrompt || installed)) {
    return null
  }

  const hide = async () => {
    setFailed(false)
    try {
      await setSetting(INSTALL_HINT_HIDDEN_KEY, true)
    } catch {
      // 保存に失敗したら知らせる（NFR-07）
      setFailed(true)
    }
  }

  return (
    <section className={`panel ${styles.hint}`} aria-label={t('install.title')}>
      <InstallHelp env={env} fallback="" />
      {failed && (
        <p className={styles.error} role="alert">
          {t('install.hideFailed')}
        </p>
      )}
      {canHideHomeInstallHint(env) && !installed && (
        <button type="button" className="button button--block-sm" onClick={() => void hide()}>
          {t('install.hide')}
        </button>
      )}
    </section>
  )
}
