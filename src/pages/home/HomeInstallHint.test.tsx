import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { INSTALL_HINT_HIDDEN_KEY } from '../../app/installEnv'
import { resetInstallPromptForTest, startInstallPromptCapture } from '../../app/installPrompt'
import { getSetting, setSetting } from '../../db/repos/settings'
import i18n from '../../i18n'
import { HomeInstallHint } from './HomeInstallHint'

/** ブラウザの beforeinstallprompt を擬似的に送る */
function fireBeforeInstallPrompt() {
  const event = new Event('beforeinstallprompt', { cancelable: true })
  Object.assign(event, {
    prompt: () => Promise.resolve(),
    userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'web' }),
  })
  act(() => {
    window.dispatchEvent(event)
  })
}

describe('単語があるときのホームの下部の追加の案内（FR-PWA-05、版 1.19）', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ja')
    startInstallPromptCapture()
  })

  afterEach(() => {
    act(() => resetInstallPromptForTest())
  })

  it('iPhone では手順と「今後表示しない」を示し、押すと保存して消える', async () => {
    render(<HomeInstallHint env="ios" />)
    expect(await screen.findByText(/共有ボタン/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '今後表示しない' }))
    expect(await getSetting(INSTALL_HINT_HIDDEN_KEY)).toBe(true)
    await waitFor(() => expect(screen.queryByText(/共有ボタン/)).not.toBeInTheDocument())
  })

  it('「今後表示しない」を押した後は、iPhone では示さない', async () => {
    await setSetting(INSTALL_HINT_HIDDEN_KEY, true)
    const { container } = render(<HomeInstallHint env="ios" />)
    // 設定を読み終えるのを待つ
    await new Promise((r) => setTimeout(r, 50))
    expect(container).toBeEmptyDOMElement()
  })

  it('LINE では「今後表示しない」を置かず、押した後でも示す', async () => {
    await setSetting(INSTALL_HINT_HIDDEN_KEY, true)
    render(<HomeInstallHint env="line" />)
    expect(await screen.findByRole('link', { name: 'ブラウザで開き直す' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '今後表示しない' })).not.toBeInTheDocument()
  })

  it('Android では、ブラウザの知らせが無い（追加済みなど）ときは示さない', async () => {
    const { container } = render(<HomeInstallHint env="android" />)
    await new Promise((r) => setTimeout(r, 50))
    expect(container).toBeEmptyDOMElement()
  })

  it('Android では、知らせを受けたらボタンと「今後表示しない」を示し、押すと消える', async () => {
    render(<HomeInstallHint env="android" />)
    fireBeforeInstallPrompt()
    expect(await screen.findByRole('button', { name: 'ホーム画面に追加' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '今後表示しない' }))
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'ホーム画面に追加' })).not.toBeInTheDocument(),
    )
  })

  it('パソコンでは、知らせを受けても示さない', async () => {
    const { container } = render(<HomeInstallHint env="desktop" />)
    fireBeforeInstallPrompt()
    await new Promise((r) => setTimeout(r, 50))
    expect(container).toBeEmptyDOMElement()
  })
})
