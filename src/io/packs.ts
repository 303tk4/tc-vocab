// 単語パッケージの一覧（public/packs/index.json）の検証と表示用の処理（仕様書 16.5）。DB には触れない純粋な処理

export const PACK_INDEX_FORMAT = 'tc-vocab-packs'
export const PACK_INDEX_VERSION = 1

/** UI 言語ごとの文字列 */
export type LocalizedText = Record<string, string>

export interface PackEntry {
  id: string
  /** packs/ からの相対パス */
  file: string
  version: number
  name: LocalizedText
  description: LocalizedText
  wordCount: number
  /** パッケージの JSON のバイト数 */
  size: number
  tags: string[]
  meaningLanguage?: string
  license?: string
  source?: string
  /** 試験の級の対応表（任意。例：TOCFL と TBCL） */
  levelGuide?: LevelGuide
}

/** 級の対応表の1行 */
export interface LevelGuideRow {
  tocfl: LocalizedText
  cefr: string
  listening: string
  reading: string
  /** このパッケージに収めている級か */
  inPack: boolean
  /** この級の単語に付けているタグ */
  tag?: string
}

/** 級の対応表（仕様書 16.5）。TOCFL の各級に相当する TBCL の級を示す */
export interface LevelGuide {
  title: LocalizedText
  note: LocalizedText
  columns: Record<'tocfl' | 'cefr' | 'listening' | 'reading', LocalizedText>
  rows: LevelGuideRow[]
  source?: string
}

export class PackIndexError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PackIndexError'
  }
}

const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/
/** packs/ の外を指すパスや、別のサイトの URL は受け付けない（NFR-06） */
const FILE_PATTERN = /^[a-z0-9][a-z0-9._-]*\.json$/i

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

function localized(v: unknown): LocalizedText | null {
  if (typeof v === 'string') return { ja: v }
  if (!isRecord(v)) return null
  const entries = Object.entries(v).filter((e): e is [string, string] => typeof e[1] === 'string')
  return entries.length > 0 ? Object.fromEntries(entries) : null
}

const optionalString = (v: unknown) => (typeof v === 'string' && v !== '' ? v : undefined)
const text = (v: unknown) => (typeof v === 'string' ? v : '')

/** 対応表を検証する。不正なら undefined（表を出さないだけで、パッケージは使える） */
function parseLevelGuide(raw: unknown): LevelGuide | undefined {
  if (!isRecord(raw) || !isRecord(raw.columns) || !Array.isArray(raw.rows)) return undefined
  const title = localized(raw.title)
  const c = raw.columns
  const columns = {
    tocfl: localized(c.tocfl),
    cefr: localized(c.cefr),
    listening: localized(c.listening),
    reading: localized(c.reading),
  }
  if (!title || !columns.tocfl || !columns.cefr || !columns.listening || !columns.reading) {
    return undefined
  }
  const rows: LevelGuideRow[] = []
  for (const row of raw.rows) {
    const tocfl = isRecord(row) ? localized(row.tocfl) : null
    if (!isRecord(row) || !tocfl) return undefined
    rows.push({
      tocfl,
      cefr: text(row.cefr),
      listening: text(row.listening),
      reading: text(row.reading),
      inPack: row.inPack === true,
      tag: optionalString(row.tag),
    })
  }
  if (rows.length === 0) return undefined
  const source = isRecord(raw.source) ? optionalString(raw.source.name) : optionalString(raw.source)
  return {
    title,
    note: localized(raw.note) ?? {},
    columns: columns as LevelGuide['columns'],
    rows,
    source,
  }
}

const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0

/** 1件のパッケージを検証する。不正なものは null（一覧から除く） */
function parseEntry(raw: unknown): PackEntry | null {
  if (!isRecord(raw)) return null
  const { id, file, version, wordCount, size, tags } = raw
  const name = localized(raw.name)
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) return null
  if (typeof file !== 'string' || !FILE_PATTERN.test(file)) return null
  if (!Number.isInteger(version) || (version as number) < 1) return null
  if (!name || !isCount(wordCount) || !isCount(size)) return null
  return {
    id,
    file,
    version: version as number,
    name,
    description: localized(raw.description) ?? {},
    wordCount,
    size,
    tags: Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string') : [],
    meaningLanguage: optionalString(raw.meaningLanguage),
    license: optionalString(raw.license),
    source: optionalString(raw.source),
    levelGuide: parseLevelGuide(raw.levelGuide),
  }
}

/**
 * index.json を読み、パッケージの一覧を返す。形式や版が想定と違えば例外を投げる。
 * 個々のパッケージの記述が不正な場合は、そのパッケージだけを除く。ID の重複は先のものを残す
 */
