import { lazy } from 'react'
import { CardsIcon } from '../../components/icons'
import { defineMode } from '../types'
import en from './locales/en.json'
import ja from './locales/ja.json'
import zhTW from './locales/zh-TW.json'
import type { FlashcardOptions } from './options'

// 暗記カードモード（仕様書 8章）。M1 では骨組みのみで、学習処理は M3 で実装する
export const flashcardMode = defineMode<FlashcardOptions>({
  id: 'flashcard',
  titleKey: 'title',
  descriptionKey: 'description',
  icon: CardsIcon,
  minWords: 1,
  requiredFields: ['hanzi', 'meaning'],
  defaultOptions: { direction: 'hanziToMeaning' },
  Setup: lazy(() => import('./Setup')),
  Session: lazy(() => import('./Session')),
  locales: { ja, 'zh-TW': zhTW, en },
})
