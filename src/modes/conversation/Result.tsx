// 場面別会話の結果画面の集計（仕様書 18.4 FR-CONV-21。暗記カードの FR-FC-40 と同じ項目）
import { useTranslation } from 'react-i18next'
import type { ResultProps } from '../types'
import { RATINGS } from '../shared/srs'
import styles from './Result.module.css'

export default function ConversationResult({ summary }: ResultProps) {
  const { t } = useTranslation('mode.conversation')
  const seconds = summary.durationSec ?? 0
  const m = Math.floor(seconds / 60)
  const s = seconds % 60

  return (
    <div className="stack">
      <dl className={styles.main}>
        <div>
          <dt>{t('summary.studied')}</dt>
          <dd>{t('result.items', { count: summary.studied ?? 0 })}</dd>
        </div>
        <div>
          <dt>{t('summary.durationSec')}</dt>
          <dd>{m > 0 ? t('result.minSec', { m, s }) : t('result.sec', { s })}</dd>
        </div>
        {summary.dueTomorrow !== undefined && (
          <div>
            <dt>{t('summary.dueTomorrow')}</dt>
            <dd>{t('result.items', { count: summary.dueTomorrow })}</dd>
          </div>
        )}
      </dl>
      <section>
        <h3 className={styles.subtitle}>{t('result.ratings')}</h3>
        <dl className={styles.ratings}>
          {RATINGS.map((rating) => (
            <div key={rating}>
              <dt>{t(`summary.${rating}`)}</dt>
              <dd>{t('result.times', { count: summary[rating] ?? 0 })}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
