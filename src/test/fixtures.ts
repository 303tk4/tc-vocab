import type { Word } from '../types/word'

let seq = 0

/** テスト用の単語を作る */
export function makeWord(overrides: Partial<Word> = {}): Word {
  seq++
  return {
    id: `w${seq}`,
    hanzi: `字${seq}`,
    zhuyin: '',
    pinyin: `zi${seq}`,
    meaning: `意味${seq}`,
    examples: [],
    tags: [],
    createdAt: 1_700_000_000_000 + seq,
    updatedAt: 1_700_000_000_000 + seq,
    ...overrides,
  }
}

export const jieyun: Word = {
  id: 'jieyun',
  hanzi: '捷運',
  zhuyin: 'ㄐㄧㄝˊ ㄩㄣˋ',
  pinyin: 'jié yùn',
  meaning: 'MRT（都市鉄道）',
  examples: [{ text: '我每天坐捷運去公司。', translation: '毎日MRTで会社に行きます。' }],
  tags: ['交通'],
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_100_000,
}

/** CSV で扱いにくい値（カンマ・引用符・改行）を含む単語 */
export const tricky: Word = {
  id: 'tricky',
  hanzi: '說',
  zhuyin: 'ㄕㄨㄛ',
  pinyin: 'shuō',
  meaning: '言う, 話す "say"\n2行目',
  examples: [{ text: '他說：「好，我來。」' }],
  tags: ['動詞', 'tag with space'],
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
}
