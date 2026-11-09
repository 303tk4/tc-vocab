/**
 * ブラウザによる自動削除からデータを守る（FR-PWA-04、仕様書 6.5）。
 * `navigator.storage.persist()` は、単語を追加した時点（守るべきデータができた時点）で要求する。
 */

/** データの保存の状態。'unsupported' は、このブラウザでは確認できないことを表す */
export type PersistState = 'persisted' | 'not-persisted' | 'unsupported'

function storageManager(): StorageManager | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator.storage
}

/** いまの保存の状態を返す（設定画面に表示する） */
export async function getPersistState(): Promise<PersistState> {
  const storage = storageManager()
  if (typeof storage?.persisted !== 'function') return 'unsupported'
  try {
    return (await storage.persisted()) ? 'persisted' : 'not-persisted'
  } catch {
    return 'unsupported'
  }
}

/**
 * 保護を要求する。既に保護されていれば何もしない。
 * 失敗しても単語の追加には影響させないため、例外は投げずに結果だけを返す
 */
export async function requestPersistentStorage(): Promise<boolean> {
  const storage = storageManager()
  if (typeof storage?.persist !== 'function') return false
  try {
    if (typeof storage.persisted === 'function' && (await storage.persisted())) return true
    return await storage.persist()
  } catch {
    return false
  }
}
