import { describe, expect, it, vi } from 'vitest'
import { buildCsv, parseCsv } from '../../io/csv'
import { buildJson, parseJson } from '../../io/json'
import { jieyun, makeWord, tricky } from '../../test/fixtures'
import type { Progress } from '../../types/word'
import { requestPersistentStorage } from '../../services/storage-persist'
import { db } from '../schema'
import {
  deleteAllData,
  deleteWords,
  importWords,
  listProgressForWords,
  listWords,
  mergeDuplicateGroups,
} from './words'

vi.mock('../../services/storage-persist', () => ({
  requestPersistentStorage: vi.fn(() => Promise.resolve(true)),
}))

const progress: Progress[] = [
  { modeId: 'flashcard', wordId: 'jieyun', due: 5, state: { ease: 2.5 }, updatedAt: 1 },
  { modeId: 'flashcard', wordId: 'tricky', due: null, state: { ease: 2.3 }, updatedAt: 2 },
]

async function seed() {
  await db.words.bulkPut([jieyun, tricky])
  await db.progress.bulkPut(progress)
}

const byId = <T extends { id: string }>(list: T[]) =>
  [...list].sort((a, b) => a.id.localeCompare(b.id))

describe('JSON の往復（仕様書 9.5）', () => {
  it('エクスポートしてから空の DB に取り込むと、単語と進捗が元に戻る', async () => {
    await seed()
    const words = await listWords()
    const json = buildJson(words, await listProgressForWords(words.map((w) => w.id)))

    await deleteAllData()
    const result = await importWords(parseJson(json), { strategy: 'skip' })

    expect(result).toMatchObject({ added: 2, updated: 0, skipped: 0 })
    expect(byId(await listWords())).toEqual(byId([jieyun, tricky]))
    expect(await db.progress.toArray()).toEqual(expect.arrayContaining(progress))
    expect(await db.progress.count()).toBe(2)
  })

  it('同じファイルをもう一度取り込むと、スキップで何も変わらない', async () => {
    await seed()
    const json = buildJson(await listWords())
    expect(await importWords(parseJson(json), { strategy: 'skip' })).toMatchObject({
      added: 0,
      updated: 0,
      skipped: 2,
    })
    expect(await db.words.count()).toBe(2)
  })
})

describe('CSV の往復（仕様書 9.5）', () => {
  it('例文が1件以下の単語は、全項目が元に戻る', async () => {
    await seed()
    const csv = buildCsv(await listWords())
    await deleteAllData()
    await importWords(parseCsv(csv), { strategy: 'skip' })

    const strip = ({ hanzi, zhuyin, pinyin, meaning, examples, tags }: typeof jieyun) => ({
      hanzi,
      zhuyin,
      pinyin,
      meaning,
      examples,
      tags,
    })
    const sortByHanzi = <T extends { hanzi: string }>(list: T[]) =>
      [...list].sort((a, b) => a.hanzi.localeCompare(b.hanzi))
    expect(sortByHanzi((await listWords()).map(strip))).toEqual(
      sortByHanzi([jieyun, tricky].map(strip)),
    )
  })
})

describe('取り込みのトランザクション（FR-IO-06）', () => {
  it('単語を書き込んだ後、進捗の書き込みで失敗したら単語も取り込まない', async () => {
    const word = makeWord()
    const file = parseJson(
      buildJson([word], [{ modeId: 'm', wordId: word.id, due: 1, state: {}, updatedAt: 1 }]),
    )
    const spy = vi.spyOn(db.progress, 'bulkPut').mockRejectedValueOnce(new Error('boom'))
    await expect(importWords(file, { strategy: 'skip' })).rejects.toThrow('boom')
    spy.mockRestore()
    expect(await db.words.count()).toBe(0)
  })
})

describe('削除', () => {
  it('単語を削除すると、その単語の進捗も削除する', async () => {
    await seed()
    await deleteWords(['jieyun'])
    expect((await listWords()).map((w) => w.id)).toEqual(['tricky'])
    expect((await db.progress.toArray()).map((p) => p.wordId)).toEqual(['tricky'])
  })

  it('全データの削除では設定を残す', async () => {
    await seed()
    await db.sessions.add({ modeId: 'm', startedAt: 1, finishedAt: 2, summary: {} })
    await db.settings.put({ key: 'app.theme', value: 'dark' })
    await deleteAllData()
    expect(await db.words.count()).toBe(0)
    expect(await db.progress.count()).toBe(0)
    expect(await db.sessions.count()).toBe(0)
    expect(await db.settings.count()).toBe(1)
  })
})

describe('重複単語の統合（FR-WORDS-13）', () => {
  const progress = (wordId: string, updatedAt: number): Progress => ({
    modeId: 'flashcard',
    wordId,
    due: updatedAt,
    state: { n: updatedAt },
    updatedAt,
  })

  it('先に登録した単語を残し、最後に学習した進捗を付け替える', async () => {
    const older = makeWord({ id: 'old', hanzi: '水', pinyin: 'shuǐ', meaning: '水', createdAt: 1 })
    const newer = makeWord({ id: 'new', hanzi: '水', pinyin: '', meaning: 'water', createdAt: 2 })
    await db.words.bulkPut([older, newer])
    await db.progress.bulkPut([progress('old', 10), progress('new', 20)])

    expect(await mergeDuplicateGroups([['new', 'old']], 99)).toEqual({
      merged: 1,
      removed: 1,
      skipped: 0,
    })
    expect(await db.words.toArray()).toEqual([{ ...older, meaning: '水 / water', updatedAt: 99 }])
    expect(await db.progress.toArray()).toEqual([{ ...progress('new', 20), wordId: 'old' }])
  })

  it('重複ではなくなった組は統合しない', async () => {
    await db.words.bulkPut([
      makeWord({ id: 'a', hanzi: '行', pinyin: 'xíng' }),
      makeWord({ id: 'b', hanzi: '行', pinyin: 'háng' }),
    ])
    expect(await mergeDuplicateGroups([['a', 'b']])).toMatchObject({ merged: 0, skipped: 1 })
    expect(await db.words.count()).toBe(2)
  })

  it('取り込みの統合では、既存の単語の学習進捗を優先する', async () => {
    await db.words.put(makeWord({ id: 'tea', hanzi: '茶', pinyin: 'chá' }))
    await db.progress.put(progress('tea', 10))
    const json = JSON.stringify({
      format: 'tc-vocab',
      version: 1,
      words: [{ id: 'f', hanzi: '茶', pinyin: 'chá', meaning: 'tea' }],
      progress: [progress('f', 50)],
    })
    const result = await importWords(parseJson(json), { strategy: 'merge' })
    expect(result).toMatchObject({ merged: 1, added: 0 })
    expect(await db.progress.toArray()).toEqual([progress('tea', 10)])
  })
})

describe('保護の要求（FR-PWA-04）', () => {
  it('単語を追加したときに要求し、何も追加しなかったときは要求しない', async () => {
    const request = vi.mocked(requestPersistentStorage)
    request.mockClear()
    const json = buildJson([jieyun])

    await importWords(parseJson(json), { strategy: 'skip' })
    expect(request).toHaveBeenCalledOnce()

    request.mockClear()
    const result = await importWords(parseJson(json), { strategy: 'skip' })
    expect(result.added).toBe(0)
    expect(request).not.toHaveBeenCalled()
  })
})