export function parsePackIndex(text: string): PackEntry[] {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new PackIndexError('invalidJson')
  }
  if (!isRecord(data) || data.format !== PACK_INDEX_FORMAT || !Array.isArray(data.packs)) {
    throw new PackIndexError('invalidFormat')
  }
  if (data.version !== PACK_INDEX_VERSION) throw new PackIndexError('unsupportedVersion')
  const seen = new Set<string>()
  const packs: PackEntry[] = []
  for (const raw of data.packs) {
    const entry = parseEntry(raw)
    if (!entry || seen.has(entry.id)) continue
    seen.add(entry.id)
    packs.push(entry)
  }
  return packs
}

/** UI 言語の文字列を選ぶ。無ければ ja、次に最初の項目で代用する */
export function pickText(text: LocalizedText, language: string): string {
  return text[language] ?? text.ja ?? Object.values(text)[0] ?? ''
}

/** 容量の表示（例：「約 1.2 MB」の数値と単位）。1 KB 未満は 1 KB とする */
export function formatSize(bytes: number): { value: string; unit: 'KB' | 'MB' } {
  if (bytes >= 1024 * 1024) {
    return { value: (bytes / (1024 * 1024)).toFixed(1), unit: 'MB' }
  }
  return { value: String(Math.max(1, Math.round(bytes / 1024))), unit: 'KB' }
}

/** 追加済みのパッケージの記録（ID → 版） */
export type InstalledPacks = Record<string, number>

/**
 * 一覧に示す状態（仕様書 16.5）。追加の記録だけでなく、実際に登録されている単語で判断する。
 * notInstalled：未追加、または追加したが単語集の単語が1語も残っていない
 * partial：一部の単語だけが残っている、installed：すべて残っている、updateAvailable：新しい版がある
 */
export type PackStatus = 'notInstalled' | 'installed' | 'partial' | 'updateAvailable'

/**
 * @param present 単語集のタグ（`tags`）のどれかが付いた、登録中の単語の数
 */
export function packStatus(
  entry: Pick<PackEntry, 'id' | 'version' | 'wordCount'>,
  installed: InstalledPacks,
  present: number,
): PackStatus {
  const version = installed[entry.id]
  if (version === undefined || present === 0) return 'notInstalled'
  if (version < entry.version) return 'updateAvailable'
  return present < entry.wordCount ? 'partial' : 'installed'
}

/** UI 言語に合う単語集が無いときに先に並べる意味の言語（仕様書 16.5「意味の言語」） */
export const FALLBACK_MEANING_LANGUAGE = 'en'

/** 言語タグの主な部分（例：`en-US` → `en`）。大文字・小文字は区別しない */
export const primaryLanguage = (tag: string) => tag.split(/[-_]/)[0]!.toLowerCase()

/**
 * 一覧で先に並べる意味の言語（16.5）。UI 言語と同じ意味の言語の単語集があればその言語、
 * 無ければ英語とする
 */
export function preferredMeaningLanguage(
  items: readonly { meaningLanguage?: string }[],
  uiLanguage: string,
): string {
  const ui = primaryLanguage(uiLanguage)
  return items.some((i) => i.meaningLanguage && primaryLanguage(i.meaningLanguage) === ui)
    ? ui
    : FALLBACK_MEANING_LANGUAGE
}

/**
 * 意味の言語で並べ替える（16.5）。先に並べる言語（preferredMeaningLanguage）の単語集を先にし、
 * それ以外と、同じ言語の中は元の順（index.json の順）を保つ。`meaningLanguage` の無いものは後ろの組に入る
 */
export function sortByMeaningLanguage<T extends { meaningLanguage?: string }>(
  items: readonly T[],
  uiLanguage: string,
): T[] {
  const preferred = preferredMeaningLanguage(items, uiLanguage)
  const first = (i: T) => !!i.meaningLanguage && primaryLanguage(i.meaningLanguage) === preferred
  return [...items.filter(first), ...items.filter((i) => !first(i))]
}

/**
 * 意味の言語の名前を、その言語自身での名前で返す（例：`ja` → 日本語、`en` → English、`vi` → Tiếng Việt）。
 * 名前がわからない言語は、言語タグをそのまま返す
 */
export function meaningLanguageName(tag: string): string {
  try {
    const name = new Intl.DisplayNames([tag], { type: 'language' }).of(tag)
    if (!name || name === tag) return tag
    // 先頭が小文字の名前（例：`vi` の「tiếng Việt」）は、見出しとして先頭を大文字にする
    return name.charAt(0).toLocaleUpperCase(tag) + name.slice(1)
  } catch {
    return tag
  }
}
