import { afterEach, describe, expect, it, vi } from 'vitest'
import { getInstalledPacks } from '../db/repos/packs'
import { buildJson } from '../io/json'
import { makeWord } from '../test/fixtures'
import { addPack, fetchPack, fetchPackIndex, PACK_INDEX_URL } from './packs'

describe('単語パッケージの読み込み（仕様書 16.5）', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('一覧がまだ公開されていない（404）ときは空の一覧とする', async () => {
    const fetchMock = vi.fn(async () => new Response('', { status: 404 }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await fetchPackIndex()).toEqual([])
    expect(fetchMock).toHaveBeenCalledWith(PACK_INDEX_URL, { cache: 'no-cache' })
  })

  it('一覧の代わりに HTML が返ったときも空の一覧とする', async () => {
    const html = new Response('<!doctype html>', { headers: { 'content-type': 'text/html' } })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => html),
    )
    expect(await fetchPackIndex()).toEqual([])
  })

  it('一覧の読み込みに失敗したら例外にする', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 500 })),
    )
    await expect(fetchPackIndex()).rejects.toThrow()
  })

  it('パッケージを追加し、追加した版を記録する', async () => {
    const text = buildJson([makeWord({ id: 'a', hanzi: '茶', tags: ['TOCFL'] })])
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(text)),
    )
    const file = await fetchPack({ file: 'tocfl.json' })
    const result = await addPack({ id: 'tocfl', version: 3 }, file, 'tagOnly')
    expect(result.added).toBe(1)
    expect(await getInstalledPacks()).toEqual({ tocfl: 3 })
  })
})
