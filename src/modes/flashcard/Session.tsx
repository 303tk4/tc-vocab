import { useTranslation } from 'react-i18next'
import type { SessionProps } from '../types'
import type { FlashcardOptions } from './options'

// M1 の仮実装。M3 でカード表示・評価・SRS を実装する
export default function FlashcardSession({ words, onFinish }: SessionProps<FlashcardOptions>) {
  const { t } = useTranslation('mode.flashcard')
  return (
    <div className="stack">
      <p>{t('comingSoon')}</p>
      <p className="muted">{words.length}</p>
      <button type="button" className="button" onClick={() => onFinish({ summary: {} })}>
        {t('finish')}
      </button>
    </div>
  )
}
