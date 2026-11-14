import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createProgressStore } from '../../db/repos/progress'
import { createModeSettingsStore } from '../../db/repos/settings'
import i18n from '../../i18n'
import { makeWord } from '../../test/fixtures'
import type { Word, WordContent } from '../../types/word'
import type { SessionProps } from '../types'
import type { FlashcardOptions } from './options'
import Session from './Session'

const progress = createProgressStore('flashcard')
const modeSettings = createModeSettingsStore('flashcard')

function renderSession(words: Word[], overrides: Partial<SessionProps<FlashcardOptions>> = {}) {
  const props: SessionProps<FlashcardOptions> = {
    words,
    options: { direction: 'hanziToMeaning' },
    progress,
    modeSettings,
    services: {
      speak: vi.fn(),
      canSpeak: true,
      settings: { uiLanguage: 'en', fontScale: 'md', theme: 'system', accent: 'red' },
      tags: {
        list: vi.fn().mockResolvedValue(['交通', '重点']),
        setWordTags: vi.fn((_id: string, tags: string[]) => Promise.resolve(tags)),
      },
      words: {
        update: vi.fn((id: string, content: WordContent) =>
          Promise.resolve({ ...makeWord({ id }), ...content }),
        ),
        findDuplicate: vi.fn().mockResolvedValue(undefined),
      },
    },
    onFinish: vi.fn(),
    onAbort: vi.fn(),
    ...overrides,
  }
  render(<Session {...props} />)
  return props
}

beforeEach(async () => {
  await i18n.changeLanguage('en')
})

