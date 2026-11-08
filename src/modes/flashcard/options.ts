export const DIRECTIONS = ['hanziToMeaning', 'meaningToHanzi', 'random'] as const
export type Direction = (typeof DIRECTIONS)[number]

export interface FlashcardOptions {
  /** 出題の向き（FR-FC-04） */
  direction: Direction
}
