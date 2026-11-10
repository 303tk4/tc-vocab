import { afterEach, describe, expect, it, vi } from 'vitest'
import { canCheckForUpdate, checkForUpdate, onShowUpdateNotice } from './updateCheck'

/** Service Worker の登録を擬似的に作る */
function fakeRegistration(found: 'none' | 'waiting' | 'installing') {
  const worker = Object.assign(new EventTarget(), { state: 'installing' as ServiceWorkerState })
  const registration = {
    installing: null as unknown,
    waiting: null as unknown,
    update: vi.fn(() => {
      if (found === 'waiting') registration.waiting = {}
      if (found === 'installing') {
        registration.installing = worker
        // 取得が終わると待機に入る
        setTimeout(() => {
          worker.state = 'installed'
          registration.waiting = worker
          worker.dispatchEvent(new Event('statechange'))
        }, 0)
      }
      return Promise.resolve()
    }),
  }
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { getRegistration: () => Promise.resolve(registration) },
    configurable: true,
  })
  return registration
}

afterEach(() => {
  delete (navigator as { serviceWorker?: unknown }).serviceWorker
})

describe('更新を確認（FR-SET-15）', () => {
  it('Service Worker が使えない環境では確認できない', () => {
    expect(canCheckForUpdate()).toBe(false)
  })

  it('新しい版が無ければ「最新」とし、通知は出さない', async () => {
    const registration = fakeRegistration('none')
    const listener = vi.fn()
    const off = onShowUpdateNotice(listener)
    expect(canCheckForUpdate()).toBe(true)
    expect(await checkForUpdate()).toBe('latest')
    expect(registration.update).toHaveBeenCalledOnce()
    expect(listener).not.toHaveBeenCalled()
    off()
  })

  it('待機中の新しい版があれば、更新の通知を出し直す', async () => {
    fakeRegistration('waiting')
    const listener = vi.fn()
    const off = onShowUpdateNotice(listener)
    expect(await checkForUpdate()).toBe('available')
    expect(listener).toHaveBeenCalledOnce()
    off()
  })

  it('取得中の新しい版は、待機に入るのを待ってから知らせる', async () => {
    fakeRegistration('installing')
    expect(await checkForUpdate()).toBe('available')
  })

  it('登録が無ければ例外を投げる', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { getRegistration: () => Promise.resolve(undefined) },
      configurable: true,
    })
    await expect(checkForUpdate()).rejects.toThrow()
  })
})
