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

/** DB の読み込みが終わってボタンが押せる状態になるまで待つ */
async function enabledButton(name: string) {
  const button = await screen.findByRole('button', { name })
  await waitFor(() => expect(button).toBeEnabled())
  return button
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

  it('表示中をすべて選択して削除でき、取り消せないことを示して確認する（FR-WORDS-05）', async () => {
    await db.words.bulkPut([jieyun])
    const user = userEvent.setup()
    renderApp()

    await user.click(await screen.findByRole('checkbox', { name: /Select all shown/ }))
    await user.click(screen.getByRole('button', { name: 'Delete selected (1)' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete selected words' })
    expect(within(dialog).getByText(/cannot be undone/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    await waitFor(async () => expect(await db.words.count()).toBe(0))
    expect(screen.queryByRole('button', { name: /Delete all/ })).not.toBeInTheDocument()
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
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('.csv or .json')
  })

  it('CSV の列の案内を表示し、文字コードの誤りや取り込まない列を知らせる（FR-IO-08・09）', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(await screen.findByRole('button', { name: 'Import' }))
    const dialog = screen.getByRole('dialog', { name: 'Import' })
    const table = within(dialog).getByRole('table')
    expect(
      within(table)
        .getAllByRole('rowheader')
        .map((h) => h.textContent),
    ).toEqual([
      'hanziRequired',
      'zhuyin',
      'pinyin',
      'meaningRequired',
      'example',
      'example_translation',
      'tags',
    ])
    expect(
      within(dialog).getByRole('button', { name: 'Download a sample CSV' }),
    ).toBeInTheDocument()

    // Shift_JIS の「水」
    const sjis = new Uint8Array([
      ...new TextEncoder().encode('hanzi,meaning\n'),
      0x90,
      0x85,
      0x2c,
      0x90,
      0x85,
    ])
    await user.upload(within(dialog).getByLabelText('Choose a file'), new File([sjis], 's.csv'))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('not encoded in UTF-8')

    const csv = 'hanzi,meaning,level\n茶,tea,1\n'
    await user.upload(within(dialog).getByLabelText('Choose a file'), new File([csv], 'w.csv'))
    expect(
      await within(dialog).findByText('These columns will not be imported: level'),
    ).toBeInTheDocument()
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

describe('タグの編集（FR-WORDS-08〜11）', () => {
  it('選択した単語にタグをまとめて付け、外す', async () => {
    await db.words.bulkPut([jieyun, tricky])
    const user = userEvent.setup()
    renderApp()

    await user.click(await screen.findByRole('checkbox', { name: 'Select 捷運' }))
    await user.click(screen.getByRole('checkbox', { name: `Select ${tricky.hanzi}` }))
    await user.click(screen.getByRole('button', { name: 'Add tag (2)' }))
    let dialog = screen.getByRole('dialog', { name: 'Add a tag to the selected words' })
    await user.type(within(dialog).getByRole('combobox', { name: 'Tag name' }), 'a;b')
    expect(within(dialog).getByText('Tags cannot contain ";".')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Add' })).toBeDisabled()

    await user.clear(within(dialog).getByRole('combobox', { name: 'Tag name' }))
    await user.type(within(dialog).getByRole('combobox', { name: 'Tag name' }), '復習')
    expect(within(dialog).getByText('The tag will be added to 2 words.')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Add' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Added the tag "復習" to 2 words.')
    expect((await db.words.get('jieyun'))?.tags).toEqual(['交通', '復習'])

    await user.click(screen.getByRole('button', { name: 'Remove tag (2)' }))
    dialog = screen.getByRole('dialog', { name: 'Remove a tag from the selected words' })
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Tag' }), '復習')
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }))
    await waitFor(async () => expect((await db.words.get('jieyun'))?.tags).toEqual(['交通']))
    expect(await db.words.count()).toBe(2)
  })

  it('1語のタグを追加・削除して保存する', async () => {
    await db.words.bulkPut([jieyun])
    const user = userEvent.setup()
    renderApp()

    await user.click(await screen.findByRole('button', { name: 'Edit tags of 捷運' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit tags: 捷運' })
    await user.click(within(dialog).getByRole('button', { name: 'Remove 交通' }))
    await user.type(within(dialog).getByRole('combobox', { name: 'Add a tag' }), '台北{Enter}')
    await user.type(within(dialog).getByRole('combobox', { name: 'Add a tag' }), '日常')
    await user.click(within(dialog).getByRole('button', { name: 'Add' }))
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Saved the tags of 捷運.')
    expect((await db.words.get('jieyun'))?.tags).toEqual(['台北', '日常'])
  })

  it('タグの名前を変えて統合し、全単語から外しても単語は残る', async () => {
    await db.words.bulkPut([
      makeWord({ id: 'a', hanzi: '茶', tags: ['飲料'] }),
      makeWord({ id: 'b', hanzi: '水', tags: ['飲み物', '飲料'] }),
    ])
    const user = userEvent.setup()
    renderApp()

    await user.click(await enabledButton('Manage tags'))
    let dialog = screen.getByRole('dialog', { name: 'Manage tags' })
    await user.click(within(dialog).getByRole('button', { name: 'Rename：飲料' }))
    dialog = screen.getByRole('dialog', { name: 'Rename tag: 飲料' })
    const input = within(dialog).getByRole('combobox', { name: 'New name' })
    await user.clear(input)
    await user.type(input, '飲み物')
    expect(within(dialog).getByText(/merged with the existing tag "飲み物"/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Rename' }))
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Renamed the tag "飲料" to "飲み物" (2 words).',
    )
    expect((await db.words.get('a'))?.tags).toEqual(['飲み物'])
    expect((await db.words.get('b'))?.tags).toEqual(['飲み物'])

    await user.click(screen.getByRole('button', { name: 'Manage tags' }))
    dialog = screen.getByRole('dialog', { name: 'Manage tags' })
    await user.click(within(dialog).getByRole('button', { name: 'Remove from all words：飲み物' }))
    dialog = screen.getByRole('dialog', { name: 'Remove tag: 飲み物' })
    expect(within(dialog).getByText(/Words and study progress are kept/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }))
    await waitFor(async () => expect((await db.words.get('a'))?.tags).toEqual([]))
    expect(await db.words.count()).toBe(2)
  })
})
