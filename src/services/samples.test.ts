import { afterEach, describe, expect, it, vi } from 'vitest'
import text from '../../public/samples/starter.json?raw'
import { db } from '../db/schema'
import { parseJson } from '../io/json'
import { findDuplicateGroups } from '../io/duplicates'
import { addSampleWords, SAMPLE_TAG, SAMPLES_URL } from './samples'

const file = parseJson(text)
const words = file.rows.map((r) => r.word!)

/** 注音の音節数（声調記号・軽声記号は音節に数えない） */
const syllables = (s: string) => s.split(' ').filter(Boolean).length

describe('サンプル単語のデータ（仕様書 11章）', () => {
  it('約50語あり、すべて検証を通る', () => {
    expect(file.rows.every((r) => r.errors.length === 0)).toBe(true)
    expect(words.length).toBeGreaterThanOrEqual(45)
    expect(words.length).toBeLessThanOrEqual(60)
  })

  it('すべてに「サンプル」タグと分類タグが付いている', () => {
    for (const w of words) {
      expect(w.tags).toContain(SAMPLE_TAG)
      expect(w.tags.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('重複が無い', () => {
    const asWords = words.map((w, i) => ({ ...w, id: `s${i}`, createdAt: i, updatedAt: i }))
    expect(findDuplicateGroups(asWords)).toEqual([])
  })

  it('字数・注音の音節数・拼音の音節数が一致する', () => {
    for (const w of words) {
      const chars = [...w.hanzi].length
      expect([w.hanzi, syllables(w.zhuyin)]).toEqual([w.hanzi, chars])
      expect([w.hanzi, syllables(w.pinyin)]).toEqual([w.hanzi, chars])
    }
  })
})

describe('addSampleWords', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('同梱ファイルを取り込み、2回目は登録済みとしてスキップする（FR-SMP-04）', async () => {
    const fetchMock = vi.fn(async () => new Response(text))
    vi.stubGlobal('fetch', fetchMock)

    expect(await addSampleWords()).toMatchObject({ added: words.length, updated: 0, skipped: 0 })
    expect(fetchMock).toHaveBeenCalledWith(SAMPLES_URL)
    expect(await db.words.where('tags').equals(SAMPLE_TAG).count()).toBe(words.length)

    expect(await addSampleWords()).toMatchObject({ added: 0, updated: 0, skipped: words.length })
  })

  it('取得に失敗したらエラーにする', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 404 })),
    )
    await expect(addSampleWords()).rejects.toThrow()
    expect(await db.words.count()).toBe(0)
  })
})
