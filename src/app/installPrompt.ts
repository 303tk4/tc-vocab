import { useSyncExternalStore } from 'react'

/**
 * ブラウザの「追加できます」の知らせ（beforeinstallprompt）を保持する（FR-PWA-05）。
 * イベントはアプリの起動直後に来るため、main.tsx で startInstallPromptCapture() を呼んで早くから受ける
 */

/** beforeinstallprompt のイベント（標準の型定義には無い） */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export interface InstallPromptState {
  /** ボタンから追加できる（イベントを保持している） */
  canPrompt: boolean
  /** この画面を開いている間に追加し終えた */
  installed: boolean
}

let deferred: BeforeInstallPromptEvent | null = null
let state: InstallPromptState = { canPrompt: false, installed: false }
const listeners = new Set<() => void>()
let started = false

function setState(next: InstallPromptState) {
  state = next
  listeners.forEach((listener) => listener())
}

function onBeforeInstallPrompt(event: Event) {
  // ブラウザが自分で出す案内を止め、ボタンを押したときに出す
  event.preventDefault()
  deferred = event as BeforeInstallPromptEvent
  setState({ canPrompt: true, installed: false })
}

function onAppInstalled() {
  deferred = null
  setState({ canPrompt: false, installed: true })
}

/** イベントの受け取りを始める（何度呼んでも1回だけ登録する） */
export function startInstallPromptCapture() {
  if (started || typeof window === 'undefined') return
  started = true
  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  window.addEventListener('appinstalled', onAppInstalled)
}

/**
 * ブラウザの確認画面を出す。prompt() は1回しか使えないので、使ったイベントは捨てる。
 * 断られた場合も、ブラウザがまたイベントを送ってくればボタンを出し直す
 */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const event = deferred
  if (!event) return 'unavailable'
  deferred = null
  setState({ ...state, canPrompt: false })
  try {
    await event.prompt()
    const { outcome } = await event.userChoice
    if (outcome === 'accepted') setState({ canPrompt: false, installed: true })
    return outcome
  } catch {
    return 'unavailable'
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return state
}

export function useInstallPrompt(): InstallPromptState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/** テスト用：状態を初期に戻す */
export function resetInstallPromptForTest() {
  deferred = null
  setState({ canPrompt: false, installed: false })
}
