import { beforeEach, describe, expect, it, vi } from 'vitest'
import { detectCurrentInstallEnv } from '../app/installEnv'
import { db } from '../db/schema'
import { afterWordsSaved, dismissStorageNotice, useStorageNoticeVisible } from './storage-notice'
import { getPersistState } from './storage-persist'
import { renderHook } from '@testing-library/react'

vi.mock('./storage-persist', () => ({
  requestPersistentStorage: vi.fn(() => Promise.resolve(false)),
  getPersistState: vi.fn(() => Promise.resolve('not-persisted')),
}))
vi.mock('../app/installEnv', () => ({
  detectCurrentInstallEnv: vi.fn(() => 'desktop'),
}))

describe('データが消えうることの知らせ（FR-PWA-06）', () => {
  beforeEach(async () => {
    // 共通の準備（test/setup.ts）で示し済みにしているため、取り消す
    await db.settings.delete('app.storageNoticeShown')
    dismissStorageNotice()
    vi.mocked(getPersistState).mockResolvedValue('not-persisted')
    vi.mocked(detectCurrentInstallEnv).mockReturnValue('desktop')
  })

  it('保護されていなければ1回だけ知らせ、示したことを記録する', async () => {
    const { result, rerender } = renderHook(() => useStorageNoticeVisible())
    await afterWordsSaved()
    rerender()
    expect(result.current).toBe(true)
    expect((await db.settings.get('app.storageNoticeShown'))?.value).toBe(true)

    dismissStorageNotice()
    await afterWordsSaved()
    rerender()
    expect(result.current).toBe(false)
  })

  it('確認できないブラウザでも知らせる', async () => {
    vi.mocked(getPersistState).mockResolvedValue('unsupported')
    const { result, rerender } = renderHook(() => useStorageNoticeVisible())
    await afterWordsSaved()
    rerender()
    expect(result.current).toBe(true)
  })

  it.each([
    ['保護されている', () => vi.mocked(getPersistState).mockResolvedValue('persisted')],
    ['追加済みのアプリ', () => vi.mocked(detectCurrentInstallEnv).mockReturnValue('installed')],
  ])('%sときは知らせない', async (_label, arrange) => {
    arrange()
    const { result, rerender } = renderHook(() => useStorageNoticeVisible())
    await afterWordsSaved()
    rerender()
    expect(result.current).toBe(false)
    expect(await db.settings.get('app.storageNoticeShown')).toBeUndefined()
  })
})
