// TOCFL 対応の単語パッケージを作る（仕様書 16.5「TOCFL・HSK の単語集の作り方」）
//
//   node scripts/packs/build-tocfl.mjs                        … 意味の表があるパッケージをすべて public/packs/ に出力する
//   node scripts/packs/build-tocfl.mjs --pack tocfl-2         … 指定したパッケージだけ出力する（複数指定できる）
//   node scripts/packs/build-tocfl.mjs --pack tocfl-2 --worklist F
//                                                             … 意味が未記入の語の一覧を F に書き出す（下書き用）
//   node scripts/packs/build-tocfl.mjs --pack tocfl-2 --readings-only
//                                                             … 読みの確認リストだけ出力する（意味の下書き前の確認用）
//
// 入力：
//   sources/tbcl-14452-202504.xlsx            國家教育研究院「三等七級詞語表」
//   sources/dict_revised_2015_20260929.zip    教育部《重編國語辭典修訂本》（リポジトリには入れない。README 参照）
//   meanings/<id>.ja.tsv                      日本語の意味（AI による下書き）
// 出力：
//   public/packs/<id>.json、public/packs/index.json、scripts/packs/reports/<id>-readings.md
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildWords, NEEDS_CHECK_TAG, packFile, parseMeanings, tbclTag } from './lib/pack.mjs'
import { buildReadingIndex, decideReading } from './lib/reading.mjs'
import { parseTbclRows } from './lib/tbcl.mjs'
import { readFirstSheet, readZip } from './lib/xlsx.mjs'
import { formatPackJson, renderReadingReport, upsertIndex } from './lib/output.mjs'
import { TOCFL_GUIDE } from './tocfl-guide.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')
const SOURCES = {
  tbcl: join(here, 'sources', 'tbcl-14452-202504.xlsx'),
  dict: join(here, 'sources', 'dict_revised_2015_20260929.zip'),
}

/**
 * 単語集の区分（TBCL の級）と、意味の言語ごとの版。内容を変えたら version を上げ、updatedAt を直す
 * （仕様書 16.5「更新」）。名前・説明・級の対応表の範囲は tocfl-guide.mjs の PACK_TEXT にある。
 * 意味の言語ごとに別の単語集とする（仕様書 16.5「意味の言語」）。ID は日本語版が `tocfl-1`、
 * ほかの言語は `tocfl-1-en` のように言語を付ける。語・読み・タグは言語によらず同じ。
 */
const BASES = [
  {
    id: 'tocfl-1',
    // TBCL の第1級〜第3*級（「*」は同じ級の中で難度が高い語）
    levels: ['第1級', '第1*級', '第2級', '第2*級', '第3級', '第3*級'],
    versions: {
      // ja 2：TBCL のタグの「*」の区別をなくした（「TBCL:1*級」→「TBCL:1級」）
      // ja 3：詞語表の注音の音節の区切りを補い、停車場に「要確認:読み」を付けた
      ja: { version: 3, updatedAt: '2026-11-10' },
      en: { version: 1, updatedAt: '2026-11-10' },
    },
  },
  { id: 'tocfl-2', levels: ['第4級', '第4*級'] },
  { id: 'tocfl-3', levels: ['第5級'] },
  { id: 'tocfl-4', levels: ['第6級'] },
  { id: 'tocfl-5', levels: ['第7級'] },
]
/** 意味の言語（一覧ではこの順に並べる） */
const LANGS = ['ja', 'en']
const PACKS = LANGS.flatMap((lang) =>
  BASES.map((b) => {
    const id = lang === 'ja' ? b.id : `${b.id}-${lang}`
    const v = b.versions?.[lang] ?? { version: 1, updatedAt: '2026-11-10' }
    return {
      id,
      base: b.id,
      lang,
      levels: b.levels,
      ...v,
      file: `${id}.json`,
      meanings: join(here, 'meanings', `${b.id}.${lang}.tsv`),
      // 下書きの手がかりにする日本語の意味
      hintMeanings: join(here, 'meanings', `${b.id}.ja.tsv`),
    }
  }),
)

/**
 * 辞書と詞語表からは読みを決められない語の読み（繁体字 → 注音）。指定した読みは確定とみなす。
 * 有助於：詞語表の見出しは「有助（於）」で、「於」の読みがない。辞書の「於」の先頭の読み ㄨ は感嘆詞
 */
const READING_FIXES = { 有助於: 'ㄧㄡˇ ㄓㄨˋ ㄩˊ' }

/** 級ごとのタグ：「TOCFL」、TOCFL の級の目安、TBCL の級 */
function tagsFor(entry) {
  const tocfl = TOCFL_GUIDE.levelTags[entry.level]
  return ['TOCFL', tocfl, tbclTag(entry.level)].filter(Boolean)
}

/** --name value の形の引数をすべて集める */
function optionValues(args, name) {
  return args.flatMap((a, i) => (a === name && args[i + 1] ? [args[i + 1]] : []))
}

