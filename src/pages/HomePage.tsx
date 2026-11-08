import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { ChevronRightIcon } from '../components/icons'
import { countWords } from '../db/repos/words'
import { modeNamespace } from '../i18n'
import { modes } from '../modes/registry'
import type { AnyStudyMode } from '../modes/types'
import styles from './HomePage.module.css'

export function HomePage() {
  const { t } = useTranslation()
  const wordCount = useLiveQuery(countWords)

  return (
    <div className="stack">
      {wordCount === 0 && (
        <section className={`panel ${styles.empty}`} aria-labelledby="empty-title">
          <h2 id="empty-title" className="section-title">
            {t('home.emptyTitle')}
          </h2>
          <p>{t('home.emptyBody')}</p>
          <Link to="/words" className="button button--primary button--block-sm">
            {t('home.emptyAction')}
          </Link>
        </section>
      )}

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
    </div>
  )
}

function ModeCard({ mode, wordCount }: { mode: AnyStudyMode; wordCount: number }) {
  const { t } = useTranslation(modeNamespace(mode.id))
  const { t: tc } = useTranslation()
  const minWords = mode.minWords ?? 1
  const available = wordCount >= minWords
  const Icon = mode.icon

  const body = (
    <>
      <span className={styles.icon}>
        <Icon />
      </span>
      <span className={styles.text}>
        <span className={styles.title}>{t(mode.titleKey)}</span>
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
