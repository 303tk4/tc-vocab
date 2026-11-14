import { describe, expect, it } from 'vitest'
import { resolveAutoSpeak } from './autoSpeak'

describe('音声の自動再生の値（FR-PLUG-09）', () => {
  it('保存した値を使う', () => {
    expect(resolveAutoSpeak(true, false)).toBe(true)
    expect(resolveAutoSpeak(false, true)).toBe(false)
  })

  it('保存が無いか真偽値でなければ、モードの初期値を使う', () => {
    expect(resolveAutoSpeak(undefined, true)).toBe(true)
    expect(resolveAutoSpeak(undefined, false)).toBe(false)
    expect(resolveAutoSpeak('yes', false)).toBe(false)
  })
})
