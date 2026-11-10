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
    expect(screen.getByText(/Create backup file” below/)).toBeInTheDocument()
  })

  it('保護されていれば、書き出しの勧めは出さない（ホーム画面への追加の案内は出す。FR-PWA-05）', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: { persisted: () => Promise.resolve(true) },
      configurable: true,
    })
    renderApp('/settings')
    expect(await screen.findByText(/Your data is protected/)).toBeInTheDocument()
    expect(screen.queryByText(/Create backup file” below/)).not.toBeInTheDocument()
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

describe('一回の出題数（FR-PLUG-08、仕様書 8.1）', () => {
  it('準備画面の「学習を始める」の下に置き、正しい値を保存する', async () => {
    const user = userEvent.setup()
    await db.words.add(makeWord())
    renderApp('/mode/flashcard')
    const input = await screen.findByLabelText('Questions per session')
    await waitFor(() => expect(input).toHaveValue(20))
    expect(screen.getByText('cards')).toBeInTheDocument()
    // 「学習を始める」より後ろにある
    const start = screen.getByRole('button', { name: 'Start' })
    expect(start.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    await user.clear(input)
    await user.type(input, '0')
    expect(screen.getByText('Enter a whole number from 1 to 200.')).toBeInTheDocument()
    expect(start).toBeDisabled()

    await user.clear(input)
    await user.type(input, '35')
    expect(start).toBeEnabled()
    await waitFor(async () => expect(await getSetting('mode.flashcard.sessionSize')).toBe(35))
  })

  it('版 1.40 までの「1日の上限」を引き継ぐ。0 は初期値にする', async () => {
    await db.words.add(makeWord())
    await db.settings.bulkPut([
      { key: 'mode.flashcard.newPerDay', value: 50 },
      { key: 'mode.conversation.newPerDay', value: 0 },
    ])
    const { unmount } = renderApp('/mode/flashcard')
    const input = await screen.findByLabelText('Questions per session')
    await waitFor(() => expect(input).toHaveValue(50))
    unmount()

    renderApp('/mode/conversation')
    const conv = await screen.findByLabelText('Questions per session')
    await waitFor(() => expect(conv).toHaveValue(10))
  })

  it('設定画面には置かない（10.2）', async () => {
    renderApp('/settings')
    // 両方のモードの設定が出るまで待つ
    expect(await screen.findAllByText('Show Zhuyin')).toHaveLength(2)
    expect(screen.queryByLabelText('Questions per session')).not.toBeInTheDocument()
    expect(screen.queryByText('New cards per day')).not.toBeInTheDocument()
  })
})
