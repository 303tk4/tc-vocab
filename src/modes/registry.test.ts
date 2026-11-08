import { describe, expect, it } from 'vitest'
import { getMode, modes } from './registry'

describe('モードの登録', () => {
  it('ID が重複していない', () => {
    const ids = modes.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('ID は URL・設定キーに使える文字だけで構成する', () => {
    for (const mode of modes) expect(mode.id).toMatch(/^[a-z][a-z0-9-]*$/)
  })

  it('getMode で ID から取得できる', () => {
    expect(getMode('flashcard')?.id).toBe('flashcard')
    expect(getMode('unknown')).toBeUndefined()
  })
})
