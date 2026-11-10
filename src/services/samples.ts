// サンプル単語（仕様書 11章）
import { importWords, type ImportResult } from '../db/repos/words'
import type { DuplicateStrategy } from '../io/importer'
import { parseJson } from '../io/json'
import { primaryLanguage } from '../io/packs'
import type { ParsedFile } from '../io/parsed'

/** サンプル単語に必ず付くタグ。UI 言語・意味の言語によらず固定（FR-SMP-02） */
export const SAMPLE_TAG = 'サンプル'

/** サンプル単語の意味の言語。日本語版と英語版を同梱する（FR-SMP-01、仕様書 16.5「意味の言語」） */
export const SAMPLE_LANGUAGES = ['ja', 'en'] as const
export type SampleLanguage = (typeof SAMPLE_LANGUAGES)[number]

const SAMPLE_FILES: Record<SampleLanguage, string> = {
  ja: 'starter.json',
  en: 'starter-en.json',
}

export const samplesUrl = (language: SampleLanguage) =>
  `${import.meta.env.BASE_URL}samples/${SAMPLE_FILES[language]}`

/** ホームの案内から追加する版。UI 言語が日本語なら日本語版、それ以外は英語版（仕様書 11章） */
export const sampleLanguageFor = (uiLanguage: string): SampleLanguage =>
  primaryLanguage(uiLanguage) === 'ja' ? 'ja' : 'en'

/** 同梱のサンプル単語を読み込む。事前キャッシュされているので、オフラインでも読める（FR-PWA-01） */
export async function fetchSamples(language: SampleLanguage): Promise<ParsedFile> {
  const response = await fetch(samplesUrl(language))
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return parseJson(await response.text())
}

/**
 * サンプル単語で選べる重複の扱い（FR-SMP-04）。「タグだけ付ける」「統合する」は選べない。
 * どちらも利用者の単語に `サンプル` タグが付き、一括削除（FR-SMP-05）で消えてしまうため
 */
export const SAMPLE_STRATEGIES = [
  'skip',
  'keepBoth',
] as const satisfies readonly DuplicateStrategy[]
export type SampleStrategy = (typeof SAMPLE_STRATEGIES)[number]

/**
 * サンプル単語を追加する。初期値では登録済みの単語を重複としてスキップする（FR-SMP-04）。
 * `file` を省くと、指定した意味の言語の版を読み込んで追加する
 */
export async function addSampleWords(
  language: SampleLanguage,
  file?: ParsedFile,
  strategy: SampleStrategy = 'skip',
): Promise<ImportResult> {
  return importWords(file ?? (await fetchSamples(language)), { strategy, extraTag: SAMPLE_TAG })
}
