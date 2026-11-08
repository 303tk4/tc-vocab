// 仕様書 6.1〜6.3

export interface Example {
  /** 例文（繁体字） */
  text: string
  /** 例文の訳 */
  translation?: string
}

export interface Word {
  /** UUID */
  id: string
  /** 繁体字 */
  hanzi: string
  /** 注音。音節は半角スペース区切り */
  zhuyin: string
  /** 拼音（声調記号付き）。音節は半角スペース区切り */
  pinyin: string
  /** 意味 */
  meaning: string
  examples: Example[]
  tags: string[]
  createdAt: number
  updatedAt: number
}

export interface Progress<S = unknown> {
  modeId: string
  wordId: string
  /** 次回出題日時（UNIX ミリ秒）。SRS を使わないモードは null */
  due: number | null
  state: S
  updatedAt: number
}

export interface SessionRecord {
  id?: number
  modeId: string
  startedAt: number
  finishedAt: number
  summary: Record<string, number>
}
