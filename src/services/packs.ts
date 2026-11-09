// 単語パッケージの読み込みと追加（仕様書 16.5）。同じサイトの packs/ を読むだけで、外部とは通信しない（NFR-06）
import { markPackInstalled } from '../db/repos/packs'
import { importWords, type ImportResult } from '../db/repos/words'
import type { DuplicateStrategy } from '../io/importer'
import { parseJson } from '../io/json'
import { parsePackIndex, type PackEntry } from '../io/packs'
import type { ParsedFile } from '../io/parsed'

export const PACKS_BASE_URL = `${import.meta.env.BASE_URL}packs/`
export const PACK_INDEX_URL = `${PACKS_BASE_URL}index.json`

async function fetchText(url: string): Promise<string> {
  // 版の更新に気づけるよう、ブラウザのキャッシュは使わずに確認する
  const response = await fetch(url, { cache: 'no-cache' })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.text()
}

/**
 * パッケージの一覧を読み込む。一覧がまだ無いときは空の一覧とする。
 * 無いファイルに対して 404 ではなく index.html を返すサーバー（vite preview など）もあるため、HTML も「無い」とみなす
 */
export async function fetchPackIndex(): Promise<PackEntry[]> {
  const response = await fetch(PACK_INDEX_URL, { cache: 'no-cache' })
  if (response.status === 404) return []
  if (response.ok && response.headers.get('content-type')?.includes('text/html')) return []
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return parsePackIndex(await response.text())
}

/** パッケージの単語（9.1 の JSON 形式）を読み込む */
export async function fetchPack(entry: Pick<PackEntry, 'file'>): Promise<ParsedFile> {
  return parseJson(await fetchText(`${PACKS_BASE_URL}${entry.file}`))
}

/** パッケージを追加し、追加した版を記録する */
export async function addPack(
  entry: Pick<PackEntry, 'id' | 'version'>,
  file: ParsedFile,
  strategy: DuplicateStrategy,
): Promise<ImportResult> {
  const result = await importWords(file, { strategy })
  await markPackInstalled(entry.id, entry.version)
  return result
}
