// SRS（SM-2 の簡略版）。仕様書 8.3（FR-FC-21・23）
// UI から独立した純粋関数にしてあり、将来 FSRS などに差し替えられる

export const RATINGS = ['again', 'hard', 'good', 'easy'] as const
export type Rating = (typeof RATINGS)[number]

/** 進捗に保存する、単語ごとの SRS の状態 */
export interface SrsState {
  /** 連続正解回数 */
  reps: number
  /** 前回の間隔（日）。「もう一度」の後は 0 */
  interval: number
  ease: number
  /** 初めて学習した日時（1日の新規上限の判定に使う。FR-FC-02） */
  introducedAt: number
}

export interface ScheduleResult {
  state: SrsState
  /** 次回の出題日時（UNIX ミリ秒） */
  due: number
}

export const INITIAL_EASE = 2.5
export const MIN_EASE = 1.3
/** 「もう一度」の再出題までの時間 */
export const AGAIN_DELAY_MS = 10 * 60 * 1000
/** 日付が切り替わる時刻（端末のローカル時刻。FR-FC-02） */
export const DAY_START_HOUR = 4

const EASE_DELTA: Record<Rating, number> = { again: -0.2, hard: -0.15, good: 0, easy: 0.15 }

/** 指定日時が属する「日」の始まり（その日の午前4時）を返す */
export function dayStart(time: number): number {
  const d = new Date(time)
  if (d.getHours() < DAY_START_HOUR) d.setDate(d.getDate() - 1)
  d.setHours(DAY_START_HOUR, 0, 0, 0)
  return d.getTime()
}

/** 日の始まりから n 日後の午前4時（夏時間があっても日付単位で進める） */
export function addDays(start: number, days: number): number {
  const d = new Date(start)
  d.setDate(d.getDate() + days)
  d.setHours(DAY_START_HOUR, 0, 0, 0)
  return d.getTime()
}

/** 評価後の間隔（日）。「もう一度」は 0 */
export function nextInterval(prev: SrsState | undefined, rating: Rating): number {
  const reps = prev?.reps ?? 0
  const interval = prev?.interval ?? 0
  const ease = prev?.ease ?? INITIAL_EASE
  const days = (n: number) => Math.max(1, Math.round(n))
  // 「普通」の間隔。「簡単」の計算にも使う（ease は更新前の値）
  const good = reps === 0 ? 1 : reps === 1 ? 3 : days(interval * ease)
  switch (rating) {
    case 'again':
      return 0
    case 'hard':
      return days(interval * 1.2)
    case 'good':
      return good
    case 'easy':
      return reps === 0 ? 4 : days(good * 1.3)
  }
}

/** 評価に応じて次の状態と出題日時を決める */
export function schedule(prev: SrsState | undefined, rating: Rating, now: number): ScheduleResult {
  const interval = nextInterval(prev, rating)
  const ease = Math.max(MIN_EASE, (prev?.ease ?? INITIAL_EASE) + EASE_DELTA[rating])
  const state: SrsState = {
    reps: rating === 'again' ? 0 : (prev?.reps ?? 0) + 1,
    interval,
    ease: Math.round(ease * 100) / 100,
    introducedAt: prev?.introducedAt ?? now,
  }
  const due = rating === 'again' ? now + AGAIN_DELAY_MS : addDays(dayStart(now), interval)
  return { state, due }
}

/** 評価ボタンに出す、次回までの間隔の表示単位（仕様書 8.3） */
export type IntervalLabel =
  | { unit: 'minutes'; value: number }
  | { unit: 'days'; value: number }
  | { unit: 'months'; value: number }
  | { unit: 'years'; value: number }

export function intervalLabel(prev: SrsState | undefined, rating: Rating): IntervalLabel {
  if (rating === 'again') return { unit: 'minutes', value: AGAIN_DELAY_MS / 60_000 }
  const days = nextInterval(prev, rating)
  const oneDecimal = (n: number) => Math.round(n * 10) / 10
  if (days < 30) return { unit: 'days', value: days }
  if (days < 365) return { unit: 'months', value: oneDecimal(days / 30) }
  return { unit: 'years', value: oneDecimal(days / 365) }
}

/** 保存値が SrsState として使えるか（壊れたデータは新規扱いにする） */
export function isSrsState(value: unknown): value is SrsState {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.reps === 'number' &&
    typeof v.interval === 'number' &&
    typeof v.ease === 'number' &&
    typeof v.introducedAt === 'number'
  )
}
