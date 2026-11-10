// 場面別会話の準備画面のオプション（仕様書 18.1 FR-CONV-01、18.2 FR-CONV-05）
import type { KindFilter } from './scenes'

export const KIND_FILTERS = ['both', 'respond', 'say'] as const satisfies readonly KindFilter[]

export interface ConversationOptions {
  /**
   * 訓練の言語。null は未選択（初期値の決め方は FR-CONV-06）。
   * 準備画面の条件として保存し、次回の初期値にする（FR-MODE-02）
   */
  language: string | null
  /** 選んだ場面の ID。空はすべての場面 */
  scenes: string[]
  kinds: KindFilter
}

export const DEFAULT_OPTIONS: ConversationOptions = { language: null, scenes: [], kinds: 'both' }

/** 保存値を検証し、不正な値は初期値で補う */
export function sanitizeOptions(raw: unknown): ConversationOptions {
  const o = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  return {
    language: typeof o.language === 'string' && o.language !== '' ? o.language : null,
    scenes: Array.isArray(o.scenes)
      ? o.scenes.filter((s): s is string => typeof s === 'string')
      : [],
    kinds: KIND_FILTERS.includes(o.kinds as KindFilter) ? (o.kinds as KindFilter) : 'both',
  }
}
