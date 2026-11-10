// 場面のデータの形式・検証・読み込み（仕様書 18.5）。検証と組み立ては React から独立した純粋関数
import { primaryLanguage } from '../../i18n/languages'
import { itemProgressId } from '../../types/word'
import { MODE_ID } from './modeId'

export const SCENE_INDEX_FORMAT = 'tc-vocab-scenes'
export const SCENE_INDEX_VERSION = 1
/** 場面の ID（公開後は変えない） */
export const SCENE_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/
/** 項目の ID：r（答える）・s（言う）と4桁の番号（公開後は変えない） */
export const ITEM_ID_PATTERN = /^[rs]\d{4}$/
/** 用意が無いときに選ぶ訓練の言語（FR-CONV-06） */
export const FALLBACK_LANGUAGE = 'en'
/** 回答例の最大件数（FR-CONV-12・14） */
export const MAX_ANSWERS = 3

export type ItemKind = 'respond' | 'say'

export interface Sentence {
  /** 繁体字 */
  text: string
  zhuyin: string
  pinyin: string
}

export interface Phrase {
  id: string
  kind: ItemKind
  /** respond：店員などのセリフ */
  line?: Sentence
  /** 回答例（respond は 0〜3 件、say は 1〜3 件） */
  answers: Sentence[]
}

export interface SceneEntry {
  id: string
  version: number
  /** 繁体字の名前（例：便利商店） */
  name: string
  /** 出題する項目の ID（この順に出す） */
  items: string[]
  /** 用意のある訓練の言語 */
  languages: string[]
  /** 難しさ。1：基本、2：上級向け（FR-CONV-09） */
  level: number
  /** 背景の画像（data/ からの相対パス。FR-CONV-16） */
  image?: string
}

export interface SceneIndex {
  scenes: SceneEntry[]
}

export interface ItemTranslation {
  line?: string
  intent?: string
  answers: string[]
  note?: string
}

export interface PhraseTranslation {
  language: string
  /** 場面の ID → 場面の名前 */
  scenes: Record<string, string>
  /** 項目の ID → 訳 */
  items: Record<string, ItemTranslation>
}

export class SceneDataError extends Error {}

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''
const fail = (message: string): never => {
  throw new SceneDataError(message)
}

// 読み込みでは、知らない項目を無視する（18.5。任意の項目を足しても形式の版を上げずに済むように）

/** index.json を検証する */
export function parseSceneIndex(raw: unknown): SceneIndex {
  if (!isObj(raw) || raw.format !== SCENE_INDEX_FORMAT) fail('format が正しくありません')
  const data = raw as Obj
  if (typeof data.version !== 'number' || data.version > SCENE_INDEX_VERSION) {
    fail('対応していない版です')
  }
  if (!Array.isArray(data.scenes)) fail('scenes がありません')
  const scenes = (data.scenes as unknown[]).map((s, i): SceneEntry => {
    if (!isObj(s)) return fail(`scenes[${i}] が正しくありません`)
    const { id, version, name, items, languages, level, image } = s
    if (!isStr(id) || !SCENE_ID_PATTERN.test(id)) fail(`scenes[${i}].id が正しくありません`)
    if (!Number.isInteger(version)) fail(`${String(id)}: version が正しくありません`)
    if (!isStr(name)) fail(`${String(id)}: name がありません`)
    if (!Array.isArray(items) || !items.every(isStr))
      fail(`${String(id)}: items が正しくありません`)
    if (!Array.isArray(languages) || !languages.every(isStr)) {
      fail(`${String(id)}: languages が正しくありません`)
    }
    if (!Number.isInteger(level) || (level as number) < 1)
      fail(`${String(id)}: level が正しくありません`)
    if (image !== undefined && !isStr(image)) fail(`${String(id)}: image が正しくありません`)
    const entry: SceneEntry = {
      id: id as string,
      version: version as number,
      name: name as string,
      items: items as string[],
      languages: languages as string[],
      level: level as number,
    }
    if (image !== undefined) entry.image = image as string
    return entry
  })
  return { scenes }
}

