import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { countWords } from '../db/repos/words'

// M1 の仮画面。M2 で一覧・インポート・エクスポートを実装する
export function WordsPage() {
  const { t } = useTranslation()
  const wordCount = useLiveQuery(countWords)
  return (
    <div className="stack">
      <h1 className="page-title">{t('words.title')}</h1>
      {wordCount !== undefined && <p>{t('home.wordCount', { count: wordCount })}</p>}
      <p className="muted">{t('words.comingSoon')}</p>
    </div>
  )
}
