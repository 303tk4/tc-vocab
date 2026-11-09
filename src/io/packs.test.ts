import { describe, expect, it } from 'vitest'
import { formatSize, PackIndexError, packStatus, parsePackIndex, pickText } from './packs'

const entry = {
  id: 'tocfl-novice',
  file: 'tocfl-novice.json',
  version: 2,
  name: { ja: 'TOCFL 入門', en: 'TOCFL Novice' },
  description: { ja: '説明' },
  wordCount: 1000,
  size: 245760,
  tags: ['TOCFL', 'TOCFL:入門'],
  license: 'CC BY 4.0',
}

const index = (packs: unknown[], extra: object = {}) =>
  JSON.stringify({ format: 'tc-vocab-packs', version: 1, packs, ...extra })

describe('parsePackIndex（仕様書 16.5）', () => {
  it('正しい一覧を読み込む', () => {
    expect(parsePackIndex(index([entry]))).toEqual([
      { ...entry, meaningLanguage: undefined, source: undefined },
    ])
  })

  it('形式・版が違う一覧は例外にする', () => {
    expect(() => parsePackIndex('{')).toThrow(PackIndexError)
    expect(() => parsePackIndex(JSON.stringify({ format: 'x', version: 1, packs: [] }))).toThrow(
      'invalidFormat',
    )
    expect(() => parsePackIndex(index([], { version: 2 }))).toThrow('unsupportedVersion')
  })

  it('不正なパッケージと、ID の重複は除く', () => {
    const packs = parsePackIndex(
      index([
        entry,
        { ...entry, name: { ja: '重複' } },
        { ...entry, id: 'Bad ID' },
        { ...entry, id: 'outside', file: '../secret.json' },
        { ...entry, id: 'url', file: 'https://example.com/a.json' },
        { ...entry, id: 'no-version', version: 0 },
        { ...entry, id: 'no-name', name: {} },
        'text',
      ]),
    )
    expect(packs.map((p) => [p.id, p.name.ja])).toEqual([['tocfl-novice', 'TOCFL 入門']])
  })

  it('名前が文字列でも読み込む', () => {
    expect(parsePackIndex(index([{ ...entry, name: '単語集' }]))[0].name).toEqual({ ja: '単語集' })
  })
})

describe('級の対応表（levelGuide）', () => {
  const levelGuide = {
    title: { ja: 'TOCFL と TBCL の級の対応', en: 'TOCFL and TBCL levels' },
    note: { en: 'Equivalent TBCL levels.' },
    columns: {
      tocfl: { en: 'TOCFL' },
      cefr: { en: 'CEFR' },
      listening: { en: 'TBCL (listening)' },
      reading: { en: 'TBCL (reading)' },
    },
    rows: [
      {
        tocfl: { en: 'Level 1' },
        cefr: 'A1',
        listening: '2+',
        reading: '2+',
        inPack: true,
        tag: 'TOCFL:入門',
      },
      { tocfl: { en: 'Level 3' }, cefr: 'B1', listening: '4', reading: '4', inPack: false },
    ],
    source: { name: 'TOCFL Q&A', url: 'https://example.com/a.pdf' },
  }

  it('対応表を読み込み、出典は名前だけを残す', () => {
    const [pack] = parsePackIndex(index([{ ...entry, levelGuide }]))
    expect(pack.levelGuide).toMatchObject({
      title: levelGuide.title,
      rows: [
        { tocfl: { en: 'Level 1' }, inPack: true, tag: 'TOCFL:入門' },
        { tocfl: { en: 'Level 3' }, inPack: false, tag: undefined },
      ],
      source: 'TOCFL Q&A',
    })
  })

  it('不正な対応表は無視し、パッケージは読み込む', () => {
    const broken = { ...levelGuide, rows: [{ cefr: 'A1' }] }
    const [pack] = parsePackIndex(index([{ ...entry, levelGuide: broken }]))
    expect(pack.id).toBe('tocfl-novice')
    expect(pack.levelGuide).toBeUndefined()
  })
})

describe('pickText', () => {
  it('UI 言語、ja、最初の項目の順に選ぶ', () => {
    expect(pickText({ ja: 'あ', en: 'a' }, 'en')).toBe('a')
    expect(pickText({ ja: 'あ', en: 'a' }, 'zh-TW')).toBe('あ')
    expect(pickText({ en: 'a' }, 'zh-TW')).toBe('a')
    expect(pickText({}, 'ja')).toBe('')
  })
})

describe('formatSize', () => {
  it('1 MB 以上は小数1桁の MB、それ未満は KB で示す', () => {
    expect(formatSize(1.2 * 1024 * 1024)).toEqual({ value: '1.2', unit: 'MB' })
    expect(formatSize(245760)).toEqual({ value: '240', unit: 'KB' })
    expect(formatSize(10)).toEqual({ value: '1', unit: 'KB' })
  })
})

describe('packStatus（仕様書 16.5）', () => {
  it('追加の記録と、実際に登録されている単語の数で状態を返す', () => {
    expect(packStatus(entry, {}, 0)).toBe('notInstalled')
    expect(packStatus(entry, { 'tocfl-novice': 2 }, 1000)).toBe('installed')
    expect(packStatus(entry, { 'tocfl-novice': 2 }, 800)).toBe('partial')
    expect(packStatus(entry, { 'tocfl-novice': 1 }, 1000)).toBe('updateAvailable')
  })

  it('記録があっても単語が1語も無ければ未追加とする（利用者が消した場合など）', () => {
    expect(packStatus(entry, { 'tocfl-novice': 2 }, 0)).toBe('notInstalled')
  })

  it('記録が無ければ、同じタグの単語があっても未追加とする', () => {
    expect(packStatus(entry, {}, 500)).toBe('notInstalled')
  })
})
