import { useTranslation } from 'react-i18next'
import { REVIEW_READING_TAG } from '../io/reviewReading'
import styles from './ReviewReadingNote.module.css'

/**
 * `要確認:読み` タグの意味と対処の説明（FR-WORDS-14）。
 * count を渡すと、取り込む単語のうち何語に付くかも示す（プレビュー用）
 */
export function ReviewReadingNote({ count }: { count?: number }) {
  const { t } = useTranslation()
  return (
    <div className={styles.note}>
      <p className={styles.title}>
        {count === undefined
          ? t('reviewReading.title', { tag: REVIEW_READING_TAG })
          : t('reviewReading.titleCount', { tag: REVIEW_READING_TAG, count })}
      </p>
      <p>{t('reviewReading.body')}</p>
      <p>{t('reviewReading.fix')}</p>
    </div>
  )
}
