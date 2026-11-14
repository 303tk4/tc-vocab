import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../i18n'
import { dismissStorageNotice } from '../services/storage-notice'
import { promptInstall, useInstallPrompt } from './installPrompt'
import { StorageNotice } from './StorageNotice'

vi.mock('../services/storage-notice', () => ({
  dismissStorageNotice: vi.fn(),
  useStorageNoticeVisible: () => true,
}))
vi.mock('./installPrompt', () => ({
  promptInstall: vi.fn(() => Promise.resolve('accepted')),
  useInstallPrompt: vi.fn(() => ({ canPrompt: false, installed: false })),
}))
vi.mock('./installEnv', () => ({ detectCurrentInstallEnv: () => 'android' }))

function renderNotice() {
  return render(
    <MemoryRouter>
      <StorageNotice />
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  await i18n.changeLanguage('ja')
  vi.mocked(dismissStorageNotice).mockClear()
  vi.mocked(promptInstall).mockClear()
})

describe('データが消えうることの知らせ（FR-PWA-06）', () => {
  it('その場で追加できない環境では「詳しく」を置く', () => {
    renderNotice()
    expect(screen.getByRole('button', { name: '詳しく' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ホーム画面に追加' })).not.toBeInTheDocument()
  })

  it('ブラウザが追加できると知らせているときは、「詳しく」の代わりに追加のボタンを置き、押すと確認画面を出して閉じる（版 1.50）', async () => {
    vi.mocked(useInstallPrompt).mockReturnValue({ canPrompt: true, installed: false })
    const user = userEvent.setup()
    renderNotice()
    expect(screen.queryByRole('button', { name: '詳しく' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'ホーム画面に追加' }))
    expect(promptInstall).toHaveBeenCalledTimes(1)
    expect(dismissStorageNotice).toHaveBeenCalledTimes(1)
  })
})