describe('暗記カードのセッション', () => {
  it('キーボードで裏返して評価し、「もう一度」は再出題して、最後に集計を渡す', async () => {
    const user = userEvent.setup()
    const a = makeWord({ id: 'a', hanzi: '捷運', createdAt: 1 })
    const b = makeWord({ id: 'b', hanzi: '公車', createdAt: 2 })
    const props = renderSession([a, b])

    expect(await screen.findByText('Card 1 of 2')).toBeInTheDocument()
    expect(screen.getByText('捷運')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /Rate/ })).not.toBeInTheDocument()

    await user.keyboard(' ')
    expect(screen.getByRole('button', { name: /^Good/ })).toHaveTextContent('7 d')
    expect(screen.getByRole('button', { name: /^Perfect/ })).toHaveTextContent('1 y')
    await user.keyboard('3')
    await waitFor(async () => expect((await progress.get('a'))?.due).toBeGreaterThan(Date.now()))

    // 2枚目を「もう一度」→ 最後に再出題される
    expect(await screen.findByText('公車')).toBeInTheDocument()
    await user.keyboard(' ')
    await user.click(screen.getByRole('button', { name: /Again/ }))
    expect(await screen.findByText('Card 3 of 3')).toBeInTheDocument()
    expect(screen.getByText('公車')).toBeInTheDocument()

    await user.keyboard(' ')
    await user.keyboard('3')
    await waitFor(() => expect(props.onFinish).toHaveBeenCalledTimes(1))
    const { summary } = vi.mocked(props.onFinish).mock.calls[0][0]
    expect(summary).toMatchObject({ studied: 2, again: 1, hard: 0, good: 2, easy: 0, perfect: 0 })
    // 「もう一度」の後に「普通」とした1語だけが翌日に期限が来る
    expect(summary.dueTomorrow).toBe(1)
  })

  it('裏面に注音・拼音・例文を表示し、設定で注音を隠せる（FR-FC-11・12）', async () => {
    const user = userEvent.setup()
    await modeSettings.set('showZhuyin', false)
    const word = makeWord({
      hanzi: '捷運',
      zhuyin: 'ㄐㄧㄝˊ ㄩㄣˋ',
      pinyin: 'jié yùn',
      examples: [{ text: '我坐捷運。', translation: 'MRT に乗る。' }],
    })
    renderSession([word])
    await user.click(await screen.findByRole('button', { name: /捷運/ }))
    expect(screen.queryByText('ㄐㄧㄝˊ ㄩㄣˋ')).not.toBeInTheDocument()
    expect(screen.getByText('jié yùn')).toBeInTheDocument()
    expect(screen.getByText('我坐捷運。')).toHaveAttribute('lang', 'zh-TW')
    expect(screen.getByRole('button', { name: 'Speak the example' })).toBeInTheDocument()
  })

  it('一回の出題数までにする（FR-FC-02、版 1.41）', async () => {
    renderSession([makeWord(), makeWord(), makeWord()], { sessionSize: 2 })
    expect(await screen.findByText('Card 1 of 2')).toBeInTheDocument()
  })

  it('出題対象が0件なら次の予定を示す（FR-FC-03）', async () => {
    const studied = makeWord({ id: 'done' })
    await progress.put('done', Date.now() + 86_400_000, {
      reps: 1,
      interval: 1,
      ease: 2.5,
      introducedAt: Date.now(),
    })
    renderSession([studied])

    expect(await screen.findByText('No cards to study today')).toBeInTheDocument()
    expect(screen.getByText(/Next review:/)).toBeInTheDocument()
    // 1日の上限が無くなったので、「新規カードを追加で学習する」は出さない（版 1.41）
    expect(screen.queryByRole('button', { name: /Study extra/ })).not.toBeInTheDocument()
  })

  it('1枚も評価せずに Esc で中断するとホームへ戻る（FR-FC-32）', async () => {
    const user = userEvent.setup()
    const props = renderSession([makeWord()])
    await screen.findByText('Card 1 of 1')
    await user.keyboard('{Escape}')
    expect(props.onAbort).toHaveBeenCalled()
    expect(props.onFinish).not.toHaveBeenCalled()
  })

  it('評価の保存に失敗したら通知し、次へ進まない（NFR-07）', async () => {
    const user = userEvent.setup()
    const failing = { ...progress, put: vi.fn().mockRejectedValue(new Error('quota')) }
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderSession([makeWord(), makeWord()], { progress: failing })
    await screen.findByText('Card 1 of 2')
    await user.keyboard(' ')
    await user.keyboard('3')
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save your rating')
    expect(screen.getByText('Card 1 of 2')).toBeInTheDocument()
  })

  it('5 キーで「完璧」と評価し、1年後に期限を置く（FR-FC-20・31）', async () => {
    const user = userEvent.setup()
    renderSession([makeWord({ id: 'easy' })])
    await screen.findByText('Card 1 of 1')
    await user.keyboard(' ')
    await user.keyboard('5')
    await waitFor(async () =>
      expect((await progress.get('easy'))?.state).toMatchObject({ reps: 1, interval: 365 }),
    )
  })

  it('裏面でタグを編集すると保存して表示に反映し、編集中はキー操作を受け付けない（FR-FC-15）', async () => {
    const user = userEvent.setup()
    const props = renderSession([makeWord({ id: 'w', hanzi: '捷運', tags: ['交通'] })])
    await screen.findByText('Card 1 of 1')
    await user.keyboard(' ')
    await user.keyboard('t')
    const dialog = await screen.findByRole('dialog', { name: /捷運/ })
    await user.type(within(dialog).getByRole('combobox'), '重点{Enter}')
    // ダイアログの入力中に数字を打っても評価しない
    await user.keyboard('3')
    expect(props.onFinish).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(props.services.tags.setWordTags).toHaveBeenCalledWith('w', ['交通', '重点'])
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('重点')).toBeInTheDocument()
  })

  it('タグの保存に失敗したらダイアログ内で知らせる（NFR-07）', async () => {
    const user = userEvent.setup()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const props = renderSession([makeWord({ tags: [] })])
    vi.mocked(props.services.tags.setWordTags).mockRejectedValue(new Error('quota'))
    await screen.findByText('Card 1 of 1')
    await user.keyboard(' ')
    await user.click(screen.getByRole('button', { name: 'Edit tags' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByRole('combobox'), 'x{Enter}')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Could not save the tags')
  })

  it('裏面の「単語を編集」（E キー）で内容を直すと、表示に反映し、学習進捗は変えない（FR-FC-16）', async () => {
    const user = userEvent.setup()
    const props = renderSession([
      makeWord({ id: 'w', hanzi: '行', zhuyin: 'ㄏㄤˊ', pinyin: 'háng', meaning: 'row' }),
    ])
    await screen.findByText('Card 1 of 1')
    await user.keyboard(' ')
    await user.keyboard('e')
    const dialog = await screen.findByRole('dialog', { name: /行/ })
    const zhuyin = within(dialog).getByRole('textbox', { name: 'Zhuyin' })
    await user.clear(zhuyin)
    await user.type(zhuyin, 'ㄒㄧㄥˊ')
    await user.clear(within(dialog).getByRole('textbox', { name: 'Pinyin' }))
    // 注音から拼音を自動で入れる（FR-WORDS-18）
    await user.click(within(dialog).getByRole('textbox', { name: /Meaning/ }))
    expect(within(dialog).getByRole('textbox', { name: 'Pinyin' })).toHaveValue('xíng')
    // 入力中に数字を打っても評価しない
    await user.keyboard('3')
    expect(props.onFinish).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(props.services.words.update).toHaveBeenCalledWith(
      'w',
      expect.objectContaining({ zhuyin: 'ㄒㄧㄥˊ', pinyin: 'xíng', meaning: 'row3' }),
    )
    expect(screen.getByText('xíng')).toBeInTheDocument()
    expect(await props.progress.list()).toEqual([])
  })

  it('学習中の重複の確認では「既存の単語を開く」を出さない（FR-FC-16）', async () => {
    const user = userEvent.setup()
    const props = renderSession([makeWord({ id: 'w', hanzi: '行', pinyin: 'háng' })])
    vi.mocked(props.services.words.findDuplicate).mockResolvedValue(
      makeWord({ id: 'other', hanzi: '行', pinyin: 'xíng' }),
    )
    await screen.findByText('Card 1 of 1')
    await user.keyboard(' ')
    await user.click(screen.getByRole('button', { name: 'Edit word' }))
    const dialog = await screen.findByRole('dialog')
    const pinyin = within(dialog).getByRole('textbox', { name: 'Pinyin' })
    await user.clear(pinyin)
    await user.type(pinyin, 'xíng')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(await within(dialog).findByText('This word is already registered')).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Open the existing word' })).toBeNull()
    await user.click(within(dialog).getByRole('button', { name: 'Save anyway' }))
    await waitFor(() => expect(props.services.words.update).toHaveBeenCalled())
  })
})

