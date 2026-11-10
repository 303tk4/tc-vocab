import { describe, expect, it } from 'vitest'
import { parseLicenses } from './licenses'

describe('parseLicenses（FR-SET-08）', () => {
  const pkg = { name: 'react', version: '19.0.0', license: 'MIT', text: 'MIT License …' }

  it('正しい形式の一覧を返す', () => {
    expect(parseLicenses({ format: 'tc-vocab-licenses', version: 1, packages: [pkg] })).toEqual([
      pkg,
    ])
  })

  it.each([
    ['オブジェクトでない', null],
    ['format が違う', { format: 'x', version: 1, packages: [] }],
    ['version が違う', { format: 'tc-vocab-licenses', version: 2, packages: [] }],
    ['packages が配列でない', { format: 'tc-vocab-licenses', version: 1, packages: {} }],
    [
      '項目の型が違う',
      { format: 'tc-vocab-licenses', version: 1, packages: [{ ...pkg, version: 19 }] },
    ],
  ])('%s ときは null', (_label, data) => {
    expect(parseLicenses(data)).toBeNull()
  })
})
