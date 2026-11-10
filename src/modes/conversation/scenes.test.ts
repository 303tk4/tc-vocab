import { describe, expect, it } from 'vitest'
import indexJson from './data/index.json'
import en from './data/locales/en.json'
import ja from './data/locales/ja.json'
import phrasesJson from './data/phrases.json'
import {
  availableLanguages,
  buildItems,
  checkSceneData,
  countItems,
  parsePhrases,
  parseSceneIndex,
  parseTranslation,
  pickLanguage,
  SceneDataError,
  sceneCounts,
  studiedItemIds,
  sortScenes,
  type Phrase,
  type PhraseTranslation,
  type SceneEntry,
  type SceneIndex,
} from './scenes'

const sentence = (text: string) => ({ text, zhuyin: '', pinyin: '' })

const scene = (patch: Partial<SceneEntry> & { id: string }): SceneEntry => ({
  version: 1,
  name: patch.id,
  items: [],
  languages: ['ja', 'en'],
  level: 1,
  ...patch,
})

const phrases: Phrase[] = [
  { id: 'r0001', kind: 'respond', line: sentence('歡迎光臨！'), answers: [] },
  { id: 'r0002', kind: 'respond', line: sentence('需要袋子嗎？'), answers: [sentence('不用。')] },
  { id: 's0001', kind: 'say', answers: [sentence('我要外帶。')] },
]

const tr = (language: string): PhraseTranslation => ({
  language,
  scenes: { a: `A-${language}`, b: `B-${language}`, c: `C-${language}` },
  items: {
    r0001: { line: 'いらっしゃいませ', answers: [] },
    r0002: { line: '袋は要りますか', answers: ['要りません'] },
    s0001: { intent: '持ち帰りたい', answers: ['持ち帰りで'] },
  },
})

const index: SceneIndex = {
  scenes: [
    scene({ id: 'a', items: ['r0002', 's0001'] }),
    scene({ id: 'b', items: ['r0001', 'r0002'], level: 2 }),
    scene({ id: 'c', items: ['s0001'], languages: ['en'] }),
  ],
}

describe('配布する場面のデータ（仕様書 18.5）', () => {
  const realIndex = parseSceneIndex(indexJson)
  const realPhrases = parsePhrases(phrasesJson)
  const translations = { ja: parseTranslation(ja), en: parseTranslation(en) }

  it('一覧・項目・訳が形式どおりで、互いに合っている', () => {
    expect(checkSceneData(realIndex, realPhrases, translations)).toEqual([])
  })

  it('項目の ID は r・s と4桁の番号', () => {
    for (const p of realPhrases) expect(p.id).toMatch(/^[rs]\d{4}$/)
  })

  it('上級向けの場面（版 1.37）があり、基本の場面の後に並ぶ（FR-CONV-09）', () => {
    const advanced = realIndex.scenes.filter((s) => s.level >= 2).map((s) => s.id)
    expect(advanced).toEqual(['clinic', 'device-repair', 'bulky-waste'])
    const sorted = sortScenes(realIndex.scenes).map((s) => s.level)
    expect(sorted).toEqual([...sorted].sort((a, b) => a - b))
  })

  it('「歡迎光臨」（r0001）は一覧にあるが、コンビニでは出題しない', () => {
    expect(realPhrases.some((p) => p.id === 'r0001')).toBe(true)
    const store = realIndex.scenes.find((s) => s.id === 'convenience-store')
    expect(store?.items).not.toContain('r0001')
  })

  it('すべての文に注音と拼音がある（読みの要確認が残っていない）', () => {
    for (const p of realPhrases) {
      for (const s of [p.line, ...p.answers]) {
        if (!s) continue
        expect(s.zhuyin, s.text).not.toBe('')
        expect(s.zhuyin, s.text).not.toContain('?')
        // 拼音の「?」は句読点にも使うため、辞書に無い字の印（単独の ?）だけを調べる
        expect(s.pinyin.split(' '), s.text).not.toContain('?')
      }
    }
  })
})

describe('parseSceneIndex', () => {
  const valid = {
    format: 'tc-vocab-scenes',
    version: 1,
    scenes: [{ id: 'a', version: 1, name: '甲', items: ['r0001'], languages: ['ja'], level: 1 }],
  }

  it('知らない項目は無視する', () => {
    const parsed = parseSceneIndex({ ...valid, extra: 1, scenes: [{ ...valid.scenes[0], foo: 2 }] })
    expect(parsed.scenes[0]).toEqual(valid.scenes[0])
  })

  it('背景の画像（任意）を読む', () => {
    const parsed = parseSceneIndex({
      ...valid,
      scenes: [{ ...valid.scenes[0], image: 'images/a.webp' }],
    })
    expect(parsed.scenes[0]?.image).toBe('images/a.webp')
  })

  it.each([
    ['format が違う', { ...valid, format: 'x' }],
    ['新しすぎる版', { ...valid, version: 2 }],
    ['場面の ID が不正', { ...valid, scenes: [{ ...valid.scenes[0], id: 'A B' }] }],
    ['level が無い', { ...valid, scenes: [{ ...valid.scenes[0], level: undefined }] }],
  ])('%s ときはエラー', (_label, data) => {
    expect(() => parseSceneIndex(data)).toThrow(SceneDataError)
  })
})

