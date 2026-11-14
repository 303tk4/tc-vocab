import { lazy } from 'react'
import { CardsIcon } from '../../components/icons'
import { defineMode } from '../types'
import en from './locales/en.json'
import ja from './locales/ja.json'
import zhTW from './locales/zh-TW.json'
import type { FlashcardOptions } from './options'
import { DEFAULT_AUTO_SPEAK, DEFAULT_SESSION_SIZE } from './settings'

// 暗記カードモード（仕様書 8章）
export const flashcardMode = defineMode<FlashcardOptions>({
  id: 'flashcard',
  titleKey: 'title',
  descriptionKey: 'description',
  icon: CardsIcon,
  minWords: 1,
  requiredFields: ['hanzi', 'meaning'],
  defaultOptions: { direction: 'hanziToMeaning' },
  // 一回の出題数（FR-PLUG-08）。入力欄は準備画面の「学習を始める」の下にコアが置く
  sessionSize: { defaultValue: DEFAULT_SESSION_SIZE },
  // 音声の自動再生（FR-PLUG-09・FR-FC-14）。チェックボックスは「学習を始める」のすぐ下にコアが置く
  autoSpeak: { defaultValue: DEFAULT_AUTO_SPEAK },
  Setup: lazy(() => import('./Setup')),
  Session: lazy(() => import('./Session')),
  Result: lazy(() => import('./Result')),
  SettingsPanel: lazy(() => import('./SettingsPanel')),
  locales: { ja, 'zh-TW': zhTW, en },
  // ホームのバッジ：復習期限が来ている件数（FR-HOME-02、仕様書 8.1）
  async getBadge({ progress, now }) {
    const due = await progress.dueBefore(now)
    return due.length > 0 ? due.length : null
  },
})
