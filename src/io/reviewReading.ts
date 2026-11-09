// 読みを確定できなかった単語に付くタグ（FR-WORDS-14）。DB に依存しない純粋な処理

/** タグ名は UI 言語によらず固定。単語パッケージ（16.5）や、将来の読みの自動付与（16.4）で付く */
export const REVIEW_READING_TAG = '要確認:読み'

/** 単語のうち `要確認:読み` タグを持つものの数 */
export function countReviewReading(
  words: readonly ({ tags: readonly string[] } | null | undefined)[],
): number {
  return words.filter((w) => w?.tags.includes(REVIEW_READING_TAG)).length
}
