import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../i18n'
import { setStudying } from './studyActivity'
import { UpdateNotice } from './UpdateNotice'

describe('更新の通知（FR-PWA-03）', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  afterEach(() => {
    setStudying(false)
  })

  it('新しいバージョンがあれば通知し、再読み込みとあとでを押せる', async () => {
    const onReload = vi.fn()
    const onDismiss = vi.fn()
    render(<UpdateNotice needRefresh onReload={onReload} onDismiss={onDismiss} />)
    expect(screen.getByText('Update available')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }))
    expect(onReload).toHaveBeenCalledOnce()
    await userEvent.click(screen.getByRole('button', { name: 'Later' }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('新しいバージョンがなければ何も表示しない', () => {
    render(<UpdateNotice needRefresh={false} onReload={() => {}} onDismiss={() => {}} />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('学習セッション中は保留し、終わったら表示する', () => {
    setStudying(true)
    render(<UpdateNotice needRefresh onReload={() => {}} onDismiss={() => {}} />)
    expect(screen.queryByText('Update available')).not.toBeInTheDocument()
    act(() => setStudying(false))
    expect(screen.getByText('Update available')).toBeInTheDocument()
  })
})
