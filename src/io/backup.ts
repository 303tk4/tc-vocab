// アプリ全体のバックアップの組み立てと検証（仕様書 10.4、FR-SET-11・12・14）。DB には依存しない
import type { Progress, SessionRecord, Word } from '../types/word'
import { decodeText } from './encoding'
import { isProgress, JSON_FORMAT, JSON_VERSION } from './json'
import { ImportFileError, MAX_FILE_SIZE, stripBom } from './parsed'
import { normalizeWord } from './validate'

/** 最後にバックアップを保存した日時（UNIX ミリ秒） */
export const LAST_BACKUP_KEY = 'app.lastBackupAt'
/** バックアップの勧めを「閉じる」で止めている期限（UNIX ミリ秒） */
export const BACKUP_REMINDER_SNOOZE_KEY = 'app.backupReminderSnoozedUntil'
/** データが消えうることの知らせを示したか（FR-PWA-06） */
export const STORAGE_NOTICE_SHOWN_KEY = 'app.storageNoticeShown'

/** バックアップに含めない、この端末での案内の表示にだけ関わる設定のキー */
export const DEVICE_SETTING_KEYS: readonly string[] = [
  'app.installHintHidden',
  STORAGE_NOTICE_SHOWN_KEY,
  BACKUP_REMINDER_SNOOZE_KEY,
  LAST_BACKUP_KEY,
]

export function isDeviceSettingKey(key: string): boolean {
  return DEVICE_SETTING_KEYS.includes(key)
}

/** 設定の1行（settings テーブルと同じ形。仕様書 6.4） */
export interface SettingRow {
  key: string
  value: unknown
}

/** バックアップの中身 */
export interface BackupContent {
  words: Word[]
  progress: Progress[]
  sessions: SessionRecord[]
  settings: SettingRow[]
}

export interface Backup extends BackupContent {
  /** 書き出した日時（UNIX ミリ秒） */
  exportedAt: number
  /** 書き出したアプリの版 */
  appVersion: string
}

const pad = (n: number) => String(n).padStart(2, '0')

/** tc-vocab-backup-YYYYMMDD-HHmm.json（端末のローカル時刻。FR-SET-11） */
export function backupFileName(date = new Date()): string {
  const ymd = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
  const hm = `${pad(date.getHours())}${pad(date.getMinutes())}`
  return `tc-vocab-backup-${ymd}-${hm}.json`
}

/** バックアップのファイルの中身を作る。この端末の案内に関わる設定は含めない */
export function buildBackup(content: BackupContent, appVersion: string, now = new Date()): string {
  const data = {
    format: JSON_FORMAT,
    version: JSON_VERSION,
    backup: true,
    appVersion,
    exportedAt: now.toISOString(),
    words: content.words.map((w) => ({
      id: w.id,
      hanzi: w.hanzi,
      zhuyin: w.zhuyin,
      pinyin: w.pinyin,
      meaning: w.meaning,
      examples: w.examples,
      tags: w.tags,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    })),
    progress: content.progress,
    sessions: content.sessions,
    settings: content.settings.filter((s) => !isDeviceSettingKey(s.key)),
  }
  return JSON.stringify(data, null, 2) + '\n'
}

/** 復元できない理由 */
export type BackupErrorCode =
  | 'invalidJson'
  | 'invalidFormat'
  | 'notBackup'
  | 'newerVersion'
  | 'invalidWords'
  | 'tooLarge'
  | 'unsupportedType'
  | 'readFailed'
  | 'empty'
  | 'invalidEncoding'

export class BackupFileError extends Error {
  readonly code: BackupErrorCode
  readonly params: Record<string, string>

