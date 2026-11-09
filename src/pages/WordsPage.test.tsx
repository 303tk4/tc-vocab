import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import samplesText from '../../public/samples/starter.json?raw'
import { AppRoutes } from '../App'
import { db } from '../db/schema'
import { buildJson } from '../io/json'
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

    await user.click(await screen.findByRole('button', { name: 'Add words from a file' }))
    const dialog = screen.getByRole('dialog', { name: 'Add words from a file' })
    const csv = 'hanzi,pinyin,meaning\n捷運,jié yùn,MRT\n茶,chá,tea\n,x,no hanzi\n'
    await user.upload(
      within(dialog).getByLabelText('Choose a file'),
      new File([csv], 'words.csv', { type: 'text/csv' }),
    )

    expect(await within(dialog).findByText('words.csv')).toBeInTheDocument()
    expect(within(dialog).getByText('Line 4')).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText(/Tag to add/), 'imported')
    await user.click(within(dialog).getByRole('button', { name: 'Import (1)' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Imported: 1 added, 0 merged, 0 updated, 1 skipped.',
    )
    const tea = await db.words.where('hanzi').equals('茶').first()
    expect(tea?.tags).toEqual(['imported'])
  })

  it('対応していない拡張子のファイルは理由を示す', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderApp()
    await user.click(await screen.findByRole('button', { name: 'Add words from a file' }))
    const dialog = screen.getByRole('dialog', { name: 'Add words from a file' })
    await user.upload(within(dialog).getByLabelText('Choose a file'), new File(['x'], 'a.pdf'))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('.csv or .json')
  })

  it('CSV の列の案内を表示し、文字コードの誤りや取り込まない列を知らせる（FR-IO-08・09）', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(await screen.findByRole('button', { name: 'Add words from a file' }))
    const dialog = screen.getByRole('dialog', { name: 'Add words from a file' })
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
      within(dialog).getByText(/Spell the column names in the first row exactly/),
    ).toBeInTheDocument()
    for (const name of ['Template with column names only', 'Template with examples']) {
      expect(within(dialog).getByRole('button', { name })).toBeInTheDocument()
    }
    const saveGuide = () =>
      within(dialog)
        .getByText(/How to save as a UTF-8 CSV/, { selector: 'summary' })
        .closest('details') as HTMLDetailsElement
    expect(saveGuide().open).toBe(false)

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
    // 文字コードの誤りでは、保存方法の案内を開く
    expect(saveGuide().open).toBe(true)

    const ja = '繁體字,意思\n茶,tea\n'
    await user.upload(within(dialog).getByLabelText('Choose a file'), new File([ja], 'ja.csv'))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'The column names are not correct',
    )
    expect(within(dialog).getByRole('alert')).toHaveTextContent('繁體字 → hanzi, 意思 → meaning')

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

    await user.click(await screen.findByRole('button', { name: 'Add sample words (about 50)' }))
    await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(40))
    await waitFor(() =>
      expect(screen.queryByText('Add words to get started')).not.toBeInTheDocument(),
    )
  })
})

