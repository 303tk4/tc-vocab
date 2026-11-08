import { describe, expect, it } from 'vitest'
import { makeWord } from '../../test/fixtures'
import type { Progress } from '../../types/word'
import { db } from '../schema'
import {
  addTagToWords,
  InvalidTagError,
  removeTagEverywhere,
  removeTagFromWords,
  renameTag,
  setWordTags,
  summarizeAddTag,
} from './tags'

const NOW = 1_900_000_000_000
const tagsOf = async (id: string) => (await db.words.get(id))?.tags

describe('summarizeAddTag', () => {
  it('付ける単語・既に付いている単語・上限の単語を分ける', () => {
    const full = makeWord({ tags: Array.from({ length: 20 }, (_, i) => `t${i}`) })
    const has = makeWord({ tags: ['復習'] })
    const plain = makeWord()
    const s = summarizeAddTag([full, has, plain], ' 復習 ')
    expect(s.targets).toEqual([plain])
    expect(s).toMatchObject({ already: 1, overLimit: 1 })
  })
})

describe('タグの一括追加・削除（FR-WORDS-08）', () => {
  it('選択した単語にタグを付け、updatedAt を更新する', async () => {
    const a = makeWord({ id: 'a', tags: ['x'] })
    const b = makeWord({ id: 'b', tags: ['復習'] })
    const c = makeWord({ id: 'c' })
    await db.words.bulkPut([a, b, c])

    const r = await addTagToWords(['a', 'b', 'missing'], '復習', NOW)
    expect(r).toEqual({ added: 1, already: 1, overLimit: 0 })
    expect(await db.words.get('a')).toMatchObject({ tags: ['x', '復習'], updatedAt: NOW })
    expect(await db.words.get('b')).toEqual(b)
    expect(await db.words.get('c')).toEqual(c)
  })

  it('使えないタグ名は拒否する', async () => {
    await expect(addTagToWords(['a'], 'a;b')).rejects.toBeInstanceOf(InvalidTagError)
    await expect(addTagToWords(['a'], '  ')).rejects.toBeInstanceOf(InvalidTagError)
  })

  it('選択した単語からタグを外す', async () => {
    await db.words.bulkPut([
      makeWord({ id: 'a', tags: ['x', 'y'] }),
      makeWord({ id: 'b', tags: ['y'] }),
      makeWord({ id: 'c', tags: ['x'] }),
    ])
    expect(await removeTagFromWords(['a', 'b'], 'x', NOW)).toBe(1)
    expect(await tagsOf('a')).toEqual(['y'])
    expect(await tagsOf('c')).toEqual(['x'])
  })
})

describe('単語ごとのタグ編集（FR-WORDS-09）', () => {
  it('タグを置き換える（空白除去・重複除去）', async () => {
    await db.words.put(makeWord({ id: 'a', tags: ['old'] }))
    await setWordTags('a', [' 新 ', '新', '交通'], NOW)
    expect(await db.words.get('a')).toMatchObject({ tags: ['新', '交通'], updatedAt: NOW })
  })

  it('上限を超えるタグや不正なタグは保存しない', async () => {
    await db.words.put(makeWord({ id: 'a', tags: ['old'] }))
    const many = Array.from({ length: 21 }, (_, i) => `t${i}`)
    await expect(setWordTags('a', many)).rejects.toBeInstanceOf(InvalidTagError)
    await expect(setWordTags('a', ['a;b'])).rejects.toBeInstanceOf(InvalidTagError)
    expect(await tagsOf('a')).toEqual(['old'])
  })
})

describe('タグの名前変更・削除（FR-WORDS-10・11）', () => {
  it('名前を変える。既にあるタグ名なら1つにまとめる', async () => {
    await db.words.bulkPut([
      makeWord({ id: 'a', tags: ['旧', 'x'] }),
      makeWord({ id: 'b', tags: ['新', '旧'] }),
      makeWord({ id: 'c', tags: ['x'] }),
    ])
    expect(await renameTag('旧', ' 新 ', NOW)).toBe(2)
    expect(await tagsOf('a')).toEqual(['新', 'x'])
    expect(await tagsOf('b')).toEqual(['新'])
    expect((await db.words.get('c'))?.updatedAt).not.toBe(NOW)
  })

  it('全単語からタグを外しても、単語と学習進捗は残る', async () => {
    const progress: Progress = { modeId: 'm', wordId: 'a', due: 1, state: {}, updatedAt: 1 }
    await db.words.bulkPut([makeWord({ id: 'a', tags: ['サンプル', 'x'] }), makeWord({ id: 'b' })])
    await db.progress.put(progress)

    expect(await removeTagEverywhere('サンプル', NOW)).toBe(1)
    expect(await tagsOf('a')).toEqual(['x'])
    expect(await db.words.count()).toBe(2)
    expect(await db.progress.toArray()).toEqual([progress])
  })
})
