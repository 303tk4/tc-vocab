import { describe, expect, it } from 'vitest'
import {
  AGAIN_DELAY_MS,
  addDays,
  dayStart,
  intervalLabel,
  isSrsState,
  MIN_EASE,
  nextInterval,
  schedule,
  type SrsState,
} from './srs'

/** ローカル時刻で日時を作る（端末のタイムゾーンによらず検証できるように） */
const at = (day: number, hour: number, minute = 0) =>
  new Date(2026, 10, day, hour, minute).getTime()

const state = (overrides: Partial<SrsState> = {}): SrsState => ({
  reps: 0,
  interval: 0,
  ease: 2.5,
  introducedAt: at(1, 12),
  ...overrides,
})

describe('dayStart（午前4時で日付が切り替わる）', () => {
  it('午前4時以降はその日の午前4時', () => {
    expect(dayStart(at(9, 22))).toBe(at(9, 4))
    expect(dayStart(at(9, 4))).toBe(at(9, 4))
  })

  it('午前4時より前は前日の午前4時', () => {
    expect(dayStart(at(10, 3, 59))).toBe(at(9, 4))
  })

  it('addDays は n 日後の午前4時を返す', () => {
    expect(addDays(at(9, 4), 1)).toBe(at(10, 4))
    expect(addDays(at(9, 4), 30)).toBe(new Date(2026, 11, 9, 4).getTime())
  })
})

describe('nextInterval（SM-2 簡略版。仕様書 8.3）', () => {
  it('新規カード：もう一度 0日、難しい 1日、普通 1日、簡単 4日', () => {
    expect(nextInterval(undefined, 'again')).toBe(0)
    expect(nextInterval(undefined, 'hard')).toBe(1)
    expect(nextInterval(undefined, 'good')).toBe(1)
    expect(nextInterval(undefined, 'easy')).toBe(4)
  })

  it('2回目の「普通」は3日、「簡単」は 3 × 1.3 を四捨五入して4日', () => {
    const s = state({ reps: 1, interval: 1 })
    expect(nextInterval(s, 'good')).toBe(3)
    expect(nextInterval(s, 'easy')).toBe(4)
  })

  it('3回目以降の「普通」は前回の間隔 × ease', () => {
    expect(nextInterval(state({ reps: 2, interval: 3, ease: 2.5 }), 'good')).toBe(8)
    expect(nextInterval(state({ reps: 3, interval: 8, ease: 2.0 }), 'good')).toBe(16)
  })

  it('「簡単」は「普通」の間隔 × 1.3', () => {
    // 普通 = 10 × 2.5 = 25 → 簡単 = 25 × 1.3 = 32.5 → 33
    expect(nextInterval(state({ reps: 4, interval: 10 }), 'easy')).toBe(33)
  })

  it('「難しい」は前回の間隔 × 1.2（最低1日）', () => {
    expect(nextInterval(state({ reps: 3, interval: 10 }), 'hard')).toBe(12)
    expect(nextInterval(state({ reps: 0, interval: 0 }), 'hard')).toBe(1)
    expect(nextInterval(state({ reps: 2, interval: 1 }), 'hard')).toBe(1)
  })
})

describe('schedule', () => {
  it('新規カードの「普通」は翌日の午前4時に出題する（夜に学習しても翌朝に出る）', () => {
    const now = at(9, 22)
    const { state: s, due } = schedule(undefined, 'good', now)
    expect(due).toBe(at(10, 4))
    expect(s).toEqual({ reps: 1, interval: 1, ease: 2.5, introducedAt: now })
  })

  it('午前4時より前に学習した場合は、その「日」の翌日（同じ日付の午前4時）', () => {
    const { due } = schedule(undefined, 'good', at(10, 2))
    expect(due).toBe(at(10, 4))
  })

  it('「もう一度」は10分後。連続正解回数を0に戻し、ease を 0.2 下げる', () => {
    const now = at(9, 12)
    const { state: s, due } = schedule(state({ reps: 3, interval: 8 }), 'again', now)
    expect(due).toBe(now + AGAIN_DELAY_MS)
    expect(s.reps).toBe(0)
    expect(s.interval).toBe(0)
    expect(s.ease).toBe(2.3)
  })

  it('「難しい」は ease を 0.15 下げ、「簡単」は 0.15 上げ、「普通」は変えない', () => {
    const now = at(9, 12)
    expect(schedule(state(), 'hard', now).state.ease).toBe(2.35)
    expect(schedule(state(), 'easy', now).state.ease).toBe(2.65)
    expect(schedule(state(), 'good', now).state.ease).toBe(2.5)
  })

  it('「難しい」「普通」「簡単」は連続正解回数を1増やす', () => {
    for (const rating of ['hard', 'good', 'easy'] as const) {
      expect(schedule(state({ reps: 2, interval: 3 }), rating, at(9, 12)).state.reps).toBe(3)
    }
  })

  it('ease は 1.3 を下回らない', () => {
    let s: SrsState | undefined
    for (let i = 0; i < 20; i++) s = schedule(s, 'again', at(9, 12)).state
    expect(s?.ease).toBe(MIN_EASE)
  })

  it('初めて学習した日時は最初の評価のときだけ記録する', () => {
    const first = schedule(undefined, 'again', at(9, 12)).state
    const second = schedule(first, 'good', at(9, 13)).state
    expect(second.introducedAt).toBe(at(9, 12))
  })

  it('「もう一度」の後の「普通」は初回と同じく1日', () => {
    const lapsed = schedule(state({ reps: 5, interval: 40 }), 'again', at(9, 12)).state
    expect(schedule(lapsed, 'good', at(9, 12, 20)).due).toBe(at(10, 4))
  })
})

describe('intervalLabel（評価ボタンの表示）', () => {
  it('もう一度は10分', () => {
    expect(intervalLabel(undefined, 'again')).toEqual({ unit: 'minutes', value: 10 })
  })

  it('30日未満は日、365日未満は月、それ以上は年（小数点以下1桁）', () => {
    expect(intervalLabel(undefined, 'good')).toEqual({ unit: 'days', value: 1 })
    // 普通 = 18 × 2.5 = 45日 → 1.5か月
    expect(intervalLabel(state({ reps: 3, interval: 18 }), 'good')).toEqual({
      unit: 'months',
      value: 1.5,
    })
    // 普通 = 180 × 2.5 = 450日 → 1.2年
    expect(intervalLabel(state({ reps: 6, interval: 180 }), 'good')).toEqual({
      unit: 'years',
      value: 1.2,
    })
  })
})

describe('isSrsState', () => {
  it('必要な項目がそろっているものだけを受け付ける', () => {
    expect(isSrsState(state())).toBe(true)
    expect(isSrsState(null)).toBe(false)
    expect(isSrsState({ reps: 1 })).toBe(false)
  })
})
