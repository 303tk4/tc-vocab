/** 切り替えの合図が来ないときに、待たずに再読み込みするまでの時間 */
export const APPLY_UPDATE_TIMEOUT = 4000

type Deps = {
  /** 今の登録。待機中の新しい版（waiting）を持つ */
  registration: Pick<ServiceWorkerRegistration, 'waiting'> | undefined
  /** navigator.serviceWorker。切り替わり（controllerchange）を待つ */
  container: Pick<ServiceWorkerContainer, 'addEventListener'> | undefined
  /** ページを再読み込みする */
  reload: () => void
  setTimer?: (fn: () => void, ms: number) => unknown
  timeoutMs?: number
}

/**
 * 「更新があります」の「再読み込み」を押したときの処理（FR-PWA-03）。
 * 待機中の新しい版に切り替えを指示し、切り替わったら再読み込みする。
 * 次の場合も必ず再読み込みに至るよう、予備の道を用意する。
 * - 強制再読み込みで開いたページなど、Service Worker の管理外で、切り替わりの合図が届かない
 * - 別のタブで先に切り替えが済み、待機中の版がもうない
 * - 切り替わりの合図が一定時間来ない
 */
export function applyUpdate({
  registration,
  container,
  reload,
  setTimer = (fn, ms) => setTimeout(fn, ms),
  timeoutMs = APPLY_UPDATE_TIMEOUT,
}: Deps): void {
  let done = false
  const go = () => {
    if (done) return
    done = true
    reload()
  }

  const waiting = registration?.waiting
  if (!waiting || !container) {
    go()
    return
  }

  // 管理下のページは controllerchange、管理外のページは新しい版の activated で知る
  container.addEventListener('controllerchange', go, { once: true })
  waiting.addEventListener('statechange', () => {
    if (waiting.state === 'activated' || waiting.state === 'redundant') go()
  })
  setTimer(go, timeoutMs)
  waiting.postMessage({ type: 'SKIP_WAITING' })
}
