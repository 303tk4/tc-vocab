import { describe, expect, it } from 'vitest'
import { makeWord } from '../test/fixtures'
import type { Progress } from '../types/word'
import {
  DuplicateIndex,
  findDuplicateGroups,
  isDuplicate,
  mergeWords,
  pickProgress,
} from './duplicates'

const NOW = 1_800_000_000_000

describe('isDuplicate（仕様書 6.1）', () => {
  it('繁体字と拼音（大文字・小文字、前後の空白は問わない）が同じなら重複', () => {
    expect(isDuplicate({ hanzi: '行', pinyin: ' Xíng ' }, { hanzi: '行', pinyin: 'xíng' })).toBe(
      true,
    )
  })

  it('拼音が違えば別の単語', () => {
    expect(isDuplicate({ hanzi: '行', pinyin: 'xíng' }, { hanzi: '行', pinyin: 'háng' })).toBe(
      false,
    )
  })

  it('どちらかの拼音が空なら、繁体字だけで判定する', () => {
    expect(isDuplicate({ hanzi: '水', pinyin: '' }, { hanzi: '水', pinyin: 'shuǐ' })).toBe(true)
    expect(isDuplicate({ hanzi: '水', pinyin: '' }, { hanzi: '火', pinyin: '' })).toBe(false)
  })
})

describe('DuplicateIndex', () => {
  it('拼音まで一致するものを優先して返す', () => {
    const xing = makeWord({ hanzi: '行', pinyin: 'xíng' })
    const empty = makeWord({ hanzi: '行', pinyin: '' })
    const index = new DuplicateIndex([empty, xing])
    expect(index.find({ hanzi: '行', pinyin: 'xíng' })).toBe(xing)
    expect(index.find({ hanzi: '行', pinyin: 'háng' })).toBe(empty)
    expect(index.find({ hanzi: '走', pinyin: '' })).toBeUndefined()
  })
})

describe('findDuplicateGroups（FR-WORDS-13）', () => {
  it('重複の組を、先に登録した順に並べて返す', () => {
    const newer = makeWord({ id: 'b', hanzi: '水', pinyin: '', createdAt: 2 })
    const older = makeWord({ id: 'a', hanzi: '水', pinyin: 'shuǐ', createdAt: 1 })
    const other = makeWord({ hanzi: '火', pinyin: 'huǒ' })
    expect(findDuplicateGroups([newer, other, older]).map((g) => g.map((w) => w.id))).toEqual([
      ['a', 'b'],
    ])
  })

  it('同じ繁体字で拼音が2種類あれば拼音ごとに組にし、拼音が空の単語は含めない', () => {
    const words = [
      makeWord({ id: 'x1', hanzi: '行', pinyin: 'xíng', createdAt: 1 }),
      makeWord({ id: 'h1', hanzi: '行', pinyin: 'háng', createdAt: 2 }),
      makeWord({ id: 'x2', hanzi: '行', pinyin: 'Xíng', createdAt: 3 }),
      makeWord({ id: 'e', hanzi: '行', pinyin: '', createdAt: 4 }),
    ]
    expect(findDuplicateGroups(words).map((g) => g.map((w) => w.id))).toEqual([['x1', 'x2']])
  })
})

describe('mergeWords（仕様書 4.5 の統合の規則）', () => {
  const older = makeWord({
    id: 'old',
    hanzi: '水',
    zhuyin: '',
    pinyin: 'shuǐ',
    meaning: '水',
    examples: [{ text: '喝水。' }],
    tags: ['基本'],
    createdAt: 1,
  })
  const newer = makeWord({
    id: 'new',
    hanzi: '水',
    zhuyin: 'ㄕㄨㄟˇ',
    pinyin: 'shuí',
    meaning: 'water',
    examples: [{ text: '喝水。', translation: '水を飲む。' }, { text: '水很冰。' }],
    tags: ['飲み物', '基本'],
    createdAt: 2,
  })

  it('先の単語の id と読みを残し、空の読みは他方で補い、意味・例文・タグは両方残す', () => {
    const result = mergeWords([older, newer], NOW)
    expect(result).toEqual({
      ok: true,
      word: {
        id: 'old',
        hanzi: '水',
        zhuyin: 'ㄕㄨㄟˇ',
        pinyin: 'shuǐ',
        meaning: '水 / water',
        examples: [{ text: '喝水。', translation: '水を飲む。' }, { text: '水很冰。' }],
        tags: ['基本', '飲み物'],
        createdAt: 1,
        updatedAt: NOW,
      },
    })
  })

  it('同じ意味は1つにまとめる', () => {
    const result = mergeWords([older, { ...newer, meaning: '水' }], NOW)
    expect(result.ok && result.word.meaning).toBe('水')
  })

  it('上限を超える組は統合しない', () => {
    const many = (n: number, p: string) => Array.from({ length: n }, (_, i) => `${p}${i}`)
    expect(
      mergeWords(
        [
          { ...older, tags: many(12, 'a') },
          { ...newer, tags: many(12, 'b') },
        ],
        NOW,
      ),
    ).toEqual({ ok: false, overflow: 'tags' })
    expect(
      mergeWords(
        [
          { ...older, meaning: 'a'.repeat(300) },
          { ...newer, meaning: 'b'.repeat(300) },
        ],
        NOW,
      ),
    ).toEqual({ ok: false, overflow: 'meaning' })
  })
})

describe('pickProgress', () => {
  it('学習モードごとに最後に学習した記録を残し、残す単語の id に付け替える', () => {
    const p = (modeId: string, wordId: string, updatedAt: number): Progress => ({
      modeId,
      wordId,
      due: updatedAt,
      state: {},
      updatedAt,
    })
    expect(
      pickProgress(
        [p('flashcard', 'old', 10), p('flashcard', 'new', 20), p('quiz', 'old', 5)],
        'old',
      ),
    ).toEqual([{ ...p('flashcard', 'new', 20), wordId: 'old' }, p('quiz', 'old', 5)])
  })
})
