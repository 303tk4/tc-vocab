// 学習モードのプラグイン仕様（仕様書 7.1）
import type { ComponentType, LazyExoticComponent } from 'react'
import type { ProgressStore } from '../db/repos/progress'
import type { AppSettings, UiLanguage } from '../settings/types'
import type { Word } from '../types/word'

type Lazy<P> = LazyExoticComponent<ComponentType<P>>

export interface SetupProps<O> {
  options: O
  onChange(options: O): void
}

export interface SessionResult {
  /** モード固有の集計（例: 評価ごとの件数）。セッション履歴に保存する */
  summary: Record<string, number>
}

export interface CoreServices {
  /** 読み上げ（zh-TW） */
  speak(text: string): void
  /** 読み上げに対応しているか */
  canSpeak: boolean
  /** 共通設定（参照のみ） */
  settings: AppSettings
}

export interface SessionProps<O> {
  /** 準備画面の条件で絞り込んだ単語 */
  words: Word[]
  options: O
  /** このモード専用の進捗 API */
  progress: ProgressStore
  services: CoreServices
  onFinish(result: SessionResult): void
  onAbort(): void
}

export interface ModeContext {
  wordCount: number
  progress: ProgressStore
  now: number
}

export interface StudyMode<O = unknown> {
  /** 一意な ID。進捗の保存キーにもなるため変更しない */
  id: string
  /** モード名の i18n キー（名前空間 mode.<id> 内） */
  titleKey: string
  /** 説明文の i18n キー（名前空間 mode.<id> 内） */
  descriptionKey: string
  icon: ComponentType
  /** 開始に必要な最少単語数（既定 1） */
  minWords?: number
  /** 出題対象とする単語に必須の項目 */
  requiredFields?: (keyof Word)[]
  /** 準備画面のオプション初期値 */
  defaultOptions: O
  Setup?: Lazy<SetupProps<O>>
  Session: Lazy<SessionProps<O>>
  /** 設定画面に表示するモード別設定 */
  SettingsPanel?: Lazy<object>
  locales: Record<UiLanguage, Record<string, unknown>>
  getBadge?(ctx: ModeContext): Promise<number | null>
}

/** レジストリでは型引数を消して扱う。モード定義ごとの型安全性は defineMode で確保する */
export type AnyStudyMode = StudyMode<unknown>

export function defineMode<O>(mode: StudyMode<O>): AnyStudyMode {
  return mode as unknown as AnyStudyMode
}