  constructor(code: BackupErrorCode, params: Record<string, string> = {}) {
    super(code)
    this.name = 'BackupFileError'
    this.code = code
    this.params = params
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function isSession(value: unknown): value is SessionRecord {
  if (!isRecord(value)) return false
  if (value.id !== undefined && !isFiniteNumber(value.id)) return false
  return (
    typeof value.modeId === 'string' &&
    isFiniteNumber(value.startedAt) &&
    isFiniteNumber(value.finishedAt) &&
    isRecord(value.summary) &&
    Object.values(value.summary).every(isFiniteNumber)
  )
}

function isSettingRow(value: unknown): value is SettingRow {
  return isRecord(value) && typeof value.key === 'string' && value.key !== '' && 'value' in value
}

/**
 * バックアップのファイルを検証する（FR-SET-12）。
 * 置き換えは全部か無しかとするため、1か所でも正しくなければ BackupFileError を投げる。
 * 存在しない単語の進捗は捨て、この端末の案内に関わる設定は読み飛ばす
 */
export function parseBackup(text: string, now = Date.now()): Backup {
  let data: unknown
  try {
    data = JSON.parse(stripBom(text))
  } catch {
    throw new BackupFileError('invalidJson')
  }
  if (!isRecord(data) || data.format !== JSON_FORMAT) throw new BackupFileError('invalidFormat')
  if (isFiniteNumber(data.version) && data.version > JSON_VERSION) {
    throw new BackupFileError('newerVersion')
  }
  if (data.version !== JSON_VERSION) throw new BackupFileError('invalidFormat')
  if (data.backup !== true) throw new BackupFileError('notBackup')

  const exportedAt = typeof data.exportedAt === 'string' ? Date.parse(data.exportedAt) : NaN
  if (
    !Number.isFinite(exportedAt) ||
    !Array.isArray(data.words) ||
    !Array.isArray(data.progress) ||
    !Array.isArray(data.sessions) ||
    !Array.isArray(data.settings)
  ) {
    throw new BackupFileError('invalidFormat')
  }

  const words: Word[] = []
  const ids = new Set<string>()
  let invalid = 0
  for (const raw of data.words) {
    const result = normalizeWord(raw)
    if (!result.ok) {
      invalid++
      continue
    }
    const { id = crypto.randomUUID(), createdAt = now, updatedAt, ...content } = result.word
    if (ids.has(id)) throw new BackupFileError('invalidFormat')
    ids.add(id)
    words.push({ id, ...content, createdAt, updatedAt: updatedAt ?? createdAt })
  }
  if (invalid > 0) throw new BackupFileError('invalidWords', { count: String(invalid) })

  if (!data.progress.every(isProgress)) throw new BackupFileError('invalidFormat')
  const progress = data.progress
    .filter((p) => ids.has(p.wordId))
    .map(({ modeId, wordId, due, state, updatedAt }): Progress => ({
      modeId,
      wordId,
      due,
      state,
      updatedAt,
    }))

  if (!data.sessions.every(isSession)) throw new BackupFileError('invalidFormat')
  const sessions = data.sessions.map(({ id, modeId, startedAt, finishedAt, summary }) => {
    const session: SessionRecord = { modeId, startedAt, finishedAt, summary }
    if (id !== undefined) session.id = id
    return session
  })

  if (!data.settings.every(isSettingRow)) throw new BackupFileError('invalidFormat')
  const settings = data.settings
    .filter((s) => !isDeviceSettingKey(s.key))
    .map(({ key, value }) => ({ key, value }))

  return {
    exportedAt,
    appVersion: typeof data.appVersion === 'string' ? data.appVersion : '',
    words,
    progress,
    sessions,
    settings,
  }
}

/** 選ばれたファイルを読み込んで検証する（サイズの上限と文字コードは単語の読み込みと同じ。FR-IO-01・07） */
export async function readBackupFile(file: File): Promise<Backup> {
  if (!file.name.toLowerCase().endsWith('.json')) throw new BackupFileError('unsupportedType')
  if (file.size > MAX_FILE_SIZE) throw new BackupFileError('tooLarge')
  let bytes: Uint8Array
  try {
    bytes = new Uint8Array(await file.arrayBuffer())
  } catch {
    throw new BackupFileError('readFailed')
  }
  let text: string
  try {
    text = decodeText(bytes)
  } catch (error) {
    if (error instanceof ImportFileError && error.code === 'empty') {
      throw new BackupFileError('empty')
    }
    throw new BackupFileError('invalidEncoding')
  }
  return parseBackup(text)
}

/** バックアップの勧めの間隔（30日） */
export const BACKUP_REMINDER_INTERVAL = 30 * 24 * 60 * 60 * 1000

export interface ReminderInput {
  now: number
  /** 最後にバックアップを保存した日時 */
  lastBackupAt?: number
  /** 「閉じる」で止めている期限 */
  snoozedUntil?: number
  /** 単語の updatedAt の最小と最大（単語が無ければ undefined） */
  oldestWordUpdatedAt?: number
  latestWordUpdatedAt?: number
  /** 学習の履歴の startedAt の最小と最大（履歴が無ければ undefined） */
  firstSessionAt?: number
  latestSessionAt?: number
}

/**
 * ホームでバックアップの保存を勧めるか（FR-SET-14）。
 * 基準は最後のバックアップ、無ければ最も古い単語か最初の学習。基準から30日以上たち、
 * 基準より後に単語や学習の記録が増えていれば勧める（バックアップが無ければ、データがあるだけで勧める）
 */
export function shouldRemindBackup(input: ReminderInput): boolean {
  const { now, lastBackupAt, snoozedUntil } = input
  if (snoozedUntil !== undefined && snoozedUntil > now) return false
  const starts = [input.oldestWordUpdatedAt, input.firstSessionAt].filter(
    (v): v is number => v !== undefined,
  )
  if (starts.length === 0) return false
  const base = lastBackupAt ?? Math.min(...starts)
  if (now - base < BACKUP_REMINDER_INTERVAL) return false
  if (lastBackupAt === undefined) return true
  return (
    (input.latestWordUpdatedAt ?? -Infinity) > lastBackupAt ||
    (input.latestSessionAt ?? -Infinity) > lastBackupAt
  )
}
