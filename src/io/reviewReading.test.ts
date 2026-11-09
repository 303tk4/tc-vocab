import { describe, expect, it } from 'vitest'
import { countReviewReading, REVIEW_READING_TAG } from './reviewReading'

describe('countReviewReading（FR-WORDS-14）', () => {
  it('要確認:読み タグを持つ単語だけを数え、エラー行（null）は数えない', () => {
    const words = [{ tags: [REVIEW_READING_TAG, 'TOCFL'] }, { tags: ['TOCFL'] }, null, undefined]
    expect(countReviewReading(words)).toBe(1)
  })
})
