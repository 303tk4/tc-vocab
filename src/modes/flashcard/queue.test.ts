import { describe, expect, it } from 'vitest'
import { makeWord } from '../../test/fixtures'
import type { Progress } from '../../types/word'
import { countDueByEndOfTomorrow, planQueue, requeue } from './queue'
import type { SrsState } from '../shared/srs'

const at = (day: number, hour: number) => new Date(2026, 10, day, hour).getTime()
const NOW = at(9, 12)

function progress(wordId: string, due: number | null, introducedAt = at(1, 12)): Progress {
  const state: SrsState = { reps: 1, interval: 1, ease: 2.5, introducedAt }
  return { modeId: 'flashcard', wordId, due, state, updatedAt: 0 }
}

const toMap = (rows: Progress[]) => new Map(rows.map((r) => [r.wordId, r]))

describe('planQueue（FR-FC-01・02。一回の出題数は版 1.41）', () => {
  it('期限が来た単語を古い順に出し、その後に新規カードを登録の古い順に出す', () => {
    const late = makeWord({ id: 'late' })
    const early = makeWord({ id: 'early' })
    const future = makeWord({ id: 'future' })
    const newB = makeWord({ id: 'newB', createdAt: 20 })
    const newA = makeWord({ id: 'newA', createdAt: 10 })
    const plan = planQueue({
      words: [late, newB, early, future, newA],
      progress: toMap([
        progress('late', at(9, 4)),
        progress('early', at(8, 4)),
        progress('future', at(10, 4)),
      ]),
      now: NOW,
      limit: 20,
      direction: 'hanziToMeaning',
    })
    expect(plan.cards.map((c) => c.word.id)).toEqual(['early', 'late', 'newA', 'newB'])
    expect(plan.nextDue).toBe(at(10, 4))
    expect(plan.remainingNew).toBe(0)
  })

  it('新規カードだけのときは、出題数までにする', () => {
    const words = [1, 2, 3].map((n) => makeWord({ id: `n${n}`, createdAt: n }))
    const plan = planQueue({
      words,
      progress: new Map(),
      now: NOW,
      limit: 2,
      direction: 'hanziToMeaning',
    })
    expect(plan.cards.map((c) => c.word.id)).toEqual(['n1', 'n2'])
    expect(plan.remainingNew).toBe(1)
  })

  it('期限が来たカードを先に出し、残りを新規カードで埋めて合計で出題数までにする', () => {
    const due = [1, 2, 3].map((n) => makeWord({ id: 'd' + n }))
    const fresh = [1, 2].map((n) => makeWord({ id: 'n' + n, createdAt: n }))
    const plan = planQueue({
      words: [...fresh, ...due],
      progress: toMap(due.map((w, i) => progress(w.id, at(9, 4) - i))),
      now: NOW,
      limit: 4,
      direction: 'hanziToMeaning',
    })
    expect(plan.cards.map((c) => c.word.id)).toEqual(['d3', 'd2', 'd1', 'n1'])
    expect(plan.remainingNew).toBe(1)
  })

  it('期限が来たカードが出題数より多いときは、古い順に出題数分だけ出す', () => {
    const due = [1, 2, 3].map((n) => makeWord({ id: 'd' + n }))
    const plan = planQueue({
      words: [...due, makeWord({ id: 'new' })],
      progress: toMap(due.map((w, i) => progress(w.id, at(9, 4) - i))),
      now: NOW,
      limit: 2,
      direction: 'hanziToMeaning',
    })
    expect(plan.cards.map((c) => c.word.id)).toEqual(['d3', 'd2'])
    expect(plan.remainingNew).toBe(1)
  })

  it('状態が壊れている進捗は新規カードとして扱う', () => {
    const word = makeWord({ id: 'broken' })
    const plan = planQueue({
      words: [word],
      progress: toMap([{ modeId: 'flashcard', wordId: 'broken', due: 1, state: {}, updatedAt: 0 }]),
      now: NOW,
      limit: 1,
      direction: 'hanziToMeaning',
    })
    expect(plan.cards.map((c) => c.word.id)).toEqual(['broken'])
  })

  it('出題の向き（FR-FC-04）', () => {
    const words = [makeWord(), makeWord()]
    const base = { words, progress: new Map(), now: NOW, limit: 2 }
    expect(planQueue({ ...base, direction: 'hanziToMeaning' }).cards.every((c) => !c.reverse)).toBe(
      true,
    )
    expect(planQueue({ ...base, direction: 'meaningToHanzi' }).cards.every((c) => c.reverse)).toBe(
      true,
    )
    const values = [0.2, 0.8]
    const random = () => values.shift() ?? 0
    expect(planQueue({ ...base, direction: 'random', random }).cards.map((c) => c.reverse)).toEqual(
      [true, false],
    )
  })
})

describe('countDueByEndOfTomorrow（FR-FC-40）', () => {
  it('翌々日の午前4時より前に期限が来る件数を数える（今日の残りを含む）', () => {
    const rows = [
      progress('today', at(9, 12)),
      progress('tomorrow', at(10, 4)),
      progress('tomorrowLate', at(11, 3)),
      progress('later', at(11, 4)),
      progress('none', null),
    ]
    expect(countDueByEndOfTomorrow(rows, NOW)).toBe(3)
  })
})

describe('requeue（FR-FC-22）', () => {
  it('3枚後に入れ直す', () => {
    expect(requeue(['a', 'b', 'c', 'd', 'e'], 0)).toEqual(['a', 'b', 'c', 'd', 'a', 'e'])
  })

  it('残りが3枚未満なら最後に回す', () => {
    expect(requeue(['a', 'b', 'c'], 1)).toEqual(['a', 'b', 'c', 'b'])
    expect(requeue(['a'], 0)).toEqual(['a', 'a'])
  })
})
