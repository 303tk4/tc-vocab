import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '../App'
import { getSetting } from '../db/repos/settings'
import { db } from '../db/schema'
import i18n from '../i18n'
import { SettingsProvider } from '../settings/SettingsProvider'
import { unlockSpeech } from '../services/speech'
import { makeWord } from '../test/fixtures'

// jsdom には読み上げが無いため、読み上げに対応した環境として扱う（FR-PLUG-09 は対応した環境でだけ置く）
vi.mock('../services/speech', () => ({ canSpeak: true, speak: vi.fn(), unlockSpeech: vi.fn() }))

function renderApp(path: string) {
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

describe('準備画面の「学習を始める」の下の並び（FR-MODE-05）', () => {
  it('学習を始める → 音声の自動再生 → 一回の出題数 → 表示の設定 の順に置く', async () => {
    await db.words.add(makeWord())
    renderApp('/mode/flashcard')
    const start = await screen.findByRole('button', { name: 'Start' })
    const auto = await screen.findByRole('checkbox', { name: 'Play audio automatically' })
    const size = screen.getByLabelText('Questions per session')
    const display = screen.getByText('Display settings')
    const follows = (a: Node, b: Node) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    expect(follows(start, auto)).toBe(true)
    expect(follows(auto, size)).toBe(true)
    expect(follows(size, display)).toBe(true)
  })
})

describe('音声を自動で再生する（FR-PLUG-09）', () => {
  it('初期値は暗記カードがオフ、場面別会話がオン。今の状態を文で添える', async () => {
    await db.words.add(makeWord())
    const { unmount } = renderApp('/mode/flashcard')
    const card = await screen.findByRole('checkbox', { name: 'Play audio automatically' })
    expect(card).not.toBeChecked()
    expect(card).toHaveAccessibleDescription(
      'No audio will play (use the speaker button to play it).',
    )
    unmount()

    renderApp('/mode/conversation')
    const conv = await screen.findByRole('checkbox', { name: 'Play audio automatically' })
    await waitFor(() => expect(conv).toBeChecked())
    expect(conv).toHaveAccessibleDescription('Audio will play when you start.')
  })

  it('変えた値をモードごとに保存する', async () => {
    const user = userEvent.setup()
    renderApp('/mode/conversation')
    const box = await screen.findByRole('checkbox', { name: 'Play audio automatically' })
    await waitFor(() => expect(box).toBeChecked())
    await user.click(box)
    expect(box).not.toBeChecked()
    await waitFor(async () => expect(await getSetting('mode.conversation.autoSpeak')).toBe(false))
  })

  it('暗記カードは、版 1.47 までの「裏返したときに自動で読み上げる」の値を引き継ぐ（FR-FC-14）', async () => {
    await db.words.add(makeWord())
    await db.settings.put({ key: 'mode.flashcard.autoSpeak', value: true })
    renderApp('/mode/flashcard')
    const box = await screen.findByRole('checkbox', { name: 'Play audio automatically' })
    await waitFor(() => expect(box).toBeChecked())
  })
})

describe('スマホでの自動再生（FR-PLUG-09）', () => {
  it('自動再生がオンなら、「学習を始める」を押したときに読み上げを使えるようにしておく', async () => {
    const user = userEvent.setup()
    vi.mocked(unlockSpeech).mockClear()
    renderApp('/mode/conversation')
    const box = await screen.findByRole('checkbox', { name: 'Play audio automatically' })
    await waitFor(() => expect(box).toBeChecked())
    await screen.findByText(/^\d+ items$/)
    await user.click(screen.getByRole('button', { name: 'Start' }))
    expect(unlockSpeech).toHaveBeenCalledTimes(1)
  })

  it('自動再生がオフなら、何もしない', async () => {
    const user = userEvent.setup()
    vi.mocked(unlockSpeech).mockClear()
    renderApp('/mode/conversation')
    const box = await screen.findByRole('checkbox', { name: 'Play audio automatically' })
    await waitFor(() => expect(box).toBeChecked())
    await user.click(box)
    await screen.findByText(/^\d+ items$/)
    await user.click(screen.getByRole('button', { name: 'Start' }))
    expect(unlockSpeech).not.toHaveBeenCalled()
  })
})

describe('表示の設定（FR-PLUG-10）', () => {
  it('準備画面の開閉できる欄に、モード別の表示の設定を置く', async () => {
    const user = userEvent.setup()
    await db.words.add(makeWord())
    renderApp('/mode/flashcard')
    const summary = await screen.findByText('Display settings')
    const details = summary.closest('details')!
    expect(details).not.toHaveAttribute('open')
    await user.click(summary)
    expect(details).toHaveAttribute('open')
    const zhuyin = await within(details).findByRole('checkbox', { name: 'Show Zhuyin' })
    await user.click(zhuyin)
    await waitFor(async () => expect(await getSetting('mode.flashcard.showZhuyin')).toBe(false))
  })

  it('場面別会話では、自動再生がオフのあいだ「音声だけで出す」を選べない（FR-CONV-11）', async () => {
    const user = userEvent.setup()
    renderApp('/mode/conversation')
    const auto = await screen.findByRole('checkbox', { name: 'Play audio automatically' })
    await waitFor(() => expect(auto).toBeChecked())
    await user.click(screen.getByText('Display settings'))
    const audioOnly = await screen.findByRole('checkbox', {
      name: /Play staff lines as audio only/,
    })
    expect(audioOnly).toBeEnabled()
    await user.click(auto)
    expect(audioOnly).toBeDisabled()
  })
})
