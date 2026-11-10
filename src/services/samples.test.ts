import { afterEach, describe, expect, it, vi } from 'vitest'
import jaText from '../../public/samples/starter.json?raw'
import enText from '../../public/samples/starter-en.json?raw'
import { db } from '../db/schema'
import { parseJson } from '../io/json'
import { findDuplicateGroups } from '../io/duplicates'
import { addSampleWords, SAMPLE_TAG, sampleLanguageFor, samplesUrl } from './samples'

const file = parseJson(jaText)
const words = file.rows.map((r) => r.word!)
const enFile = parseJson(enText)
const enWords = enFile.rows.map((r) => r.word!)

/** 注音の音節数（声調記号・軽声記号は音節に数えない） */
const syllables = (s: string) => s.split(' ').filter(Boolean).length

describe('サンプル単語のデータ（仕様書 11章）', () => {
  it('約50語あり、すべて検証を通る', () => {
    expect(file.rows.every((r) => r.errors.length === 0)).toBe(true)
    expect(words.length).toBeGreaterThanOrEqual(45)
    expect(words.length).toBeLessThanOrEqual(60)
  })

  it('すべてに「sample」タグだけが付いている（FR-SMP-02）', () => {
    for (const w of words) {
      expect(w.tags).toContain(SAMPLE_TAG)
      expect(w.tags).toEqual([SAMPLE_TAG])
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

  it('英語版は日本語版と同じ単語・読み・例文・タグで、意味と訳だけが異なる（FR-SMP-01）', () => {
    expect(enFile.rows.every((r) => r.errors.length === 0)).toBe(true)
    const shape = (w: (typeof words)[number]) => ({
      hanzi: w.hanzi,
      zhuyin: w.zhuyin,
      pinyin: w.pinyin,
      examples: w.examples.map((e) => e.text),
      tags: w.tags,
    })
    expect(enWords.map(shape)).toEqual(words.map(shape))
    enWords.forEach((w, i) => {
      expect(w.meaning).not.toBe(words[i]!.meaning)
      // 英語版の意味と訳に日本語の仮名が残っていない
      expect(w.meaning).not.toMatch(/[぀-ヿ]/)
      for (const e of w.examples) expect(e.translation).not.toMatch(/[぀-ヿ]/)
    })
  })
})

describe('sampleLanguageFor（仕様書 11章）', () => {
  it('UI 言語が日本語なら日本語版、それ以外は英語版', () => {
    expect(sampleLanguageFor('ja')).toBe('ja')
    expect(sampleLanguageFor('ja-JP')).toBe('ja')
    expect(sampleLanguageFor('en')).toBe('en')
    expect(sampleLanguageFor('zh-TW')).toBe('en')
  })
})

describe('addSampleWords', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('同梱ファイルを取り込み、2回目は登録済みとしてスキップする（FR-SMP-04）', async () => {
    const fetchMock = vi.fn(async () => new Response(jaText))
    vi.stubGlobal('fetch', fetchMock)

    expect(await addSampleWords('ja')).toMatchObject({
      added: words.length,
      updated: 0,
      skipped: 0,
    })
    expect(fetchMock).toHaveBeenCalledWith(samplesUrl('ja'))
    expect(await db.words.where('tags').equals(SAMPLE_TAG).count()).toBe(words.length)

    expect(await addSampleWords('ja')).toMatchObject({
      added: 0,
      updated: 0,
      skipped: words.length,
    })
  })

  it('英語版を読み込む。日本語版を追加済みなら、重複としてスキップする', async () => {
    const fetchMock = vi.fn(
      async (url: string) => new Response(url.endsWith('starter-en.json') ? enText : jaText),
    )
    vi.stubGlobal('fetch', fetchMock)
    await addSampleWords('ja')
    expect(await addSampleWords('en')).toMatchObject({ added: 0, skipped: words.length })
    expect(fetchMock).toHaveBeenLastCalledWith(samplesUrl('en'))
    expect(samplesUrl('en')).toMatch(/samples\/starter-en\.json$/)
  })

  it('取得に失敗したらエラーにする', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 404 })),
    )
    await expect(addSampleWords('ja')).rejects.toThrow()
    expect(await db.words.count()).toBe(0)
  })
})
