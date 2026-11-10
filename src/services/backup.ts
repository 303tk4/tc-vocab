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

async function makeBackupFile(now = new Date()): Promise<File> {
  const text = buildBackup(await loadBackupContent(), __APP_VERSION__, now)
  return new File([text], backupFileName(now), { type: MIME })
}

/** バックアップのファイルをダウンロードし、保存した日時を記録する（FR-SET-11） */
export async function saveBackup(): Promise<void> {
  const now = new Date()
  const file = await makeBackupFile(now)
  downloadText(file.name, await file.text(), MIME)
  await recordBackup(now.getTime())
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

/**
 * 共有の機能でバックアップを渡す。取りやめたときは 'cancelled' を返し、日時は記録しない
 */
export async function shareBackup(): Promise<'shared' | 'cancelled'> {
  const now = new Date()
  const file = await makeBackupFile(now)
  try {
    await navigator.share({ files: [file], title: file.name })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
    throw error
  }
  await recordBackup(now.getTime())
  return 'shared'
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
