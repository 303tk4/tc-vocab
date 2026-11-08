import { describe, expect, it } from 'vitest'
import { jieyun, makeWord } from '../../test/fixtures'
import { createMatcher, sortWords } from './search'

describe('createMatcher', () => {
  it.each([
    ['', true],
    ['捷', true],
    ['ㄐㄧㄝ', true],
    ['ㄐㄧㄝˊㄩㄣˋ', true],
    ['jié yùn', true],
    ['jieyun', true],
    ['JIE', true],
    ['mrt', true],
    ['都市', true],
    ['公車', false],
  ])('"%s" → %s', (query, expected) => {
    expect(createMatcher(query)(jieyun)).toBe(expected)
  })
})

describe('sortWords', () => {
  it('新しく登録した順に並べ、同時刻なら繁体字の順', () => {
    const a = makeWord({ hanzi: '一', createdAt: 1 })
    const b = makeWord({ hanzi: '二', createdAt: 2 })
    const c = makeWord({ hanzi: '一二', createdAt: 2 })
    expect(sortWords([a, b, c]).map((w) => w.hanzi)).toEqual(['一二', '二', '一'])
  })
})
