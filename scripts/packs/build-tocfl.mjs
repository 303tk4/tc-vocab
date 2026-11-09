// TOCFL 対応の単語パッケージを作る（仕様書 16.5「TOCFL・HSK の単語集の作り方」）
//
//   node scripts/packs/build-tocfl.mjs              … public/packs/ に出力する
//   node scripts/packs/build-tocfl.mjs --worklist F … 意味が未記入の語の一覧を F に書き出す（下書き用）
//
// 入力：
//   sources/tbcl-14452-202504.xlsx            國家教育研究院「三等七級詞語表」
//   sources/dict_revised_2015_20260929.zip    教育部《重編國語辭典修訂本》（リポジトリには入れない。README 参照）
//   meanings/tocfl-1.ja.tsv                   日本語の意味（AI による下書き）
// 出力：
//   public/packs/tocfl-1.json、public/packs/index.json、scripts/packs/reports/tocfl-1-readings.md
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildWords, NEEDS_CHECK_TAG, packFile, parseMeanings, tbclTag } from './lib/pack.mjs'
import { buildReadingIndex, decideReading } from './lib/reading.mjs'
import { parseTbclRows, TBCL_LEVELS } from './lib/tbcl.mjs'
import { readFirstSheet, readZip } from './lib/xlsx.mjs'
import { formatPackJson, renderReadingReport, upsertIndex } from './lib/output.mjs'
import { TOCFL_GUIDE } from './tocfl-guide.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')
const SOURCES = {
  tbcl: join(here, 'sources', 'tbcl-14452-202504.xlsx'),
  dict: join(here, 'sources', 'dict_revised_2015_20260929.zip'),
}

/** パッケージの定義。内容を変えたら version を上げ、updatedAt を直す（仕様書 16.5「更新」） */
const PACK = {
  id: 'tocfl-1',
  file: 'tocfl-1.json',
  // 2：TBCL のタグの「*」の区別をなくした（「TBCL:1*級」→「TBCL:1級」）
  version: 2,
  updatedAt: '2026-11-10',
  // TBCL の第1級〜第3*級（「*」は同じ級の中で難度が高い語）（TOCFL の準備級〜基礎級の目安。tocfl-guide.mjs）
  levels: TBCL_LEVELS.slice(0, 6),
  meanings: join(here, 'meanings', 'tocfl-1.ja.tsv'),
}

/** 級ごとのタグ：「TOCFL」、TOCFL の級の目安、TBCL の級 */
function tagsFor(entry) {
  const tocfl = TOCFL_GUIDE.levelTags[entry.level]
  return ['TOCFL', tocfl, tbclTag(entry.level)].filter(Boolean)
}

function main() {
  const args = process.argv.slice(2)
  const worklistAt = args.includes('--worklist') ? args[args.indexOf('--worklist') + 1] : null

  if (!existsSync(SOURCES.dict)) {
    console.error(
      `辞書のデータがありません：${SOURCES.dict}\nscripts/packs/README.md の手順で入手してください。`,
    )
    process.exit(1)
  }
  console.log('詞語表を読み込んでいます…')
  const entries = parseTbclRows(readFirstSheet(readFileSync(SOURCES.tbcl))).filter((e) =>
    PACK.levels.includes(e.level),
  )
  console.log('辞書を読み込んでいます…')
  const dictZip = readZip(readFileSync(SOURCES.dict))
  const dictName = [...dictZip.keys()].find((k) => /^dict_revised_.*\d\.xlsx$/.test(k))
  if (!dictName) throw new Error('辞書の zip に本体の xlsx がありません')
  const index = buildReadingIndex(readFirstSheet(dictZip.get(dictName)))

  const meanings = existsSync(PACK.meanings)
    ? parseMeanings(readFileSync(PACK.meanings, 'utf8'))
    : new Map()
  const { words, missing, readingNotes } = buildWords(entries, {
    decide: (hanzi, hints) => decideReading(hanzi, hints, index),
    meanings,
    tagsFor,
  })

  if (worklistAt) {
    const lines = missing.map((m) => `${m.key.replace(':', '\t')}\t\t# ${m.level} ${m.pinyin}`)
    writeFileSync(worklistAt, lines.join('\n') + '\n')
    console.log(`意味が未記入の語：${missing.length} 語 → ${worklistAt}`)
    return
  }
  if (missing.length > 0) {
    console.error(
      `意味が未記入の語が ${missing.length} 語あります（例：${missing[0].key}）。--worklist で一覧を出せます。`,
    )
    process.exit(1)
  }

  const outDir = join(root, 'public', 'packs')
  mkdirSync(outDir, { recursive: true })
  const json = formatPackJson(packFile(words, `${PACK.updatedAt}T00:00:00.000Z`))
  writeFileSync(join(outDir, PACK.file), json)

  const indexPath = join(outDir, 'index.json')
  const current = existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, 'utf8')) : null
  const counts = {}
  for (const w of words) for (const t of w.tags) counts[t] = (counts[t] ?? 0) + 1
  const entry = TOCFL_GUIDE.indexEntry({
    id: PACK.id,
    file: PACK.file,
    version: PACK.version,
    updatedAt: PACK.updatedAt,
    wordCount: words.length,
    size: Buffer.byteLength(json),
    tagCounts: counts,
  })
  writeFileSync(indexPath, JSON.stringify(upsertIndex(current, entry), null, 2) + '\n')

  const reportDir = join(here, 'reports')
  mkdirSync(reportDir, { recursive: true })
  writeFileSync(
    join(reportDir, `${PACK.id}-readings.md`),
    renderReadingReport(PACK.id, readingNotes),
  )

  const unsure = words.filter((w) => w.tags.includes(NEEDS_CHECK_TAG)).length
  console.log(
    `${PACK.file}：${words.length} 語（${NEEDS_CHECK_TAG}：${unsure} 語）、${json.length} 文字`,
  )
}

main()
