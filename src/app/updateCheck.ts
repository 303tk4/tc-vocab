/**
 * 「更新を確認」（FR-SET-15、仕様書 10.3）。その場で新しい版があるかを確かめ、あれば更新の通知（FR-PWA-03）を出し直す。
 * 確認先は公開元の Service Worker だけで、外部とは通信しない（NFR-06）
 */
export type UpdateCheckResult = 'available' | 'latest'

type Listener = () => void
const listeners = new Set<Listener>()

/** 更新の通知を出し直すよう UpdatePrompt に知らせる */
export function showUpdateNotice(): void {
  for (const listener of listeners) listener()
}

/** UpdatePrompt が、出し直しの知らせを受け取る */
export function onShowUpdateNotice(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function serviceWorkerContainer(): ServiceWorkerContainer | undefined {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator
    ? navigator.serviceWorker
    : undefined
}

/** この環境で更新を確認できるか（Service Worker が使えるか） */
export function canCheckForUpdate(): boolean {
  return serviceWorkerContainer() !== undefined
}

/** 取得中の新しい版の Service Worker が、待機に入る（または失敗する）まで待つ */
function settle(worker: ServiceWorker): Promise<void> {
  return new Promise((resolve) => {
    const done = () => worker.state === 'installed' || worker.state === 'redundant'
    if (done()) return resolve()
    const onChange = () => {
      if (!done()) return
      worker.removeEventListener('statechange', onChange)
      resolve()
    }
    worker.addEventListener('statechange', onChange)
  })
}

/**
 * 新しい版があるかを確かめる。あれば更新の通知を出し直して 'available' を返す。
 * 確かめられなければ例外を投げる
 */
export async function checkForUpdate(): Promise<UpdateCheckResult> {
  const container = serviceWorkerContainer()
  const registration = await container?.getRegistration()
  if (!registration) throw new Error('service worker is not registered')
  await registration.update()
  if (registration.installing) await settle(registration.installing)
  if (!registration.waiting) return 'latest'
  showUpdateNotice()
  return 'available'
}
