// 学習モードのプラグイン仕様（仕様書 7.1）
import type { ComponentType, LazyExoticComponent } from 'react'
import type { ProgressStore } from '../db/repos/progress'
import type { ModeSettingsStore } from '../db/repos/settings'
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
  /** 単語のタグの読み書き（FR-PLUG-04・FR-FC-15） */
  tags: TagService
}

export interface TagService {
  /** 登録済みの全タグ（入力候補用） */
  list(): Promise<string[]>
  /** 1語のタグを置き換え、保存後のタグを返す */
  setWordTags(wordId: string, tags: string[]): Promise<string[]>
}

export interface SessionProps<O> {
  /** 準備画面の条件で絞り込んだ単語 */
  words: Word[]
  options: O
  /** このモード専用の進捗 API */
  progress: ProgressStore
  /** このモード専用の設定 API（キー mode.<modeId>.*。FR-PLUG-05） */
  modeSettings: ModeSettingsStore
  services: CoreServices
  onFinish(result: SessionResult): void
  onAbort(): void
}

export interface SettingsPanelProps {
  /** このモード専用の設定 API（FR-PLUG-05） */
  settings: ModeSettingsStore
}

export interface ResultProps {
  /** onFinish で渡した集計 */
  summary: Record<string, number>
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
  SettingsPanel?: Lazy<SettingsPanelProps>
  /** 結果画面の集計の表示（FR-PLUG-06）。省略時は summary をそのまま並べる */
  Result?: Lazy<ResultProps>
  locales: Record<UiLanguage, Record<string, unknown>>
  getBadge?(ctx: ModeContext): Promise<number | null>
}

/** レジストリでは型引数を消して扱う。モード定義ごとの型安全性は defineMode で確保する */
export type AnyStudyMode = StudyMode<unknown>

export function defineMode<O>(mode: StudyMode<O>): AnyStudyMode {
  return mode as unknown as AnyStudyMode
}