function parseSentence(raw: unknown, where: string): Sentence {
  if (
    !isObj(raw) ||
    !isStr(raw.text) ||
    typeof raw.zhuyin !== 'string' ||
    typeof raw.pinyin !== 'string'
  ) {
    return fail(`${where} が正しくありません`)
  }
  return { text: raw.text, zhuyin: raw.zhuyin, pinyin: raw.pinyin }
}

/** phrases.json を検証する */
export function parsePhrases(raw: unknown): Phrase[] {
  if (!isObj(raw) || !Array.isArray(raw.items)) return fail('items がありません')
  return (raw.items as unknown[]).map((p, i): Phrase => {
    if (!isObj(p) || !isStr(p.id) || !ITEM_ID_PATTERN.test(p.id)) {
      return fail(`items[${i}].id が正しくありません`)
    }
    const id = p.id
    if (p.kind !== 'respond' && p.kind !== 'say') return fail(`${id}: kind が正しくありません`)
    if (!Array.isArray(p.answers)) return fail(`${id}: answers がありません`)
    const answers = (p.answers as unknown[]).map((a, j) => parseSentence(a, `${id}.answers[${j}]`))
    const phrase: Phrase = { id, kind: p.kind, answers }
    if (p.kind === 'respond') phrase.line = parseSentence(p.line, `${id}.line`)
    return phrase
  })
}

/** locales/<言語>.json を検証する */
export function parseTranslation(raw: unknown): PhraseTranslation {
  if (!isObj(raw) || !isStr(raw.language) || !isObj(raw.scenes) || !isObj(raw.items)) {
    return fail('訳のファイルが正しくありません')
  }
  const scenes: Record<string, string> = {}
  for (const [id, name] of Object.entries(raw.scenes)) if (isStr(name)) scenes[id] = name
  const items: Record<string, ItemTranslation> = {}
  for (const [id, v] of Object.entries(raw.items)) {
    if (!isObj(v) || !Array.isArray(v.answers) || !v.answers.every((a) => typeof a === 'string')) {
      continue
    }
    const tr: ItemTranslation = { answers: v.answers as string[] }
    if (isStr(v.line)) tr.line = v.line
    if (isStr(v.intent)) tr.intent = v.intent
    if (isStr(v.note)) tr.note = v.note
    items[id] = tr
  }
  return { language: raw.language, scenes, items }
}

/**
 * 場面のデータどうしが合っているかを確かめ、問題の一覧を返す（18.5。単体テストで使う）。
 * ID の重複、場面が指す項目の有無、各場面の言語の訳がそろっているか、回答例の件数を見る
 */
export function checkSceneData(
  index: SceneIndex,
  phrases: Phrase[],
  translations: Record<string, PhraseTranslation>,
): string[] {
  const problems: string[] = []
  const byId = new Map<string, Phrase>()
  for (const p of phrases) {
    if (byId.has(p.id)) problems.push(`項目の ID が重複しています：${p.id}`)
    byId.set(p.id, p)
    const prefix = p.kind === 'respond' ? 'r' : 's'
    if (!p.id.startsWith(prefix)) problems.push(`${p.id}: ID の頭文字と kind が合いません`)
    const min = p.kind === 'say' ? 1 : 0
    if (p.answers.length < min || p.answers.length > MAX_ANSWERS) {
      problems.push(`${p.id}: 回答例の件数が範囲外です`)
    }
  }
  const sceneIds = new Set<string>()
  for (const scene of index.scenes) {
    if (sceneIds.has(scene.id)) problems.push(`場面の ID が重複しています：${scene.id}`)
    sceneIds.add(scene.id)
    if (new Set(scene.items).size !== scene.items.length) {
      problems.push(`${scene.id}: 同じ項目を2回指しています`)
    }
    for (const itemId of scene.items) {
      if (!byId.has(itemId)) problems.push(`${scene.id}: 項目 ${itemId} が一覧にありません`)
    }
    for (const language of scene.languages) {
      const tr = translations[language]
      if (!tr) {
        problems.push(`${scene.id}: 言語 ${language} の訳のファイルがありません`)
        continue
      }
      if (!tr.scenes[scene.id]) problems.push(`${scene.id}: ${language} の場面の名前がありません`)
      for (const itemId of scene.items) {
        const phrase = byId.get(itemId)
        const item = tr.items[itemId]
        if (!phrase) continue
        if (!item) {
          problems.push(`${scene.id}: ${language} に ${itemId} の訳がありません`)
          continue
        }
        if (phrase.kind === 'respond' && !item.line) {
          problems.push(`${itemId}: ${language} にセリフの訳がありません`)
        }
        if (phrase.kind === 'say' && !item.intent) {
          problems.push(`${itemId}: ${language} に言いたいことがありません`)
        }
        if (item.answers.length !== phrase.answers.length) {
          problems.push(`${itemId}: ${language} の回答例の訳の件数が合いません`)
        }
      }
    }
  }
  return problems
}

