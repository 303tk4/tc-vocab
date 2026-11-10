import { describe, expect, it } from 'vitest'
import { parseSessionSize, resolveSessionSize } from './sessionSize'

describe('一回の出題数（FR-PLUG-08）', () => {
  it.each([
    ['1', 1],
    ['200', 200],
    [' 20 ', 20],
    [30, 30],
    ['0', null],
    ['201', null],
    ['1.5', null],
    ['', null],
    ['abc', null],
    [undefined, null],
  ])('%j は %j', (input, expected) => {
    expect(parseSessionSize(input)).toBe(expected)
  })

  it('保存した値 → 版 1.40 までの「1日の上限」 → 初期値、の順に使う', () => {
    expect(resolveSessionSize(15, 50, 20)).toBe(15)
    expect(resolveSessionSize(undefined, 50, 20)).toBe(50)
    // 「1日の上限」の 0（新しいものを出さない）は引き継がない
    expect(resolveSessionSize(undefined, 0, 20)).toBe(20)
    expect(resolveSessionSize(undefined, undefined, 10)).toBe(10)
    expect(resolveSessionSize('x', 'y', 10)).toBe(10)
  })
})
