import { describe, expect, it } from 'vitest'
import { duplicateKey, normalizeWord } from './validate'

describe('normalizeWord', () => {
  it('前後の空白を除き、省略可能な項目を補う', () => {
    expect(normalizeWord({ hanzi: ' 捷運 ', meaning: ' MRT ' })).toEqual({
      ok: true,
      word: { hanzi: '捷運', zhuyin: '', pinyin: '', meaning: 'MRT', examples: [], tags: [] },
    })
  })

  it('タグの空白・空文字・重複を整理する', () => {
    const result = normalizeWord({ hanzi: '茶', meaning: 'お茶', tags: [' 飲み物', '', '飲み物'] })
    expect(result.ok && result.word.tags).toEqual(['飲み物'])
  })

  it('例文の訳が空なら translation を省き、空の例文は無視する', () => {
    const result = normalizeWord({
      hanzi: '茶',
      meaning: 'お茶',
      examples: [{ text: '喝茶', translation: '' }, { text: ' ' }],
    })
    expect(result.ok && result.word.examples).toEqual([{ text: '喝茶' }])
  })

  it('id と日時は正しい値のときだけ引き継ぐ', () => {
    const ok = normalizeWord({ id: 'a', hanzi: '茶', meaning: 'お茶', createdAt: 1, updatedAt: 2 })
    expect(ok.ok && ok.word).toMatchObject({ id: 'a', createdAt: 1, updatedAt: 2 })
    const ng = normalizeWord({ id: 3, hanzi: '茶', meaning: 'お茶', createdAt: 'x' })
    expect(ng.ok && ng.word).not.toHaveProperty('id')
    expect(ng.ok && ng.word).not.toHaveProperty('createdAt')
  })

  it.each([
    [null, [{ code: 'notObject', field: 'word' }]],
    [{ meaning: 'x' }, [{ code: 'required', field: 'hanzi' }]],
    [{ hanzi: '茶', meaning: '  ' }, [{ code: 'required', field: 'meaning' }]],
    [{ hanzi: '字'.repeat(51), meaning: 'x' }, [{ code: 'tooLong', field: 'hanzi', max: 50 }]],
    [{ hanzi: 1, meaning: 'x' }, [{ code: 'invalidType', field: 'hanzi' }]],
    [{ hanzi: '茶', meaning: 'x', tags: 'a' }, [{ code: 'invalidType', field: 'tags' }]],
    [
      { hanzi: '茶', meaning: 'x', tags: Array.from({ length: 21 }, (_, i) => `t${i}`) },
      [{ code: 'tooMany', field: 'tags', max: 20 }],
    ],
    [
      { hanzi: '茶', meaning: 'x', examples: Array.from({ length: 11 }, () => ({ text: 'a' })) },
      [{ code: 'tooMany', field: 'examples', max: 10 }],
    ],
    [
      { hanzi: '茶', meaning: 'x', examples: [{ translation: '訳だけ' }] },
      [{ code: 'invalidType', field: 'examples' }],
    ],
  ])('不正な値を検出する %#', (raw, errors) => {
    expect(normalizeWord(raw)).toEqual({ ok: false, errors })
  })

  it('サロゲートペアは1文字と数える', () => {
    expect(normalizeWord({ hanzi: '𠮷'.repeat(50), meaning: 'x' }).ok).toBe(true)
  })
})

describe('duplicateKey', () => {
  it('繁体字と拼音（大文字小文字・前後の空白を無視）が一致すれば同じキー', () => {
    expect(duplicateKey({ hanzi: '行', pinyin: ' Xíng ' })).toBe(
      duplicateKey({ hanzi: '行', pinyin: 'xíng' }),
    )
  })

  it('同じ字でも読みが違えば別のキー', () => {
    expect(duplicateKey({ hanzi: '行', pinyin: 'xíng' })).not.toBe(
      duplicateKey({ hanzi: '行', pinyin: 'háng' }),
    )
  })
})
