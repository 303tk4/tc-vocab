// 出力の整形（仕様書 16.5）。入出力を持たない純粋な処理だけを置く。

/**
 * パッケージの JSON を文字列にする。差分を見やすく、容量を抑えるため、単語は1行に1語とする。
 * @param {{ words: object[] }} pack
 * @returns {string}
 */
export function formatPackJson(pack) {
  const { words, ...head } = pack
  const headJson = JSON.stringify(head, null, 2).replace(/\n}$/, '')
  const body = words.map((w) => `    ${JSON.stringify(w)}`).join(',\n')
  return `${headJson},\n  "words": [\n${body}\n  ]\n}\n`
}

/**
 * パッケージの一覧（index.json）に項目を加える。同じ ID があれば置き換え、並び順は保つ。
 * @param {{ format: string, version: number, packs: { id: string }[] } | null} current
 * @param {{ id: string }} entry
 */
export function upsertIndex(current, entry) {
  const packs = current?.packs ? [...current.packs] : []
  const i = packs.findIndex((p) => p.id === entry.id)
  if (i >= 0) packs[i] = entry
  else packs.push(entry)
  return { format: 'tc-vocab-packs', version: 1, packs }
}

const REASONS = {
  loose: '表記の流儀の違いだけ（一・不の変調、軽声）。辞書の表記を使った',
  dict: '詞語表の読みが欠けている。辞書の読みを使った',
  differ: '辞書と詞語表で読みが異なる。辞書の読みを使った（要確認）',
  ambiguous: '辞書に読みが複数あり、決められない。先頭の読みを使った（要確認）',
  'tbcl-only': '辞書にない。詞語表の読みを使った（要確認）',
  none: '読みが見つからない（要確認）',
}

/**
 * 読みの判定で、辞書と詞語表が完全には一致しなかった語の一覧（確認用）。
 * @param {string} packId
 * @param {{ hanzi: string, level: string, zhuyin: string, hint: string, sure: boolean, reason: string }[]} notes
 */
export function renderReadingReport(packId, notes) {
  const lines = [
    `# ${packId} の読みの確認リスト`,
    '',
    '`scripts/packs/build-tocfl.mjs` が生成する。辞書（教育部《重編國語辭典修訂本》）と詞語表（TBCL）の読みが完全には一致しなかった語の一覧。',
    '「要確認」の語には、パッケージで `要確認:読み` タグを付けている。',
    '',
  ]
  for (const reason of Object.keys(REASONS)) {
    const xs = notes.filter((n) => n.reason === reason)
    if (xs.length === 0) continue
    lines.push(`## ${REASONS[reason]}（${xs.length} 語）`, '')
    lines.push('| 繁体字 | 級 | 採用した注音 | 詞語表の注音 |', '| --- | --- | --- | --- |')
    for (const n of xs)
      lines.push(`| ${n.hanzi} | ${n.level} | ${n.zhuyin} | ${n.hint || '（なし）'} |`)
    lines.push('')
  }
  return lines.join('\n')
}
