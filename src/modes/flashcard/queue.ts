// 出題順の決定（仕様書 8.1 FR-FC-01〜04、8.3 FR-FC-22）。React から独立した純粋関数
import type { Progress, Word } from '../../types/word'
import type { Direction } from './options'
import { isSrsState } from '../shared/srs'

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
  /** 一回の出題数（期限が来たカードと新規カードの合計。FR-FC-02、版 1.41） */
  limit: number
  direction: Direction
  random?: () => number
}

/** 期限が来た単語を古い順に先に、残りを新規カード（登録の古い順）で埋めて、合わせて limit 枚まで並べる */
export function planQueue({
  words,
  progress,
  now,
  limit,
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
  const due = reviews.slice(0, Math.max(0, limit))
  const fresh = unstudied.slice(0, Math.max(0, limit - due.length))

  const toCard = (word: Word): Card => ({
    word,
    reverse: direction === 'meaningToHanzi' || (direction === 'random' && random() < 0.5),
  })

  return {
    cards: [...due.map((r) => toCard(r.word)), ...fresh.map(toCard)],
    remainingNew: unstudied.length - fresh.length,
    nextDue,
  }
}

// 件数の数え方と「もう一度」の入れ直しは、場面別会話と共通（7.4）
export { countDueByEndOfTomorrow, REQUEUE_OFFSET, requeue } from '../shared/queue'
