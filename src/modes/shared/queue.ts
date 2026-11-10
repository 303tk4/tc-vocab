// 出題順の決定の共通部分（仕様書 7.4、8.1 FR-FC-01〜03・22、18.1 FR-CONV-03）。React から独立した純粋関数
import type { Progress } from '../../types/word'
import { addDays, dayStart, isSrsState } from './srs'

/** 「もう一度」の後、何枚後に再び出すか（仕様書 8.3） */
export const REQUEUE_OFFSET = 3

export interface ReviewPlan<T> {
  items: T[]
  /** 未学習の項目のうち、今回出さなかった件数 */
  remainingNew: number
  /** 出題対象の中で次に復習期限が来る日時（無ければ null） */
  nextDue: number | null
}

/**
 * 期限が来た項目を古い順に先に、残りを未学習の項目（与えられた順）で埋めて、合わせて limit 件まで並べる
 * （一回の出題数。FR-FC-02、版 1.41）。状態が壊れている進捗は未学習として扱う
 */
export function planReviews<T>({
  items,
  keyOf,
  progress,
  now,
  limit,
}: {
  items: readonly T[]
  /** 進捗の ID */
  keyOf(item: T): string
  progress: ReadonlyMap<string, Progress>
  now: number
  /** 一回の出題数（期限が来た項目と未学習の項目の合計） */
  limit: number
}): ReviewPlan<T> {
  const reviews: { item: T; due: number }[] = []
  const unstudied: T[] = []
  let nextDue: number | null = null
  for (const item of items) {
    const p = progress.get(keyOf(item))
    if (!p || !isSrsState(p.state) || p.due === null) unstudied.push(item)
    else if (p.due <= now) reviews.push({ item, due: p.due })
    else if (nextDue === null || p.due < nextDue) nextDue = p.due
  }
  reviews.sort((a, b) => a.due - b.due)
  const due = reviews.slice(0, Math.max(0, limit))
  const fresh = unstudied.slice(0, Math.max(0, limit - due.length))
  return {
    items: [...due.map((r) => r.item), ...fresh],
    remainingNew: unstudied.length - fresh.length,
    nextDue,
  }
}

/** 明日の終わり（翌々日の午前4時）までに期限が来る件数（FR-FC-40） */
export function countDueByEndOfTomorrow(rows: Progress[], now: number): number {
  const end = addDays(dayStart(now), 2)
  return rows.filter((r) => r.due !== null && r.due < end).length
}

/** 「もう一度」のカードを数枚後に入れ直す（FR-FC-22）。残りが少なければ最後に回す */
export function requeue<T>(cards: readonly T[], pos: number, offset = REQUEUE_OFFSET): T[] {
  const next = [...cards]
  next.splice(Math.min(pos + 1 + offset, next.length), 0, cards[pos])
  return next
}
