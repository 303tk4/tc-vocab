// バックアップの読み出し・復元・初期化（仕様書 10.4、FR-SET-11〜14）
import {
  isDeviceSettingKey,
  LAST_BACKUP_KEY,
  type Backup,
  type BackupContent,
  type ReminderInput,
} from '../../io/backup'
import { db } from '../schema'

/** バックアップに書き出す全データを読む（4つの表を同じ時点で読む） */
export function loadBackupContent(): Promise<BackupContent> {
  return db.transaction('r', db.words, db.progress, db.sessions, db.settings, async () => {
    const [words, progress, sessions, settings] = await Promise.all([
      db.words.toArray(),
      db.progress.toArray(),
      db.sessions.toArray(),
      db.settings.toArray(),
    ])
    return { words, progress, sessions, settings }
  })
}

export interface DataCounts {
  words: number
  progress: number
  sessions: number
}

/** 確認のダイアログに示す、今の件数 */
export async function countData(): Promise<DataCounts> {
  const [words, progress, sessions] = await Promise.all([
    db.words.count(),
    db.progress.count(),
    db.sessions.count(),
  ])
  return { words, progress, sessions }
}

/** バックアップを保存した日時を記録する（FR-SET-14 で使う） */
export async function recordBackup(now = Date.now()): Promise<void> {
  await db.settings.put({ key: LAST_BACKUP_KEY, value: now })
}

/**
 * 今のデータをバックアップの内容にすべて置き換える（FR-SET-12）。
 * 4つの表を1つのトランザクションで書き換え、途中で失敗したら何も変えない（NFR-07）。
 * この端末の案内に関わる設定は、この端末の値を残す。最後のバックアップの日時はファイルの書き出し日時とする
 */
export function restoreBackup(backup: Backup): Promise<void> {
  return db.transaction('rw', db.words, db.progress, db.sessions, db.settings, async () => {
    const deviceSettings = (await db.settings.toArray()).filter(
      (s) => isDeviceSettingKey(s.key) && s.key !== LAST_BACKUP_KEY,
    )
    await Promise.all([
      db.words.clear(),
      db.progress.clear(),
      db.sessions.clear(),
      db.settings.clear(),
    ])
    await db.words.bulkAdd(backup.words)
    await db.progress.bulkAdd(backup.progress)
    await db.sessions.bulkAdd(backup.sessions)
    await db.settings.bulkAdd([
      ...backup.settings,
      ...deviceSettings,
      { key: LAST_BACKUP_KEY, value: backup.exportedAt },
    ])
  })
}

/** 単語・学習の進捗・学習の履歴・設定をすべて消す（FR-SET-13）。データベース自体は消さない */
export function resetAllData(): Promise<void> {
  return db.transaction('rw', db.words, db.progress, db.sessions, db.settings, async () => {
    await Promise.all([
      db.words.clear(),
      db.progress.clear(),
      db.sessions.clear(),
      db.settings.clear(),
    ])
  })
}

/** バックアップの勧め（FR-SET-14）の判定に使う値を読む */
export async function loadReminderInput(
  now = Date.now(),
): Promise<Omit<ReminderInput, 'lastBackupAt' | 'snoozedUntil'> & { now: number }> {
  const [oldestWord, latestWord, firstSession, latestSession] = await Promise.all([
    db.words.orderBy('updatedAt').first(),
    db.words.orderBy('updatedAt').last(),
    db.sessions.orderBy('startedAt').first(),
    db.sessions.orderBy('startedAt').last(),
  ])
  return {
    now,
    oldestWordUpdatedAt: oldestWord?.updatedAt,
    latestWordUpdatedAt: latestWord?.updatedAt,
    firstSessionAt: firstSession?.startedAt,
    latestSessionAt: latestSession?.startedAt,
  }
}
