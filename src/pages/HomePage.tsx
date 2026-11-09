import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { ChevronRightIcon } from '../components/icons'
import { InstallHelp } from '../components/InstallHelp'
import { createProgressStore } from '../db/repos/progress'
import { countWords } from '../db/repos/words'
import { modeNamespace } from '../i18n'
import { modes } from '../modes/registry'
import type { AnyStudyMode } from '../modes/types'
import { HomeInstallHint } from './home/HomeInstallHint'
import styles from './HomePage.module.css'

export function HomePage() {
  const { t } = useTranslation()
  const wordCount = useLiveQuery(countWords)

  return (
    <div className="stack">
      {wordCount === 0 && <EmptyState />}

      <section aria-labelledby="modes-title">
        <div className={styles.heading}>
          <h1 id="modes-title" className="page-title">
            {t('home.title')}
          </h1>
          {wordCount !== undefined && (
            <p className="muted">{t('home.wordCount', { count: wordCount })}</p>
          )}
        </div>
        <ul className={styles.grid}>
          {modes.map((mode) => (
            <li key={mode.id}>
              <ModeCard mode={mode} wordCount={wordCount ?? 0} />
            </li>
          ))}
        </ul>
      </section>

      {/* 単語があるときの、ホーム画面への追加の案内（FR-PWA-05、版 1.19） */}
      {wordCount !== undefined && wordCount > 0 && <HomeInstallHint />}
    </div>
  )
}

/**
 * 単語が0件のときの最初の案内（FR-HOME-05・FR-SMP-03、仕様書 16.5 の「最初の案内」）。
 * (1) 単語パッケージを選ぶ (2) サンプル単語を追加 (3) 自分のファイルをインポート
 */
function EmptyState() {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const add = async () => {
    setBusy(true)
    setFailed(false)
    try {
      // 取り込み処理は大きいため、押されたときに読み込む
      const { addSampleWords } = await import('../services/samples')
      await addSampleWords()
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={`panel ${styles.empty}`} aria-labelledby="empty-title">
      <h2 id="empty-title" className="section-title">
        {t('home.emptyTitle')}
      </h2>
      <p>{t('home.emptyBody')}</p>
      <p className={styles.packsNote}>{t('home.packsNote')}</p>
      {failed && (
        <p className={styles.reason} role="alert">
          {t('home.samplesFailed')}
        </p>
      )}
      <div className={styles.emptyActions}>
        <Link to="/words?open=packs" className="button button--primary button--block-sm">
          {t('home.choosePacks')}
        </Link>
        <button
          type="button"
          className="button button--block-sm"
          disabled={busy}
          onClick={() => void add()}
        >
          {busy ? t('home.addingSamples') : t('home.addSamples')}
        </button>
        <Link to="/words?open=import" className="button button--block-sm">
          {t('home.emptyAction')}
        </Link>
      </div>
      {/* データが残りにくい環境への注意（FR-PWA-04） */}
      <p className={styles.note}>{t('home.emptyNote')}</p>
      {/* 対策の段落。環境に応じて追加のボタンや手順を示す（FR-PWA-05） */}
      <InstallHelp className={styles.fix} fallback={t('home.emptyNoteFix')} />
    </section>
  )
}

function ModeCard({ mode, wordCount }: { mode: AnyStudyMode; wordCount: number }) {
  const { t } = useTranslation(modeNamespace(mode.id))
  const { t: tc } = useTranslation()
  const minWords = mode.minWords ?? 1
  const available = wordCount >= minWords
  const Icon = mode.icon
  // モードが提供するバッジ（例：暗記カードの復習待ち件数。FR-HOME-02）
  const badge = useLiveQuery(
    async () =>
      available && mode.getBadge
        ? mode.getBadge({ wordCount, progress: createProgressStore(mode.id), now: Date.now() })
        : null,
    [mode, wordCount, available],
  )

  const body = (
    <>
      <span className={styles.icon}>
        <Icon />
      </span>
      <span className={styles.text}>
        <span className={styles.titleRow}>
          <span className={styles.title}>{t(mode.titleKey)}</span>
          {typeof badge === 'number' && (
            <span className={styles.badge}>{tc('home.badge', { count: badge })}</span>
          )}
        </span>
        <span className={styles.description}>{t(mode.descriptionKey)}</span>
        {!available && (
          <span className={styles.reason}>{tc('home.needWords', { count: minWords })}</span>
        )}
      </span>
      {available && (
        <span className={styles.chevron}>
          <ChevronRightIcon />
        </span>
      )}
    </>
  )

  return available ? (
    <Link to={`/mode/${mode.id}`} className={styles.card}>
      {body}
    </Link>
  ) : (
    <div className={`${styles.card} ${styles.disabled}`} aria-disabled="true">
      {body}
    </div>
  )
}
