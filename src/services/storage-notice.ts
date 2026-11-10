/**
 * データが消えうることの知らせ（FR-PWA-06、仕様書 12.1）。
 * 編集のたびには出さず、保護されていない環境で初めて単語を追加・編集したときに1回だけ出す
 */
import { useSyncExternalStore } from 'react'
import { detectCurrentInstallEnv } from '../app/installEnv'
import { getSetting, setSetting } from '../db/repos/settings'
import { STORAGE_NOTICE_SHOWN_KEY } from '../io/backup'
import { getPersistState, requestPersistentStorage } from './storage-persist'

let visible = false
const listeners = new Set<() => void>()

function setVisible(value: boolean) {
  if (visible === value) return
  visible = value
  for (const listener of listeners) listener()
}

/**
 * 単語を追加・編集・読み込んだあとに呼ぶ。自動削除からの保護を要求し（FR-PWA-04）、
 * 保護されておらず、追加済みのアプリでもなく、まだ知らせていなければ知らせを出す。
 * 失敗しても単語の保存には影響させないため、例外は投げない
 */
export async function afterWordsSaved(): Promise<void> {
  try {
    await requestPersistentStorage()
    if ((await getPersistState()) === 'persisted') return
    if (detectCurrentInstallEnv() === 'installed') return
    if ((await getSetting<boolean>(STORAGE_NOTICE_SHOWN_KEY)) === true) return
    // 示した時点で記録し、二度と出さない
    await setSetting(STORAGE_NOTICE_SHOWN_KEY, true)
    setVisible(true)
  } catch {
    // 知らせは補助的なものなので、失敗しても何もしない
  }
}

export function dismissStorageNotice(): void {
  setVisible(false)
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getVisible = () => visible

export function useStorageNoticeVisible(): boolean {
  return useSyncExternalStore(subscribe, getVisible, getVisible)
}
