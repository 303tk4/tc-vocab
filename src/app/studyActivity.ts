import { useSyncExternalStore } from 'react'

/**
 * 学習セッション中かどうか。セッション中は更新の通知を保留するために使う（FR-PWA-03）。
 * 状態は ModePage が設定し、UpdatePrompt が読む
 */
let studying = false
const listeners = new Set<() => void>()

export function setStudying(value: boolean): void {
  if (studying === value) return
  studying = value
  for (const listener of listeners) listener()
}

export function isStudying(): boolean {
  return studying
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useStudying(): boolean {
  return useSyncExternalStore(subscribe, isStudying, isStudying)
}
