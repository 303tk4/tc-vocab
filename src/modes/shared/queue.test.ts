import { describe, expect, it } from 'vitest'
import type { Progress } from '../../types/word'
import { planReviews } from './queue'
import type { SrsState } from './srs'

const NOW = new Date(2026, 10, 9, 12).getTime()
const DAY = 24 * 60 * 60 * 1000

function progress(wordId: string, due: number | null): Progress {
  const state: SrsState = { reps: 1, interval: 1, ease: 2.5, introducedAt: 0 }
  return { modeId: 'conversation', wordId, due, state, updatedAt: 0 }
}

describe('planReviews（FR-CONV-03。一回の出題数は版 1.41）', () => {
  const items = ['a', 'b', 'c', 'd', 'e']
  const keyOf = (id: string) => `item:conversation:${id}`

  it('期限が来た項目を古い順に出し、その後に未学習の項目を与えた順に出す', () => {
    const map = new Map([
      [keyOf('b'), progress(keyOf('b'), NOW - DAY)],
      [keyOf('d'), progress(keyOf('d'), NOW - 2 * DAY)],
      [keyOf('e'), progress(keyOf('e'), NOW + DAY)],
    ])
    const plan = planReviews({ items, keyOf, progress: map, now: NOW, limit: 10 })
    expect(plan.items).toEqual(['d', 'b', 'a', 'c'])
    expect(plan.remainingNew).toBe(0)
    expect(plan.nextDue).toBe(NOW + DAY)
  })

  it('未学習の項目だけのときは出題数までにし、残りの件数を返す', () => {
    const plan = planReviews({ items, keyOf, progress: new Map(), now: NOW, limit: 2 })
    expect(plan.items).toEqual(['a', 'b'])
    expect(plan.remainingNew).toBe(3)
  })

  it('期限が来た項目と未学習の項目を合わせて出題数までにする（期限が来た項目が先）', () => {
    const map = new Map([
      [keyOf('c'), progress(keyOf('c'), NOW)],
      [keyOf('e'), progress(keyOf('e'), NOW - DAY)],
    ])
    expect(planReviews({ items, keyOf, progress: map, now: NOW, limit: 3 }).items).toEqual([
      'e',
      'c',
      'a',
    ])
    // 期限が来た項目が出題数より多ければ、古い順に出題数分だけ
    expect(planReviews({ items, keyOf, progress: map, now: NOW, limit: 1 }).items).toEqual(['e'])
  })

  it('状態が壊れている進捗は未学習として扱う', () => {
    const broken = { ...progress(keyOf('a'), NOW - DAY), state: { foo: 1 } }
    const plan = planReviews({
      items: ['a'],
      keyOf,
      progress: new Map([[keyOf('a'), broken]]),
      now: NOW,
      limit: 1,
    })
    expect(plan.items).toEqual(['a'])
  })
})
