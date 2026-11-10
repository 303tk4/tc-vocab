import { describe, expect, it, vi } from 'vitest'
import { applyUpdate } from './applyUpdate'

/** 待機中の Service Worker の代わり */
function fakeWaiting() {
  const target = new EventTarget()
  const sw = Object.assign(target, {
    state: 'installed' as ServiceWorkerState,
    postMessage: vi.fn(),
  })
  const changeTo = (state: ServiceWorkerState) => {
    sw.state = state
    sw.dispatchEvent(new Event('statechange'))
  }
  return { sw: sw as unknown as ServiceWorker, postMessage: sw.postMessage, changeTo }
}

function setup(withWaiting = true) {
  const waiting = withWaiting ? fakeWaiting() : undefined
  const container = new EventTarget()
  const reload = vi.fn()
  let timer: (() => void) | undefined
  applyUpdate({
    registration: { waiting: waiting?.sw ?? null },
    container: container as ServiceWorkerContainer,
    reload,
    setTimer: (fn) => {
      timer = fn
    },
  })
  return { waiting, container, reload, fireTimer: () => timer?.() }
}

describe('applyUpdate（更新の再読み込み、FR-PWA-03）', () => {
  it('待機中の版に切り替えを指示し、切り替わったら1回だけ再読み込みする', () => {
    const { waiting, container, reload, fireTimer } = setup()
    expect(waiting?.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
    expect(reload).not.toHaveBeenCalled()
    container.dispatchEvent(new Event('controllerchange'))
    waiting?.changeTo('activated')
    fireTimer()
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('管理外のページでも、新しい版が有効になったら再読み込みする', () => {
    const { waiting, reload } = setup()
    waiting?.changeTo('activating')
    expect(reload).not.toHaveBeenCalled()
    waiting?.changeTo('activated')
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('待機中の版がもうなければ、すぐに再読み込みする', () => {
    const { reload } = setup(false)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('切り替わりの合図が来なくても、一定時間後に再読み込みする', () => {
    const { reload, fireTimer } = setup()
    expect(reload).not.toHaveBeenCalled()
    fireTimer()
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
