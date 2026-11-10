import { describe, expect, it } from 'vitest'
import { languageName, primaryLanguage } from './languages'

describe('言語タグと言語の名前', () => {
  it('言語タグの主な部分を取り出す', () => {
    expect(primaryLanguage('en-US')).toBe('en')
    expect(primaryLanguage('zh_TW')).toBe('zh')
    expect(primaryLanguage('JA')).toBe('ja')
  })

  it('言語名はその言語自身での名前で示す', () => {
    expect(languageName('ja')).toBe('日本語')
    expect(languageName('en')).toBe('English')
    expect(languageName('vi')).toBe('Tiếng Việt')
  })

  it('名前がわからない言語や不正な言語タグは、そのまま示す', () => {
    expect(languageName('xx')).toBe('xx')
    expect(languageName('!!')).toBe('!!')
  })
})