function buildPack(pack, { allEntries, index, worklistAt, readingsOnly }) {
  const entries = allEntries.filter((e) => pack.levels.includes(e.level))
  const meanings = existsSync(pack.meanings)
    ? parseMeanings(readFileSync(pack.meanings, 'utf8'))
    : new Map()
  const { words, missing, readingNotes } = buildWords(entries, {
    decide: (hanzi, hints) =>
      READING_FIXES[hanzi]
        ? { zhuyin: READING_FIXES[hanzi], sure: true, reason: 'fixed', hint: hints.join(' / ') }
        : decideReading(hanzi, hints, index),
    meanings,
    tagsFor,
  })
  const unsure = words.filter((w) => w.tags.includes(NEEDS_CHECK_TAG)).length

  const reportDir = join(here, 'reports')
  mkdirSync(reportDir, { recursive: true })
  // 読みは意味の言語によらないので、確認リストは区分ごとに1つ
  writeFileSync(
    join(reportDir, `${pack.base}-readings.md`),
    renderReadingReport(pack.base, readingNotes),
  )
  if (readingsOnly) {
    console.log(
      `${pack.id}：${words.length} 語（${NEEDS_CHECK_TAG}：${unsure} 語）。読みの確認リストだけ出力した`,
    )
    return true
  }

  if (worklistAt) {
    // 日本語版の意味があれば、下書きの手がかりとして添える
    const hints =
      pack.lang !== 'ja' && existsSync(pack.hintMeanings)
        ? parseMeanings(readFileSync(pack.hintMeanings, 'utf8'))
        : new Map()
    const lines = missing.map(
      (m) =>
        `${m.key.replace(':', '\t')}\t\t# ${m.level} ${m.pinyin}${hints.has(m.key) ? ` ｜ ${hints.get(m.key)}` : ''}`,
    )
    writeFileSync(worklistAt, lines.join('\n') + '\n')
    console.log(`${pack.id}：意味が未記入の語 ${missing.length} 語 → ${worklistAt}`)
    return true
  }
  if (missing.length > 0) {
    console.error(
      `${pack.id}：意味が未記入の語が ${missing.length} 語あります（例：${missing[0].key}）。--worklist で一覧を出せます。`,
    )
    return false
  }

  const outDir = join(root, 'public', 'packs')
  mkdirSync(outDir, { recursive: true })
  const json = formatPackJson(packFile(words, `${pack.updatedAt}T00:00:00.000Z`))
  writeFileSync(join(outDir, pack.file), json)

  const indexPath = join(outDir, 'index.json')
  const current = existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, 'utf8')) : null
  const counts = {}
  for (const w of words) for (const t of w.tags) counts[t] = (counts[t] ?? 0) + 1
  const entry = TOCFL_GUIDE.indexEntry({
    id: pack.id,
    base: pack.base,
    lang: pack.lang,
    file: pack.file,
    version: pack.version,
    updatedAt: pack.updatedAt,
    wordCount: words.length,
    size: Buffer.byteLength(json),
    tagCounts: counts,
  })
  // 一覧の並びはパッケージの定義の順にそろえる
  const next = upsertIndex(current, entry)
  const order = PACKS.map((p) => p.id)
  next.packs.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
  writeFileSync(indexPath, JSON.stringify(next, null, 2) + '\n')

  console.log(
    `${pack.file}：${words.length} 語（${NEEDS_CHECK_TAG}：${unsure} 語）、${json.length} 文字`,
  )
  return true
}

function main() {
  const args = process.argv.slice(2)
  const worklistAt = optionValues(args, '--worklist')[0] ?? null
  const readingsOnly = args.includes('--readings-only')
  const wanted = optionValues(args, '--pack')
  const unknown = wanted.filter((id) => !PACKS.some((p) => p.id === id))
  if (unknown.length > 0) {
    console.error(`知らないパッケージです：${unknown.join(', ')}`)
    process.exit(1)
  }
  if (worklistAt && wanted.length !== 1) {
    console.error('--worklist には --pack で1つのパッケージを指定してください')
    process.exit(1)
  }
  // 指定がなければ、意味の表があるパッケージをすべて作る
  const targets =
    wanted.length > 0
      ? PACKS.filter((p) => wanted.includes(p.id))
      : PACKS.filter((p) => readingsOnly || existsSync(p.meanings))

  if (!existsSync(SOURCES.dict)) {
    console.error(
      `辞書のデータがありません：${SOURCES.dict}\nscripts/packs/README.md の手順で入手してください。`,
    )
    process.exit(1)
  }
  console.log('詞語表を読み込んでいます…')
  const allEntries = parseTbclRows(readFirstSheet(readFileSync(SOURCES.tbcl)))
  console.log('辞書を読み込んでいます…')
  const dictZip = readZip(readFileSync(SOURCES.dict))
  const dictName = [...dictZip.keys()].find((k) => /^dict_revised_.*\d\.xlsx$/.test(k))
  if (!dictName) throw new Error('辞書の zip に本体の xlsx がありません')
  const index = buildReadingIndex(readFirstSheet(dictZip.get(dictName)))

  let ok = true
  for (const pack of targets) {
    ok = buildPack(pack, { allEntries, index, worklistAt, readingsOnly }) && ok
  }
  if (!ok) process.exit(1)
}

main()
