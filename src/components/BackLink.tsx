import type { MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router'
import { BackIcon } from './icons'
import styles from './BackLink.module.css'

interface Props {
  /** アプリ内の履歴が無いとき（直接開いたときなど）の戻り先。1つ上の階層の画面 */
  fallback?: string
}

/**
 * 「← 戻る」（FR-NAV-01）。題名の左に置き、1つ前の画面に戻る。
 * アプリ内の履歴が無ければ、1つ上の階層（fallback。初期値はホーム）に移る
 */
export function BackLink({ fallback = '/' }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  // 'default' は、このタブでアプリを開いた最初の画面（戻る先がアプリ内に無い）
  const hasHistory = location.key !== 'default'

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!hasHistory) return // リンクのとおり fallback へ移る
    e.preventDefault()
    void navigate(-1)
  }

  return (
    <Link to={fallback} className={styles.link} onClick={onClick}>
      <BackIcon />
      <span>{t('nav.back')}</span>
    </Link>
  )
}
