import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { getSetting, setSetting } from '../../db/repos/settings'
import { SettingsProvider } from '../../settings/SettingsProvider'
import { SETTING_KEYS } from '../../settings/types'
import { LanguageChoice } from './LanguageChoice'

function renderChoice() {
  return render(
    <SettingsProvider>
      <LanguageChoice />
    </SettingsProvider>,
  )
}

describe('初回起動時の言語の選択（FR-HOME-07）', () => {
  it('言語が保存されていなければ、English を先にした3言語の見出しと選択肢を示す', async () => {
    renderChoice()
    const group = await screen.findByRole('group', {
      name: /^Display Language.*アプリの表示言語.*介面語言$/,
    })
    expect(group).toBeInTheDocument()
    // 並び順は English → 日本語 → 繁體中文（版 1.45）
    const names = screen.getAllByRole('radio').map((r) => r.closest('label')?.textContent)
    expect(names).toEqual(['English', '日本語', '繁體中文'])
    // 選択肢と見出しには、それぞれの言語の lang を付ける
    expect(screen.getByText('繁體中文').closest('[lang]')).toHaveAttribute('lang', 'zh-TW')
    expect(screen.getByText('介面語言')).toHaveAttribute('lang', 'zh-TW')
    expect(screen.getByText('Display Language')).toHaveAttribute('lang', 'en')
  })

  it('選ぶとすぐに表示が変わって保存され、決定を押すまでは開いたままになる', async () => {
    renderChoice()
    await userEvent.click(await screen.findByRole('radio', { name: '繁體中文' }))
    await waitFor(async () => expect(await getSetting(SETTING_KEYS.uiLanguage)).toBe('zh-TW'))
    // 決定のボタンが選んだ言語の文言になり、ほかの言語も試せる
    const confirm = await screen.findByRole('button', { name: '確定' })
    await userEvent.click(screen.getByRole('radio', { name: '日本語' }))
    await waitFor(async () => expect(await getSetting(SETTING_KEYS.uiLanguage)).toBe('ja'))
    expect(confirm).toHaveTextContent('決定')
    await userEvent.click(confirm)
    await waitFor(() => expect(screen.queryByRole('radio', { name: '日本語' })).toBeNull())
  })

  it('選ばずに決定を押すと、いま表示している言語を保存して閉じる', async () => {
    renderChoice()
    const checked = (await screen.findAllByRole('radio')).find(
      (r) => (r as HTMLInputElement).checked,
    )
    const value = (checked as HTMLInputElement).value
    await userEvent.click(screen.getByRole('button', { name: /^(決定|確定|OK)$/ }))
    await waitFor(() => expect(screen.queryByRole('radio')).toBeNull())
    expect(await getSetting(SETTING_KEYS.uiLanguage)).toBe(value)
  })

  it('言語が保存済みなら示さない', async () => {
    await setSetting(SETTING_KEYS.uiLanguage, 'ja')
    const { container } = renderChoice()
    // 設定を読み終えるのを待つ
    await new Promise((r) => setTimeout(r, 50))
    expect(container).toBeEmptyDOMElement()
  })
})
