import Dexie, { type EntityTable, type Table } from 'dexie'
import type { Progress, SessionRecord, Word } from '../types/word'

export interface SettingRow {
  key: string
  value: unknown
}

// 仕様書 6.5。スキーマを変えるときは version を上げて upgrade() で移行する
export class TcVocabDB extends Dexie {
  words!: EntityTable<Word, 'id'>
  progress!: Table<Progress, [string, string]>
  sessions!: EntityTable<SessionRecord, 'id'>
  settings!: EntityTable<SettingRow, 'key'>

  constructor(name = 'tc-vocab') {
    super(name)
    this.version(1).stores({
      words: 'id, hanzi, pinyin, *tags, updatedAt',
      progress: '[modeId+wordId], modeId, wordId, due',
      sessions: '++id, modeId, startedAt',
      settings: 'key',
    })
  }
}

export const db = new TcVocabDB()
