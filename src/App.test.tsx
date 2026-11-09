import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppRoutes } from './App'
import { getSetting } from './db/repos/settings'
import { db } from './db/schema'
import { makeWord } from './test/fixtures'
import i18n from './i18n'
import { SettingsProvider } from './settings/SettingsProvider'

function renderApp(path = '/') {
  return render(
    <SettingsProvider>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </SettingsProvider>,
  )
}

beforeEach(async () => {
  await i18n.changeLanguage('en')
})

describe('ホーム', () => {
  it('登録済みの学習モードを表示する', async () => {
    renderApp()
    expect(await screen.findByText('Flashcards')).toBeInTheDocument()
  })

  it('単語が0件のときは単語データへの案内を出し、モードは無効表示にする', async () => {
    renderApp()
    expect(await screen.findByText('Add words to get started')).toBeInTheDocument()
    expect(screen.getByText('Minimum words required: 1')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Flashcards/ })).not.toBeInTheDocument()
    // データが残りにくい環境への注意（FR-PWA-04）
    expect(screen.getByText(/inside another app such as LINE/)).toBeInTheDocument()
  })
})

describe('単語の増やし方の案内（FR-HOME-06）', () => {
  it('単語があるときは、ホームに単語データ画面への案内を出す', async () => {
    await db.words.put(makeWord({ id: 'a' }))
    const user = userEvent.setup()
    renderApp()
    expect(await screen.findByRole('heading', { name: 'Adding more words' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Add words' }))
    expect(await screen.findByRole('heading', { name: 'Word data' })).toBeInTheDocument()
  })

  it('単語が0件のときは出さない（最初の案内を出す）', async () => {
    renderApp()
    expect(await screen.findByText('Add words to get started')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Adding more words' })).not.toBeInTheDocument()
  })
})

describe('設定', () => {
  it('変更を即座に反映し、IndexedDB に保存して再表示後も保持する', async () => {
    const user = userEvent.setup()
    const { unmount } = renderApp('/settings')

    await user.click(await screen.findByRole('radio', { name: 'Dark' }))
    await user.click(screen.getByRole('radio', { name: 'Extra large' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.dataset.fontScale).toBe('xl')

    await user.click(screen.getByRole('radio', { name: '日本語' }))
    expect(await screen.findByRole('heading', { name: '設定' })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('ja')

    await waitFor(async () => expect(await getSetting('app.theme')).toBe('dark'))
    unmount()

    // localStorage の写しが無くても IndexedDB から復元できること
    localStorage.clear()
    renderApp('/settings')
    await waitFor(() => expect(screen.getByRole('radio', { name: '黒' })).toBeChecked())
    expect(screen.getByRole('radio', { name: '特大' })).toBeChecked()
  })
})

describe('データの保存の状態（FR-PWA-04）', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'storage')
  })

  it('保護されていなければ、その旨と案内を表示する', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: { persisted: () => Promise.resolve(false) },
      configurable: true,
    })
    renderApp('/settings')
    expect(await screen.findByText(/Your data is not protected/)).toBeInTheDocument()
    expect(screen.getByText(/makes protection more likely/)).toBeInTheDocument()
    expect(screen.getByText(/export important words/)).toBeInTheDocument()
  })

  it('保護されていれば、書き出しの勧めは出さない（ホーム画面への追加の案内は出す。FR-PWA-05）', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: { persisted: () => Promise.resolve(true) },
      configurable: true,
    })
    renderApp('/settings')
    expect(await screen.findByText(/Your data is protected/)).toBeInTheDocument()
    expect(screen.queryByText(/export important words/)).not.toBeInTheDocument()
    expect(screen.getByText(/makes protection more likely/)).toBeInTheDocument()
  })

  it('確認できないブラウザでは、その旨を表示する', async () => {
    renderApp('/settings')
    expect(await screen.findByText(/cannot tell whether/)).toBeInTheDocument()
  })
})

describe('ルーティング', () => {
  it('存在しないモードは案内を表示する', async () => {
    renderApp('/mode/unknown')
    expect(await screen.findByText('The requested study mode was not found.')).toBeInTheDocument()
  })

  it('未定義のパスはホームに戻す', async () => {
    renderApp('/nowhere')
    expect(await screen.findByText('Study modes')).toBeInTheDocument()
  })
})
