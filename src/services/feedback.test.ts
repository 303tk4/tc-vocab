import { describe, expect, it } from 'vitest'
import { buildFeedbackUrl, FEEDBACK_FORM, type FeedbackForm } from './feedback'

const base = 'https://docs.google.com/forms/d/e/abc/viewform'
const info = { version: '1.1.0', language: 'zh-TW' }

describe('buildFeedbackUrl（仕様書 10.3）', () => {
  it('URL が空なら null を返す（フィードバックの部分を表示しない）', () => {
    expect(buildFeedbackUrl({ url: '', entries: {} }, info)).toBeNull()
  })

  it('書き込む欄が無ければ、フォームの URL をそのまま返す', () => {
    expect(buildFeedbackUrl({ url: base, entries: {} }, info)).toBe(base)
  })

  it('版と言語の欄があれば、その2つだけを付ける', () => {
    const form: FeedbackForm = { url: base, entries: { version: '111', language: '222' } }
    const url = new URL(buildFeedbackUrl(form, info)!)
    expect(url.origin + url.pathname).toBe(base)
    expect([...url.searchParams.keys()].sort()).toEqual(['entry.111', 'entry.222', 'usp'])
    expect(url.searchParams.get('entry.111')).toBe('1.1.0')
    expect(url.searchParams.get('entry.222')).toBe('zh-TW')
  })

  it('値は URL 用にエスケープする', () => {
    const form: FeedbackForm = { url: base, entries: { version: '111' } }
    const url = buildFeedbackUrl(form, { version: '1.0.0 &x=1', language: 'ja' })!
    expect(url).toContain('entry.111=1.0.0+%26x%3D1')
  })

  it('公開しているフォームは Google フォームの https の URL', () => {
    expect(FEEDBACK_FORM.url).toMatch(/^https:\/\/docs\.google\.com\/forms\//)
  })
})
