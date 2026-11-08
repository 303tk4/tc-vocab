// サンプル単語（仕様書 11章）
import { importWords, type ImportResult } from '../db/repos/words'
import { parseJson } from '../io/json'

/** サンプル単語に必ず付くタグ。UI 言語によらず固定（FR-SMP-02） */
export const SAMPLE_TAG = 'サンプル'

export const SAMPLES_URL = `${import.meta.env.BASE_URL}samples/starter.json`

/** サンプル単語を追加する。登録済みの単語は重複としてスキップする（FR-SMP-04） */
export async function addSampleWords(): Promise<ImportResult> {
  const response = await fetch(SAMPLES_URL)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const file = parseJson(await response.text())
  return importWords(file, { strategy: 'skip', extraTag: SAMPLE_TAG })
}
