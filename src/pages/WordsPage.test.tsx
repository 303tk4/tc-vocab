import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import samplesText from '../../public/samples/starter.json?raw'
import { AppRoutes } from '../App'
import { db } from '../db/schema'
import i18n from '../i18n'
import { SettingsProvider } from '../settings/SettingsProvider'
import { jieyun, makeWord, tricky } from '../test/fixtures'

function renderApp(path = '/words') {
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

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('単語データ画面', () => {
  it('一覧を表示し、検索とタグで絞り込める', async () => {
    await db.words.bulkPut([jieyun, tricky, makeWord({ hanzi: '茶', tags: ['飲み物'] })])
    const user = userEvent.setup()
    renderApp()

    expect(await screen.findByText('捷運')).toBeInTheDocument()
    expect(screen.getByText('Select all shown (3)')).toBeInTheDocument()

    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'jieyun')
    await waitFor(() => expect(screen.queryByText('茶')).not.toBeInTheDocument())
    expect(screen.getByText('捷運')).toBeInTheDocument()

    await user.clear(screen.getByRole('searchbox', { name: 'Search' }))
    await user.click(screen.getByRole('button', { name: '飲み物' }))
    await waitFor(() => expect(screen.queryByText('捷運')).not.toBeInTheDocument())
    expect(screen.getByText('茶')).toBeInTheDocument()
  })

  it('選択した単語を、件数を確認してから削除する', async () => {
    await db.words.bulkPut([jieyun, tricky])
    const user = userEvent.setup()
    renderApp()

    await user.click(await screen.findByRole('checkbox', { name: 'Select 捷運' }))
    await user.click(screen.getByRole('button', { name: 'Delete selected (1)' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete selected words' })
    expect(within(dialog).getByText(/selected words \(1\)/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Deleted words: 1.')
    expect(await db.words.count()).toBe(1)
    expect(screen.queryByText('捷運')).not.toBeInTheDocument()
  })

  it('全データの削除は、取り消せないことを示して確認する', async () => {
    await db.words.bulkPut([jieyun])
    const user = userEvent.setup()
    renderApp()

    await user.click(await screen.findByRole('button', { name: 'Delete all data' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete all data' })
    expect(within(dialog).getByText(/cannot be undone/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Delete everything' }))
    await waitFor(async () => expect(await db.words.count()).toBe(0))
  })

  it('CSV をプレビューしてから取り込む', async () => {
    await db.words.bulkPut([jieyun])
    const user = userEvent.setup()
    renderApp()

    await user.click(await screen.findByRole('button', { name: 'Import' }))
    const dialog = screen.getByRole('dialog', { name: 'Import' })
    const csv = 'hanzi,pinyin,meaning\n捷運,jié yùn,MRT\n茶,chá,tea\n,x,no hanzi\n'
    await user.upload(
      within(dialog).getByLabelText('Choose a file'),
      new File([csv], 'words.csv', { type: 'text/csv' }),
    )

    expect(await within(dialog).findByText('words.csv')).toBeInTheDocument()
    expect(within(dialog).getByText('Line 4')).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText(/Tag to add/), 'imported')
    await user.click(within(dialog).getByRole('button', { name: 'Import (1)' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Added: 1, updated: 0, skipped: 1.')
    const tea = await db.words.where('hanzi').equals('茶').first()
    expect(tea?.tags).toEqual(['imported'])
  })

  it('対応していない拡張子のファイルは理由を示す', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderApp()
    await user.click(await screen.findByRole('button', { name: 'Import' }))
    const dialog = screen.getByRole('dialog', { name: 'Import' })
    await user.upload(within(dialog).getByLabelText('Choose a file'), new File(['x'], 'a.txt'))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('.json or .csv')
  })
})

describe('初回起動時のサンプル単語（FR-SMP-03）', () => {
  it('単語が0件のホームで確認し、承諾するとサンプル単語を追加する', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(samplesText)),
    )
    const user = userEvent.setup()
    renderApp('/')

    await user.click(await screen.findByRole('button', { name: 'Add sample words' }))
    await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(40))
    await waitFor(() => expect(screen.queryByText('No words yet')).not.toBeInTheDocument())
  })
})