describe('単語パッケージ（仕様書 16.5）', () => {
  const packIndex = JSON.stringify({
    format: 'tc-vocab-packs',
    version: 1,
    packs: [
      {
        id: 'tocfl-test',
        file: 'tocfl-test.json',
        version: 1,
        name: { ja: 'TOCFL 試験用', en: 'TOCFL Test' },
        description: { en: 'Words for the test' },
        wordCount: 2,
        size: 2048,
        tags: ['TOCFL'],
        license: 'Test license',
        levelGuide: {
          title: { ja: 'TOCFL と TBCL の級の対応', en: 'TOCFL and TBCL levels' },
          note: { en: 'Equivalent TBCL levels.' },
          columns: {
            tocfl: { en: 'TOCFL' },
            cefr: { en: 'CEFR' },
            listening: { en: 'TBCL (listening)' },
            reading: { en: 'TBCL (reading)' },
          },
          rows: [
            {
              tocfl: { en: 'Level 1' },
              cefr: 'A1',
              listening: '2+',
              reading: '2+',
              inPack: true,
              tag: 'TOCFL:入門',
            },
            { tocfl: { en: 'Level 3' }, cefr: 'B1', listening: '4', reading: '4', inPack: false },
          ],
          source: { name: 'TOCFL Q&A', url: 'https://example.com/a.pdf' },
        },
      },
    ],
  })
  const packFile = buildJson([
    { ...jieyun, id: 'p1', meaning: 'パッケージの意味', tags: ['TOCFL', 'TOCFL:入門'] },
    makeWord({
      id: 'p2',
      hanzi: '茶',
      pinyin: 'chá',
      meaning: 'お茶',
      tags: ['TOCFL', '要確認:読み'],
    }),
  ])

  /** 同じサイトの packs/ と samples/ だけを返す fetch */
  function stubSite() {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('packs/index.json')) return new Response(packIndex)
      if (url.endsWith('packs/tocfl-test.json')) return new Response(packFile)
      if (url.endsWith('samples/starter.json')) return new Response(samplesText)
      return new Response('', { status: 404 })
    })
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'onLine')
  })

  it('ホームの案内から一覧を開き、既存の単語にはタグだけを付けて追加する', async () => {
    stubSite()
    const user = userEvent.setup()
    renderApp('/')

    await user.click(await screen.findByRole('link', { name: 'Choose a word pack (free)' }))
    const dialog = await screen.findByRole('dialog', { name: 'Word packs' })
    expect(within(dialog).getByText('Sample words')).toBeInTheDocument()
    expect(await within(dialog).findByText('TOCFL Test')).toBeInTheDocument()
    expect(within(dialog).getByText('2 words · about 2 KB')).toBeInTheDocument()
    // 対象の試験がわかるよう、パッケージのタグを示す
    expect(within(dialog).getByRole('list', { name: 'Tags' })).toHaveTextContent('TOCFL')

    // 既存の単語があるときは、初期値の「タグだけ付ける」で追加する
    await db.words.put({ ...jieyun, tags: ['交通'] })
    await user.click(within(dialog).getByRole('button', { name: 'Choose TOCFL Test' }))
    expect(await within(dialog).findByText('Examples')).toBeInTheDocument()
    // 級の対応表（TOCFL と TBCL）
    const table = within(dialog).getByRole('table')
    expect(within(table).getByRole('rowheader', { name: /Level 1/ })).toHaveTextContent('Included')
    expect(
      within(table).getByRole('columnheader', { name: 'TBCL (listening)' }),
    ).toBeInTheDocument()
    expect(within(dialog).getByText('Source: TOCFL Q&A')).toBeInTheDocument()
    // 要確認:読み の件数と説明（FR-WORDS-14）
    expect(
      within(dialog).getByText('1 of these words have the “要確認:読み” tag'),
    ).toBeInTheDocument()
    expect(within(dialog).getByRole('radio', { name: /Add tags only/ })).toBeChecked()
    await user.click(within(dialog).getByRole('button', { name: 'Add (2)' }))

    expect(await screen.findByText(/Added “TOCFL Test”\./)).toBeInTheDocument()
    expect(screen.getByText(/Added tags to 1 existing words\./)).toBeInTheDocument()
    const stored = await db.words.get('jieyun')
    expect(stored).toMatchObject({ meaning: jieyun.meaning, tags: ['交通', 'TOCFL', 'TOCFL:入門'] })
    expect(await db.words.count()).toBe(2)

    // 追加済みの記録が一覧に示される
    await user.click(screen.getByRole('button', { name: 'Word packs' }))
    const reopened = await screen.findByRole('dialog', { name: 'Word packs' })
    expect(await within(reopened).findByText('Added')).toBeInTheDocument()
  })

  it('オフラインでは一覧を読み込まず、サンプル単語は追加できる', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    const fetchMock = stubSite()
    const user = userEvent.setup()
    renderApp('/words?open=packs')

    const dialog = await screen.findByRole('dialog', { name: 'Word packs' })
    expect(
      within(dialog).getByText(/Connect to the internet to choose a pack\./),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('packs/'), expect.anything())

    await user.click(within(dialog).getByRole('button', { name: 'Choose Sample words' }))
    // サンプル単語では「タグだけ付ける」を選べない（FR-SMP-04）
    expect(await within(dialog).findByText('Examples')).toBeInTheDocument()
    expect(within(dialog).queryByRole('radio', { name: /Add tags only/ })).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: /^Add \(\d+\)$/ }))
    await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(40))
    expect((await db.words.toArray()).every((w) => w.tags.includes('サンプル'))).toBe(true)
  })
})

