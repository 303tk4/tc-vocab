import { afterEach, describe, expect, it, vi } from 'vitest'
import { getPersistState, requestPersistentStorage } from './storage-persist'

// jsdom には navigator.storage が無いため、テストごとに差し替える
function mockStorage(storage: Partial<StorageManager> | undefined) {
  Object.defineProperty(navigator, 'storage', { value: storage, configurable: true })
}

describe('データの保存の状態（FR-PWA-04）', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'storage')
  })

  it('保護されていれば persisted を返す', async () => {
    mockStorage({ persisted: () => Promise.resolve(true) })
    expect(await getPersistState()).toBe('persisted')
  })

  it('保護されていなければ not-persisted を返す', async () => {
    mockStorage({ persisted: () => Promise.resolve(false) })
    expect(await getPersistState()).toBe('not-persisted')
  })

  it('StorageManager が無いブラウザでは unsupported を返す', async () => {
    mockStorage(undefined)
    expect(await getPersistState()).toBe('unsupported')
  })

  it('確認に失敗したら unsupported を返す', async () => {
    mockStorage({ persisted: () => Promise.reject(new Error('x')) })
    expect(await getPersistState()).toBe('unsupported')
  })
})

describe('保護の要求（FR-PWA-04）', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'storage')
  })

  it('保護されていなければ persist() を呼ぶ', async () => {
    const persist = vi.fn(() => Promise.resolve(true))
    mockStorage({ persisted: () => Promise.resolve(false), persist })
    expect(await requestPersistentStorage()).toBe(true)
    expect(persist).toHaveBeenCalledOnce()
  })

  it('既に保護されていれば persist() を呼ばない', async () => {
    const persist = vi.fn(() => Promise.resolve(true))
    mockStorage({ persisted: () => Promise.resolve(true), persist })
    expect(await requestPersistentStorage()).toBe(true)
    expect(persist).not.toHaveBeenCalled()
  })

  it('persist() が失敗しても例外を投げない', async () => {
    mockStorage({
      persisted: () => Promise.resolve(false),
      persist: () => Promise.reject(new Error('x')),
    })
    expect(await requestPersistentStorage()).toBe(false)
  })

  it('persist() が無いブラウザでは false を返す', async () => {
    mockStorage({})
    expect(await requestPersistentStorage()).toBe(false)
  })
})
