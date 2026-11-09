// 出題順の決定（仕様書 8.1 FR-FC-01〜04、8.3 FR-FC-22）。React から独立した純粋関数
import type { Progress, Word } from '../../types/word'
import type { Direction } from './options'
import { addDays, dayStart, isSrsState } from './srs'

export interface Card {
  word: Word
  /** true なら表面に意味を出す（意味→繁体字） */
  reverse: boolean
}

export interface QueuePlan {
  cards: Card[]
  /** 未学習の単語のうち、今回出さなかった件数 */
  remainingNew: number
  /** 出題対象の中で次に復習期限が来る日時（無ければ null）。FR-FC-03 */
  nextDue: number | null
}

export interface PlanInput {
  words: Word[]
  progress: Map<string, Progress>
  now: number
  /** 今回出す新規カードの枚数 */
  newCount: number
  direction: Direction
  random?: () => number
}

/** 「もう一度」の後、何枚後に再び出すか（仕様書 8.3） */
export const REQUEUE_OFFSET = 3

/** 期限が来た単語を古い順に、その後に新規カードを登録の古い順に並べる */
export function planQueue({
  words,
  progress,
  now,
  newCount,
  direction,
  random = Math.random,
}: PlanInput): QueuePlan {
  const reviews: { word: Word; due: number }[] = []
  const unstudied: Word[] = []
  let nextDue: number | null = null

  for (const word of words) {
    const p = progress.get(word.id)
    if (!p || !isSrsState(p.state) || p.due === null) {
      unstudied.push(word)
    } else if (p.due <= now) {
      reviews.push({ word, due: p.due })
    } else if (nextDue === null || p.due < nextDue) {
      nextDue = p.due
    }
  }

  reviews.sort((a, b) => a.due - b.due)
  unstudied.sort((a, b) => a.createdAt - b.createdAt)
  const fresh = unstudied.slice(0, Math.max(0, newCount))

  const toCard = (word: Word): Card => ({
    word,
    reverse: direction === 'meaningToHanzi' || (direction === 'random' && random() < 0.5),
  })

  return {
    cards: [...reviews.map((r) => toCard(r.word)), ...fresh.map(toCard)],
    remainingNew: unstudied.length - fresh.length,
    nextDue,
  }
}

/** 今日（午前4時以降）初めて学習した単語の件数（FR-FC-02） */
export function countIntroducedToday(rows: Progress[], now: number): number {
  const start = dayStart(now)
  return rows.filter((r) => isSrsState(r.state) && r.state.introducedAt >= start).length
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
