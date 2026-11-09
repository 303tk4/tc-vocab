import type { Progress, SessionRecord } from '../../types/word'
import { db } from '../schema'

/**
 * モード専用の進捗 API（仕様書 FR-PLUG-04）。
 * modeId で自動的に区切られ、他のモードの進捗には触れない。
 */
export interface ProgressStore {
  get<S>(wordId: string): Promise<Progress<S> | undefined>
  getMany<S>(wordIds: string[]): Promise<Map<string, Progress<S>>>
  /** このモードの進捗をすべて返す */
  list<S>(): Promise<Progress<S>[]>
  put<S>(wordId: string, due: number | null, state: S): Promise<void>
  /** 期限が指定日時以前の進捗を、期限の古い順に返す */
  dueBefore<S>(time: number): Promise<Progress<S>[]>
}

export function createProgressStore(modeId: string): ProgressStore {
  return {
    async get<S>(wordId: string) {
      return (await db.progress.get([modeId, wordId])) as Progress<S> | undefined
    },
    async getMany<S>(wordIds: string[]) {
      const rows = await db.progress.bulkGet(wordIds.map((id) => [modeId, id] as [string, string]))
      const map = new Map<string, Progress<S>>()
      for (const row of rows) if (row) map.set(row.wordId, row as Progress<S>)
      return map
    },
    async list<S>() {
      return (await db.progress.where('modeId').equals(modeId).toArray()) as Progress<S>[]
    },
    async put<S>(wordId: string, due: number | null, state: S) {
      await db.progress.put({ modeId, wordId, due, state, updatedAt: Date.now() })
    },
    async dueBefore<S>(time: number) {
      const rows = await db.progress.where('modeId').equals(modeId).toArray()
      return rows
        .filter((r): r is Progress & { due: number } => r.due !== null && r.due <= time)
        .sort((a, b) => a.due - b.due) as Progress<S>[]
    },
  }
}

export async function addSessionRecord(record: Omit<SessionRecord, 'id'>): Promise<void> {
  await db.sessions.add(record)
}
