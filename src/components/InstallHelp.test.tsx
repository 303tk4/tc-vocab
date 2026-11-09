import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetInstallPromptForTest, startInstallPromptCapture } from '../app/installPrompt'
import i18n from '../i18n'
import { InstallHelp } from './InstallHelp'

/** ブラウザの beforeinstallprompt を擬似的に送る */
function fireBeforeInstallPrompt(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = new Event('beforeinstallprompt', { cancelable: true })
  const prompt = vi.fn(() => Promise.resolve())
  Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome, platform: 'web' }) })
  act(() => {
    window.dispatchEvent(event)
  })
  return { event, prompt }
}

describe('ホーム画面への追加の手助け（FR-PWA-05）', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ja')
    startInstallPromptCapture()
  })

  afterEach(() => {
    act(() => resetInstallPromptForTest())
  })

  it('追加済みのアプリでは何も示さない', () => {
    const { container } = render(<InstallHelp env="installed" fallback="今の案内文" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('設定画面（showInstalled）では、追加済みのアプリとして開いていることを示す', () => {
    render(<InstallHelp env="installed" fallback="今の案内文" showInstalled />)
    expect(screen.getByText(/ホーム画面に追加したアプリ/)).toBeInTheDocument()
  })

  it('Android でブラウザの知らせが無いうちは今の案内文を示し、知らせを受けたらボタンを示す', async () => {
    render(<InstallHelp env="android" fallback="今の案内文" />)
    expect(screen.getByText('今の案内文')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()

    const { event, prompt } = fireBeforeInstallPrompt('accepted')
    expect(event.defaultPrevented).toBe(true)
    await userEvent.click(screen.getByRole('button', { name: 'ホーム画面に追加' }))
    expect(prompt).toHaveBeenCalledOnce()
    expect(await screen.findByRole('status')).toHaveTextContent('追加しました')
  })

  it('パソコンでは「アプリとしてインストール」のボタンにする。断られたらボタンを消す', async () => {
    render(<InstallHelp env="desktop" fallback="今の案内文" />)
    fireBeforeInstallPrompt('dismissed')
    await userEvent.click(screen.getByRole('button', { name: 'アプリとしてインストール' }))
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText('今の案内文')).toBeInTheDocument()
  })

  it('appinstalled を受けたら、追加し終えたことを示す', () => {
    render(<InstallHelp env="desktop" fallback="今の案内文" />)
    act(() => {
      window.dispatchEvent(new Event('appinstalled'))
    })
    expect(screen.getByRole('status')).toHaveTextContent('インストールしました')
  })

  it('iPhone では共有ボタンからの手順を示し、ボタンは置かない', () => {
    render(<InstallHelp env="ios" fallback="今の案内文" />)
    fireBeforeInstallPrompt()
    expect(screen.getByText(/共有ボタン/)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('LINE では外のブラウザで開くリンクを置く', () => {
    render(<InstallHelp env="line" fallback="今の案内文" />)
    const link = screen.getByRole('link', { name: 'ブラウザで開き直す' })
    expect(link.getAttribute('href')).toContain('openExternalBrowser=1')
  })

  it('ほかのアプリの中では、ブラウザで開き直す手順を示す', () => {
    render(<InstallHelp env="in-app" fallback="今の案内文" />)
    expect(screen.getByText(/ブラウザで開く/)).toBeInTheDocument()
  })

  it('判定できないときは今の案内文を示す', () => {
    render(<InstallHelp env="unknown" fallback="今の案内文" />)
    expect(screen.getByText('今の案内文')).toBeInTheDocument()
  })
})
