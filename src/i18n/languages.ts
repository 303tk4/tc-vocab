// 言語タグの比較と言語の名前（仕様書 16.5 の意味の言語、18.2 の訓練の言語で共通に使う）

/** 言語タグの主な部分（例：`en-US` → `en`）。大文字・小文字は区別しない */
export const primaryLanguage = (tag: string) => tag.split(/[-_]/)[0]!.toLowerCase()

/**
 * 言語の名前を、その言語自身での名前で返す（例：`ja` → 日本語、`en` → English、`vi` → Tiếng Việt）。
 * 名前がわからない言語は、言語タグをそのまま返す
 */
export function languageName(tag: string): string {
  try {
    const name = new Intl.DisplayNames([tag], { type: 'language' }).of(tag)
    if (!name || name === tag) return tag
    // 先頭が小文字の名前（例：`vi` の「tiếng Việt」）は、見出しとして先頭を大文字にする
    return name.charAt(0).toLocaleUpperCase(tag) + name.slice(1)
  } catch {
    return tag
  }
}
