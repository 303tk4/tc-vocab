import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { getSetting } from '../db/repos/settings'
import i18n from '../i18n'
import { SettingsProvider } from '../settings/SettingsProvider'
import { FontScaleMenu } from './FontScaleMenu'

function renderMenu() {
  return render(
    <SettingsProvider>
      <p>outside</p>
      <FontScaleMenu />
    </SettingsProvider>,
  )
}

beforeEach(async () => {
  await i18n.changeLanguage('en')
})

describe('画面上部のバーの文字の大きさ（FR-NAV-02）', () => {
  it('ボタンでメニューを開き、選ぶとすぐ反映して保存し、メニューは開いたまま', async () => {
    const user = userEvent.setup()
    renderMenu()
    const button = await screen.findByRole('button', { name: 'Display size' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    // 開くと、選ばれている選択肢（初期値は Medium）にフォーカスが移る
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Medium' })).toHaveFocus())
    await user.click(screen.getByRole('radio', { name: 'Extra large' }))
    await waitFor(() => expect(document.documentElement.dataset.fontScale).toBe('xl'))
    await waitFor(async () => expect(await getSetting('app.fontScale')).toBe('xl'))
    expect(screen.getByRole('radio', { name: 'Extra large' })).toBeChecked()
  })

  it('Esc で閉じてボタンにフォーカスを戻す。外を押しても閉じる', async () => {
    const user = userEvent.setup()
    renderMenu()
    const button = await screen.findByRole('button', { name: 'Display size' })
    await user.click(button)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('radio', { name: 'Medium' })).not.toBeInTheDocument()
    expect(button).toHaveFocus()

    await user.click(button)
    expect(screen.getByRole('radio', { name: 'Medium' })).toBeInTheDocument()
    await user.click(screen.getByText('outside'))
    expect(screen.queryByRole('radio', { name: 'Medium' })).not.toBeInTheDocument()
  })
})