describe('checkSceneData', () => {
  it('問題が無ければ空', () => {
    expect(checkSceneData(index, phrases, { ja: tr('ja'), en: tr('en') })).toEqual([])
  })

  it('一覧に無い項目、訳の不足、回答例の件数の違いを見つける', () => {
    const broken = tr('ja')
    delete broken.items.s0001
    broken.items.r0002 = { line: 'x', answers: [] }
    const problems = checkSceneData(
      { scenes: [scene({ id: 'a', items: ['r0002', 's0001', 'r9999'], languages: ['ja'] })] },
      phrases,
      { ja: broken },
    )
    expect(problems).toEqual([
      'a: 項目 r9999 が一覧にありません',
      'r0002: ja の回答例の訳の件数が合いません',
      'a: ja に s0001 の訳がありません',
    ])
  })
})

describe('訓練の言語（FR-CONV-05・06）', () => {
  it('用意のある言語を現れた順に返す', () => {
    expect(availableLanguages(index)).toEqual(['ja', 'en'])
  })

  it('保存した言語 → UI 言語 → 英語 の順に選ぶ', () => {
    expect(pickLanguage(['ja', 'en'], 'ja', 'en')).toBe('ja')
    expect(pickLanguage(['ja', 'en'], null, 'ja')).toBe('ja')
    expect(pickLanguage(['ja', 'en'], null, 'en-US')).toBe('en')
    // UI 言語に用意が無い（繁體中文・韓国語など）ときは英語
    expect(pickLanguage(['ja', 'en'], null, 'zh-TW')).toBe('en')
    expect(pickLanguage(['ja', 'en'], null, 'ko')).toBe('en')
  })

  it('保存した言語の用意が無くなっていたら、次の候補に移る', () => {
    expect(pickLanguage(['ja', 'en'], 'vi', 'ja')).toBe('ja')
  })

  it('英語も無ければ最初の言語、何も無ければ null', () => {
    expect(pickLanguage(['ja', 'vi'], null, 'ko')).toBe('ja')
    expect(pickLanguage([], null, 'ja')).toBeNull()
  })
})

describe('sortScenes（FR-CONV-09）', () => {
  it('基本の場面を先にし、同じ難しさの中は元の順', () => {
    const scenes = [scene({ id: 'x', level: 2 }), scene({ id: 'y' }), scene({ id: 'z' })]
    expect(sortScenes(scenes).map((s) => s.id)).toEqual(['y', 'z', 'x'])
  })
})

describe('buildItems・countItems（FR-CONV-01〜03・07）', () => {
  const ids = (items: { phrase: Phrase }[]) => items.map((i) => i.phrase.id)

  it('場面の順・場面の中の順に並べ、重なる項目は1回だけにする（18.5）', () => {
    const items = buildItems({ index, phrases, translation: tr('ja'), sceneIds: [], kinds: 'both' })
    expect(ids(items)).toEqual(['r0002', 's0001', 'r0001'])
    // カードに示す場面は、並びが先の場面
    expect(items[0]?.scene.id).toBe('a')
    expect(items[0]?.sceneName).toBe('A-ja')
  })

  it('選んだ言語の用意が無い場面は除く', () => {
    const items = buildItems({
      index,
      phrases,
      translation: tr('ja'),
      sceneIds: ['c'],
      kinds: 'both',
    })
    expect(items).toEqual([])
    expect(countItems({ index, sceneIds: ['c'], kinds: 'both', language: 'ja' })).toBe(0)
    expect(countItems({ index, sceneIds: ['c'], kinds: 'both', language: 'en' })).toBe(1)
  })

  it('種類で絞り込む', () => {
    const items = buildItems({ index, phrases, translation: tr('ja'), sceneIds: [], kinds: 'say' })
    expect(ids(items)).toEqual(['s0001'])
    expect(countItems({ index, sceneIds: [], kinds: 'respond', language: 'ja' })).toBe(2)
  })

  it('対象の項目数は、出題する項目の数と同じ', () => {
    for (const kinds of ['both', 'respond', 'say'] as const) {
      for (const sceneIds of [[], ['a'], ['b'], ['a', 'b']]) {
        const items = buildItems({ index, phrases, translation: tr('ja'), sceneIds, kinds })
        expect(countItems({ index, sceneIds, kinds, language: 'ja' })).toBe(items.length)
      }
    }
  })
})

describe('場面ごとの出題済み / 登録の数（FR-CONV-22）', () => {
  it('進捗の ID から、このモードの項目の ID だけを取り出す', () => {
    expect(
      studiedItemIds([
        'item:conversation:r0002',
        'item:other:r0001',
        'w-123',
        'item:conversation:s0001',
      ]),
    ).toEqual(new Set(['r0002', 's0001']))
  })

  it('登録は場面の項目の数（種類によらない）、出題済みは進捗のある項目の数', () => {
    const studied = new Set(['r0002'])
    expect(sceneCounts(index.scenes[0], studied)).toEqual({ studied: 1, total: 2 })
    expect(sceneCounts(index.scenes[1], studied)).toEqual({ studied: 1, total: 2 })
    expect(sceneCounts(index.scenes[2], studied)).toEqual({ studied: 0, total: 1 })
  })

  it('項目を増やせば登録の数も増える', () => {
    const grown = scene({ id: 'a', items: ['r0002', 's0001', 'r0001'] })
    expect(sceneCounts(grown, new Set())).toEqual({ studied: 0, total: 3 })
  })
})