describe('表面の読み上げと自動再生（FR-FC-14・17）', () => {
  it('「繁体字→意味」の表面に読み上げボタンがあり、押しても裏返さない', async () => {
    const user = userEvent.setup()
    const props = renderSession([makeWord({ hanzi: '捷運' })])
    const button = await screen.findByRole('button', { name: 'Speak the characters' })
    await user.click(button)
    expect(props.services.speak).toHaveBeenCalledWith('捷運')
    expect(screen.queryByRole('group', { name: /Rate/ })).not.toBeInTheDocument()
    // カードのほかの部分（裏返すボタン）を押すと裏返す
    await user.click(screen.getByRole('button', { name: /捷運/ }))
    expect(screen.getByRole('group', { name: /Rate/ })).toBeInTheDocument()
  })

  it('「意味→繁体字」の表面には置かない（答えが分かるため。8.4）', async () => {
    renderSession([makeWord()], { options: { direction: 'meaningToHanzi' } })
    expect(await screen.findByText('Card 1 of 1')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Speak the characters' })).not.toBeInTheDocument()
  })

  it('読み上げに対応していない環境では置かない', async () => {
    renderSession([makeWord()], {
      services: {
        speak: vi.fn(),
        canSpeak: false,
        settings: { uiLanguage: 'en', fontScale: 'md', theme: 'system', accent: 'red' },
        tags: { list: vi.fn(), setWordTags: vi.fn() },
        words: { update: vi.fn(), findDuplicate: vi.fn() },
      },
    })
    expect(await screen.findByText('Card 1 of 1')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Speak the characters' })).not.toBeInTheDocument()
  })

  it('自動再生がオンなら裏返したときに読み上げ、オフなら読み上げない', async () => {
    const user = userEvent.setup()
    const on = renderSession([makeWord({ hanzi: '捷運' })], { autoSpeak: true })
    await screen.findByText('Card 1 of 1')
    await user.keyboard(' ')
    expect(on.services.speak).toHaveBeenCalledWith('捷運')
  })

  it('自動再生がオフ（初期値）なら、裏返しても読み上げない', async () => {
    const user = userEvent.setup()
    const off = renderSession([makeWord({ hanzi: '捷運' })])
    await screen.findByText('Card 1 of 1')
    await user.keyboard(' ')
    expect(screen.getByRole('group', { name: /Rate/ })).toBeInTheDocument()
    expect(off.services.speak).not.toHaveBeenCalled()
  })
})