describe('わかりやすさの改善（版 1.13）', () => {
  it('「← 戻る」は、直接開いたときは1つ上の階層（ホーム）に戻る（FR-NAV-01）', async () => {
    const user = userEvent.setup()
    renderApp('/words')
    await user.click(await screen.findByRole('link', { name: 'Back' }))
    expect(await screen.findByText('Study modes')).toBeInTheDocument()
  })

  it('「← 戻る」は、画面を移ってきたときは1つ前の画面に戻る（FR-NAV-01）', async () => {
    const user = userEvent.setup()
    renderApp('/settings')
    await user.click(await screen.findByRole('link', { name: /Manage word data/ }))
    expect(await screen.findByRole('heading', { name: 'Word data' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Back' }))
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument()
  })

  it('ファイルからの追加の画面に、上部の案内と重複の説明を示す（FR-IO-09）', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(await screen.findByRole('button', { name: 'Add words from a file' }))
    const dialog = screen.getByRole('dialog', { name: 'Add words from a file' })
    expect(
      within(dialog).getByText(/You can add your own words from a CSV or JSON file/),
    ).toBeInTheDocument()
    expect(within(dialog).getByText('When a word is already registered')).toBeInTheDocument()
    expect(within(dialog).getByText(/A word can have several tags/)).toBeInTheDocument()
  })

  it('要確認:読み タグがあれば、絞り込みの下にその説明を示す（FR-WORDS-14）', async () => {
    await db.words.bulkPut([jieyun, { ...tricky, tags: ['要確認:読み'] }])
    renderApp()
    expect(await screen.findByText('About the “要確認:読み” tag')).toBeInTheDocument()
    expect(screen.getByText(/^Filter by tag \(multiple choice/)).toBeInTheDocument()
  })

  it('要確認:読み タグが無ければ説明を出さない', async () => {
    await db.words.bulkPut([jieyun])
    renderApp()
    expect(await screen.findByText('捷運')).toBeInTheDocument()
    expect(screen.queryByText('About the “要確認:読み” tag')).not.toBeInTheDocument()
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

describe('重複の扱い（FR-IO-03・FR-WORDS-13）', () => {
  it('取り込みで重複の扱いを選べ、統合の説明を示す', async () => {
    await db.words.put(makeWord({ id: 'tea', hanzi: '茶', pinyin: 'chá', meaning: 'お茶' }))
    const user = userEvent.setup()
    renderApp()
    await user.click(await screen.findByRole('button', { name: 'Add words from a file' }))
    const dialog = screen.getByRole('dialog', { name: 'Add words from a file' })
    await user.upload(
      within(dialog).getByLabelText('Choose a file'),
      new File(['hanzi,meaning,tags\n茶,tea,飲み物\n'], 'w.csv'),
    )
    expect(
      await within(dialog).findByText('1 words are the same as words you already have'),
    ).toBeInTheDocument()
    // CSV では上書きを選べない
    expect(within(dialog).queryByRole('radio', { name: /Overwrite/ })).not.toBeInTheDocument()
    const merge = within(dialog).getByRole('radio', { name: /Merge into existing words/ })
    expect(merge.closest('label')).toHaveTextContent(
      "The existing word's pronunciation and study progress take priority.",
    )
    await user.click(merge)
    await user.click(within(dialog).getByRole('button', { name: 'Import (1)' }))
    await waitFor(async () => expect((await db.words.get('tea'))?.meaning).toBe('お茶 / tea'))
    expect((await db.words.get('tea'))?.tags).toEqual(['飲み物'])
    expect(await db.words.count()).toBe(1)
  })

  it('重複単語の整理で、規則を示してから統合する', async () => {
    await db.words.bulkPut([
      makeWord({ id: 'old', hanzi: '水', pinyin: 'shuǐ', meaning: '水', createdAt: 1 }),
      makeWord({ id: 'new', hanzi: '水', pinyin: '', meaning: 'water', createdAt: 2 }),
    ])
    await db.progress.put({ modeId: 'flashcard', wordId: 'new', due: 5, state: {}, updatedAt: 9 })
    const user = userEvent.setup()
    renderApp()

    await user.click(await enabledButton('Organize duplicates (1)'))
    const dialog = screen.getByRole('dialog', { name: 'Organize duplicates' })
    expect(
      within(dialog).getByText(/The word registered first keeps its pronunciation/),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText(/the record you studied most recently is kept/),
    ).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Merge 1 selected groups' }))
    expect(within(dialog).getByText(/cannot be undone/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Merge 1 groups' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Merged 1 groups')
    expect(await db.words.toArray()).toMatchObject([{ id: 'old', meaning: '水 / water' }])
    expect(await db.progress.toArray()).toMatchObject([{ wordId: 'old', due: 5 }])
  })

  it('上書きは確認してから行い、戻ることもできる（FR-IO-03）', async () => {
    await db.words.put(makeWord({ id: 'tea', hanzi: '茶', pinyin: 'chá', meaning: 'お茶' }))
    const user = userEvent.setup()
    renderApp()
    await user.click(await screen.findByRole('button', { name: 'Add words from a file' }))
    const dialog = screen.getByRole('dialog', { name: 'Add words from a file' })
    const json = JSON.stringify({
      format: 'tc-vocab',
      version: 1,
      words: [{ hanzi: '茶', pinyin: 'chá', meaning: 'tea' }],
    })
    await user.upload(within(dialog).getByLabelText('Choose a file'), new File([json], 'b.json'))
    await user.click(await within(dialog).findByRole('radio', { name: /Overwrite/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Import (1)' }))

    expect(within(dialog).getByRole('alert')).toHaveTextContent('1 saved words will be overwritten')
    expect((await db.words.get('tea'))?.meaning).toBe('お茶')
    await user.click(within(dialog).getByRole('button', { name: 'Back' }))
    await user.click(within(dialog).getByRole('button', { name: 'Import (1)' }))
    await user.click(within(dialog).getByRole('button', { name: 'Overwrite and import (1)' }))
    await waitFor(async () => expect((await db.words.get('tea'))?.meaning).toBe('tea'))
  })
})

describe('単語の追加・編集（FR-WORDS-15〜18）', () => {
  it('単語を追加し、拼音から注音を自動で入れ、「保存して次へ」で続けて入力できる', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(await screen.findByRole('button', { name: 'Add a word' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add a word' })
    await user.type(within(dialog).getByRole('textbox', { name: /Traditional/ }), '捷運')
    await user.type(within(dialog).getByRole('textbox', { name: /Meaning/ }), 'MRT')
    await user.type(within(dialog).getByRole('textbox', { name: 'Pinyin' }), 'jie2yun4')
    await user.tab()
    // 数字の声調を直し、注音を埋める（FR-WORDS-18）
    expect(within(dialog).getByRole('textbox', { name: 'Pinyin' })).toHaveValue('jié yùn')
    expect(within(dialog).getByRole('textbox', { name: 'Zhuyin' })).toHaveValue('ㄐㄧㄝˊ ㄩㄣˋ')
    await user.click(within(dialog).getByRole('button', { name: 'Add an example' }))
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Example (traditional characters)' }),
      '坐捷運。',
    )
    await user.type(within(dialog).getByRole('combobox', { name: 'Add a tag' }), '交通{Enter}')
    await user.click(within(dialog).getByRole('button', { name: 'Save and add another' }))

    expect(await within(dialog).findByText(/Added “捷運”\. You can enter/)).toBeInTheDocument()
    expect(within(dialog).getByRole('textbox', { name: /Traditional/ })).toHaveValue('')
    // タグは残す
    expect(within(dialog).getByText('交通')).toBeInTheDocument()
    const [word] = await db.words.toArray()
    expect(word).toMatchObject({
      hanzi: '捷運',
      zhuyin: 'ㄐㄧㄝˊ ㄩㄣˋ',
      pinyin: 'jié yùn',
      meaning: 'MRT',
      examples: [{ text: '坐捷運。' }],
      tags: ['交通'],
    })
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('必須の項目が空なら項目の下に示し、保存しない', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(await screen.findByRole('button', { name: 'Add a word' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(within(dialog).getAllByText('This field is required.')).toHaveLength(2)
    expect(await db.words.count()).toBe(0)
  })

  it('重複を保存前に知らせ、既存の単語を開いて、「← 戻る」で入力中の内容に戻る（FR-WORDS-17）', async () => {
    await db.words.bulkPut([jieyun])
    const user = userEvent.setup()
    renderApp()
    await user.click(await enabledButton('Add a word'))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByRole('textbox', { name: /Traditional/ }), '捷運')
    await user.type(within(dialog).getByRole('textbox', { name: /Meaning/ }), 'metro')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(await within(dialog).findByText('This word is already registered')).toBeInTheDocument()
    expect(within(dialog).getByText(jieyun.meaning)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Open the existing word' }))
    expect(await screen.findByRole('dialog', { name: 'Edit word: 捷運' })).toBeInTheDocument()
    expect(within(dialog).getByRole('textbox', { name: /Meaning/ })).toHaveValue(jieyun.meaning)

    await user.click(
      within(dialog).getByRole('button', { name: 'Back to the word you were entering' }),
    )
    expect(await screen.findByRole('dialog', { name: 'Add a word' })).toBeInTheDocument()
    expect(within(dialog).getByRole('textbox', { name: /Meaning/ })).toHaveValue('metro')

    // このまま保存すると重複したまま追加する
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    await user.click(await within(dialog).findByRole('button', { name: 'Save anyway' }))
    await waitFor(async () => expect(await db.words.count()).toBe(2))
  })

  it('一覧から編集すると updatedAt だけを更新し、学習進捗は変えない（FR-WORDS-16）', async () => {
    const progress = {
      modeId: 'flashcard',
      wordId: 'jieyun',
      due: 5,
      state: { ease: 2.5 },
      updatedAt: 1,
    }
    await db.words.bulkPut([jieyun])
    await db.progress.put(progress)
    const user = userEvent.setup()
    renderApp()
    await user.click(await screen.findByRole('button', { name: 'Edit 捷運' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit word: 捷運' })
    const meaning = within(dialog).getByRole('textbox', { name: /Meaning/ })
    await user.clear(meaning)
    await user.type(meaning, 'metro')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Saved “捷運”.')).toBeInTheDocument()
    const word = await db.words.get('jieyun')
    expect(word).toMatchObject({ meaning: 'metro', createdAt: jieyun.createdAt })
    expect(word!.updatedAt).toBeGreaterThan(jieyun.updatedAt)
    expect(await db.progress.toArray()).toEqual([progress])
  })

  it('要確認:読み の単語で読みを直し、候補を使ってからタグを外して保存できる（M4.6）', async () => {
    await db.words.bulkPut([
      makeWord({ id: 'x', hanzi: '行', zhuyin: 'ㄏㄤˊ', pinyin: 'háng', tags: ['要確認:読み'] }),
    ])
    const user = userEvent.setup()
    renderApp()
    await user.click(await screen.findByRole('button', { name: 'Edit 行' }))
    const dialog = await screen.findByRole('dialog')
    const zhuyin = within(dialog).getByRole('textbox', { name: 'Zhuyin' })
    await user.clear(zhuyin)
    await user.type(zhuyin, 'ㄒㄧㄥˊ')
    await user.tab()
    // 注音と拼音が食い違うので、拼音の候補を示す
    expect(within(dialog).getByText(/do not match/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: /Use as pinyin/ }))
    expect(within(dialog).getByRole('textbox', { name: 'Pinyin' })).toHaveValue('xíng')
    await user.click(within(dialog).getByRole('button', { name: 'Remove the “要確認:読み” tag' }))
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(async () =>
      expect(await db.words.get('x')).toMatchObject({
        zhuyin: 'ㄒㄧㄥˊ',
        pinyin: 'xíng',
        tags: [],
      }),
    )
  })

  it('入力を変えたまま閉じようとすると、破棄してよいか確かめる', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(await screen.findByRole('button', { name: 'Add a word' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByRole('textbox', { name: /Traditional/ }), '茶')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(within(dialog).getByText(/not been saved/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Back to editing' }))
    expect(within(dialog).getByRole('textbox', { name: /Traditional/ })).toHaveValue('茶')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await user.click(within(dialog).getByRole('button', { name: 'Discard' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
