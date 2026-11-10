import { lazy } from 'react'
import { ChatIcon } from '../../components/icons'
import { defineMode } from '../types'
import en from './locales/en.json'
import ja from './locales/ja.json'
import zhTW from './locales/zh-TW.json'
import { MODE_ID } from './modeId'
import { DEFAULT_OPTIONS, type ConversationOptions } from './options'
import { DEFAULT_SESSION_SIZE } from './settings'

// 場面別会話モード（仕様書 18章）。単語ではなく、モードが持つ場面のデータを出題する（FR-PLUG-07）
export const conversationMode = defineMode<ConversationOptions>({
  id: MODE_ID,
  titleKey: 'title',
  descriptionKey: 'description',
  icon: ChatIcon,
  usesWords: false,
  defaultOptions: DEFAULT_OPTIONS,
  // 一回の出題数（FR-PLUG-08）。入力欄は準備画面の「学習を始める」の下にコアが置く
  sessionSize: { defaultValue: DEFAULT_SESSION_SIZE },
  Setup: lazy(() => import('./Setup')),
  Session: lazy(() => import('./Session')),
  Result: lazy(() => import('./Result')),
  SettingsPanel: lazy(() => import('./SettingsPanel')),
  locales: { ja, 'zh-TW': zhTW, en },
  // ホームのバッジ：復習期限が来ている項目の件数（FR-CONV-04）
  async getBadge({ progress, now }) {
    const due = await progress.dueBefore(now)
    return due.length > 0 ? due.length : null
  },
})
