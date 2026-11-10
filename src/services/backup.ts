/**
 * バックアップの保存・共有・復元・初期化の流れ（仕様書 10.4、FR-SET-11〜13）。
 * 書き出しと共有は利用者の操作によるもので、アプリ自身は外部と通信しない（NFR-06）
 */
import { loadBackupContent, recordBackup, resetAllData, restoreBackup } from '../db/repos/backup'
import { backupFileName, buildBackup, type Backup } from '../io/backup'
import { downloadText } from '../io/download'
import { BOOT_STORAGE_KEY, writeBootSettings } from '../settings/boot'
import { defaultSettings, sanitizeSettings, SETTING_KEYS } from '../settings/types'
import { requestPersistentStorage } from './storage-persist'

const MIME = 'application/json'

/** 作成したバックアップのファイルと、その作成日時 */
export interface BackupFile {
  file: File
  createdAt: number
}

/**
 * バックアップのファイルを作る（FR-SET-11）。共有の画面や保存先を選ぶ画面は押した操作の直後でないと
 * 開けないブラウザがあるため、保存方法を選ぶダイアログを開く前に作っておく（仕様書 10.4）
 */
export async function createBackupFile(now = new Date()): Promise<BackupFile> {
  const text = buildBackup(await loadBackupContent(), __APP_VERSION__, now)
  return { file: new File([text], backupFileName(now), { type: MIME }), createdAt: now.getTime() }
}

/** 保存先を選ぶ画面（File System Access API）。パソコンの Chrome・Edge にある */
type SaveFilePicker = (options: {
  suggestedName: string
  types: { description: string; accept: Record<string, string[]> }[]
}) => Promise<{
  createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void> }>
}>

function saveFilePicker(): SaveFilePicker | undefined {
  if (typeof window === 'undefined') return undefined
  const picker = (window as Window & { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker
  return typeof picker === 'function' ? picker.bind(window) : undefined
}

/** 保存先を選んで保存できるか（できなければ、ブラウザのダウンロードとして保存する） */
export function canPickSaveLocation(): boolean {
  return saveFilePicker() !== undefined
}

export type SaveOutcome = 'saved' | 'cancelled'

const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError'

/** ファイルとして保存し、作成日時を記録する。保存先の選択を取りやめたら 'cancelled' */
export async function saveBackupFile({ file, createdAt }: BackupFile): Promise<SaveOutcome> {
  const picker = saveFilePicker()
  let saved = false
  if (picker) {
    try {
      const handle = await picker({
        suggestedName: file.name,
        types: [{ description: 'JSON', accept: { [MIME]: ['.json'] } }],
      })
      const writable = await handle.createWritable()
      await writable.write(file)
      await writable.close()
      saved = true
    } catch (error) {
      if (isAbort(error)) return 'cancelled'
      // 押した操作の直後でない、埋め込みの画面で使えないなどで開けなかったときは、ダウンロードとして保存する
    }
  }
  if (!saved) downloadText(file.name, await file.text(), MIME)
  await recordBackup(createdAt)
  return 'saved'
}

/** ファイルを共有の機能（Web Share API）で渡せるか */
export function canShareBackup(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function') return false
  try {
    return navigator.canShare({ files: [new File(['{}'], 'tc-vocab-backup.json', { type: MIME })] })
  } catch {
    return false
  }
}

/** 共有の機能でファイルを渡し、作成日時を記録する。取りやめたら 'cancelled' */
export async function shareBackupFile({ file, createdAt }: BackupFile): Promise<SaveOutcome> {
  try {
    await navigator.share({ files: [file], title: file.name })
  } catch (error) {
    if (isAbort(error)) return 'cancelled'
    throw error
  }
  await recordBackup(createdAt)
  return 'saved'
}

/** ホームを開き直す（言語・背景の色などを反映するため、ページを読み込み直す） */
function reloadHome() {
  window.location.hash = '#/'
  window.location.reload()
}

/**
 * バックアップから復元する（FR-SET-12）。成功したら表示設定の写しを書き直し、
 * 自動削除からの保護を要求して（FR-PWA-04）、ホームを開き直す
 */
export async function restoreFromBackup(backup: Backup): Promise<void> {
  await restoreBackup(backup)
  const values = Object.fromEntries(backup.settings.map((s) => [s.key, s.value]))
  writeBootSettings(
    sanitizeSettings(
      {
        uiLanguage: values[SETTING_KEYS.uiLanguage],
        fontScale: values[SETTING_KEYS.fontScale],
        theme: values[SETTING_KEYS.theme],
        accent: values[SETTING_KEYS.accent],
      },
      defaultSettings(),
    ),
  )
  await requestPersistentStorage()
  reloadHome()
}

/** アプリを初期状態に戻す（FR-SET-13）。オフライン用に保存したアプリ本体は消さない */
export async function resetApp(): Promise<void> {
  await resetAllData()
  try {
    localStorage.removeItem(BOOT_STORAGE_KEY)
  } catch {
    // localStorage が使えない環境では、消すものも無い
  }
  reloadHome()
}
