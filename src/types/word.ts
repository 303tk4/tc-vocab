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

/** 単語の内容（id と日時を除く）。単語の追加・編集で使う（FR-WORDS-15・16） */
export type WordContent = Pick<
  Word,
  'hanzi' | 'zhuyin' | 'pinyin' | 'meaning' | 'examples' | 'tags'
>

export interface Progress<S = unknown> {
  modeId: string
  wordId: string
  /** 次回出題日時（UNIX ミリ秒）。SRS を使わないモードは null */
  due: number | null
  state: S
  updatedAt: number
}

/** 単語以外の学習項目の進捗の ID の接頭辞（仕様書 6.2・FR-PLUG-07） */
export const ITEM_PROGRESS_PREFIX = 'item:'

/** 単語以外の学習項目の進捗の ID（例：item:conversation:r0002） */
export const itemProgressId = (modeId: string, itemId: string) =>
  `${ITEM_PROGRESS_PREFIX}${modeId}:${itemId}`

/** 単語以外の学習項目の進捗か（単語の削除や復元で捨てない。6.2・FR-SET-12） */
export const isItemProgressId = (wordId: string) => wordId.startsWith(ITEM_PROGRESS_PREFIX)

export interface SessionRecord {
  id?: number
  modeId: string
  startedAt: number
  finishedAt: number
  summary: Record<string, number>
}