/** 場面のデータに用意のある訓練の言語（現れた順。FR-CONV-05） */
export function availableLanguages(index: SceneIndex): string[] {
  const out: string[] = []
  for (const scene of index.scenes)
    for (const l of scene.languages) if (!out.includes(l)) out.push(l)
  return out
}

/**
 * 訓練の言語の初期値（FR-CONV-06）。保存した言語 → UI 言語と同じ言語 → 英語 の順に、用意のあるもの。
 * どれも無ければ用意のある最初の言語、用意が無ければ null
 */
export function pickLanguage(
  available: readonly string[],
  saved: string | null | undefined,
  uiLanguage: string,
): string | null {
  if (saved && available.includes(saved)) return saved
  const ui = primaryLanguage(uiLanguage)
  const sameAsUi = available.find((l) => primaryLanguage(l) === ui)
  if (sameAsUi) return sameAsUi
  if (available.includes(FALLBACK_LANGUAGE)) return FALLBACK_LANGUAGE
  return available[0] ?? null
}

/** 場面の一覧の並び：基本の場面を先にし、同じ難しさの中は index.json の順（FR-CONV-09） */
export function sortScenes(scenes: readonly SceneEntry[]): SceneEntry[] {
  return scenes
    .map((scene, i) => ({ scene, i }))
    .sort((a, b) => a.scene.level - b.scene.level || a.i - b.i)
    .map((x) => x.scene)
}

/** 出題の種類の選び方（FR-CONV-01） */
export type KindFilter = 'both' | ItemKind

/** 学習する1問 */
export interface StudyItem {
  phrase: Phrase
  translation: ItemTranslation
  /** カードに示す場面（選んだ場面のうち、並びが先のもの。18.5） */
  scene: SceneEntry
  /** 訓練の言語での場面の名前 */
  sceneName: string
}

/**
 * 選んだ場面・種類・言語から、出題する項目を並べる（FR-CONV-01〜03・07）。
 * 未選択はすべての場面とし、選んだ言語の用意が無い場面は除く。
 * 場面の順・場面の中の順に並べ、複数の場面にある項目は最初の1回だけにする
 */
export function buildItems({
  index,
  phrases,
  translation,
  sceneIds,
  kinds,
}: {
  index: SceneIndex
  phrases: readonly Phrase[]
  translation: PhraseTranslation
  sceneIds: readonly string[]
  kinds: KindFilter
}): StudyItem[] {
  const byId = new Map(phrases.map((p) => [p.id, p]))
  const scenes = sortScenes(index.scenes).filter(
    (s) =>
      s.languages.includes(translation.language) &&
      (sceneIds.length === 0 || sceneIds.includes(s.id)),
  )
  const seen = new Set<string>()
  const out: StudyItem[] = []
  for (const scene of scenes) {
    for (const itemId of scene.items) {
      const phrase = byId.get(itemId)
      const tr = translation.items[itemId]
      if (!phrase || !tr || seen.has(itemId)) continue
      if (kinds !== 'both' && phrase.kind !== kinds) continue
      seen.add(itemId)
      out.push({
        phrase,
        translation: tr,
        scene,
        sceneName: translation.scenes[scene.id] ?? '',
      })
    }
  }
  return out
}

