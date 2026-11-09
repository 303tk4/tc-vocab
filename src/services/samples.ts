// サンプル単語（仕様書 11章）
import { importWords, type ImportResult } from '../db/repos/words'
import type { DuplicateStrategy } from '../io/importer'
import { parseJson } from '../io/json'
import type { ParsedFile } from '../io/parsed'

/** サンプル単語に必ず付くタグ。UI 言語によらず固定（FR-SMP-02） */
export const SAMPLE_TAG = 'サンプル'

export const SAMPLES_URL = `${import.meta.env.BASE_URL}samples/starter.json`

/** 同梱のサンプル単語を読み込む。事前キャッシュされているので、オフラインでも読める（FR-PWA-01） */
export async function fetchSamples(): Promise<ParsedFile> {
  const response = await fetch(SAMPLES_URL)
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

/** サンプル単語を追加する。初期値では登録済みの単語を重複としてスキップする（FR-SMP-04） */
export async function addSampleWords(
  file?: ParsedFile,
  strategy: SampleStrategy = 'skip',
): Promise<ImportResult> {
  return importWords(file ?? (await fetchSamples()), { strategy, extraTag: SAMPLE_TAG })
}