/** 項目の種類（ID の頭文字で決まる。18.5） */
export const kindOfId = (itemId: string): ItemKind => (itemId.startsWith('r') ? 'respond' : 'say')

/**
 * 準備画面に示す対象の項目数（FR-CONV-01）。一覧（index.json）だけで数え、
 * buildItems と同じく、選んだ言語の用意が無い場面を除き、重なる項目は1つと数える
 */
export function countItems({
  index,
  sceneIds,
  kinds,
  language,
}: {
  index: SceneIndex
  sceneIds: readonly string[]
  kinds: KindFilter
  language: string
}): number {
  const ids = new Set<string>()
  for (const scene of index.scenes) {
    if (!scene.languages.includes(language)) continue
    if (sceneIds.length > 0 && !sceneIds.includes(scene.id)) continue
    for (const id of scene.items) if (kinds === 'both' || kindOfId(id) === kinds) ids.add(id)
  }
  return ids.size
}

/** 進捗の ID（item:conversation:r0001）から、このモードの項目の ID（r0001）を取り出す（FR-CONV-22） */
export function studiedItemIds(progressIds: readonly string[]): Set<string> {
  const prefix = itemProgressId(MODE_ID, '')
  return new Set(progressIds.filter((p) => p.startsWith(prefix)).map((p) => p.slice(prefix.length)))
}

/** 場面の出題済みと登録の数（FR-CONV-22） */
export interface SceneCounts {
  studied: number
  total: number
}

/**
 * 場面ごとの「出題済み / 登録」の数（FR-CONV-22）。登録は場面の項目の数（種類によらない）、
 * 出題済みはそのうち進捗の記録がある項目の数。studiedItemIds は進捗のある項目の ID（`r0001` など）
 */
export function sceneCounts(scene: SceneEntry, studiedItemIds: ReadonlySet<string>): SceneCounts {
  const ids = new Set(scene.items)
  let studied = 0
  for (const id of ids) if (studiedItemIds.has(id)) studied++
  return { studied, total: ids.size }
}

// ---- 読み込み（動的 import。使うときだけ読み、オフライン用のキャッシュにも含まれる。FR-PLUG-07） ----

const indexFile = () => import('./data/index.json').then((m) => m.default as unknown)
const phrasesFile = () => import('./data/phrases.json').then((m) => m.default as unknown)
const translationFiles = import.meta.glob<{ default: unknown }>('./data/locales/*.json')
// 背景の画像は WebP だけとする（18.7。png は事前キャッシュの対象のため使わない。12.1）
const imageFiles = import.meta.glob<string>('./data/images/*.webp', {
  query: '?url',
  import: 'default',
})

export function loadSceneIndex(): Promise<SceneIndex> {
  return indexFile().then(parseSceneIndex)
}

export interface SceneData {
  index: SceneIndex
  phrases: Phrase[]
  translation: PhraseTranslation
}

/** 訓練の言語の訳を読む（準備画面の場面の名前にも使う） */
export async function loadTranslation(language: string): Promise<PhraseTranslation> {
  const load = translationFiles[`./data/locales/${language}.json`]
  if (!load) throw new SceneDataError(`訓練の言語 ${language} の訳がありません`)
  return parseTranslation((await load()).default)
}

/** 出題に使うデータ（一覧・項目・選んだ言語の訳）を読む。言語が増えても読むのは1言語だけ */
export async function loadSceneData(language: string): Promise<SceneData> {
  const [index, phrases, translation] = await Promise.all([
    loadSceneIndex(),
    phrasesFile().then(parsePhrases),
    loadTranslation(language),
  ])
  return { index, phrases, translation }
}

/** 背景の画像の URL（FR-CONV-16）。画像が無ければ null */
export async function sceneImageUrl(scene: SceneEntry): Promise<string | null> {
  if (!scene.image) return null
  const load = imageFiles[`./data/${scene.image}`]
  return load ? load() : null
}
