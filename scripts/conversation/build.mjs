// 場面別会話のデータを作る（仕様書 18.5・18.6）
//
//   node scripts/conversation/build.mjs [--dict <辞書の zip>]
//
// 入力：
//   scenes/*.mjs        場面ごとの下書き（繁体字・訳・補足。SCENES の順に読む）
//   ../packs/sources/dict_revised_2015_20260929.zip
//                       教育部《重編國語辭典修訂本》（リポジトリには入れない。scripts/packs/README.md 参照）
// 出力：
//   src/modes/conversation/data/index.json・phrases.json・locales/<言語>.json
//   scripts/conversation/reports/readings.md（読みの要確認の一覧）
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { buildReadingIndex } from '../packs/lib/reading.mjs'
import { readFirstSheet, readZip } from '../packs/lib/xlsx.mjs'
import { readSentence } from './lib/sentence.mjs'
import { PREFER } from './readings.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')
const OUT = join(root, 'src', 'modes', 'conversation', 'data')

/** 場面の並び（index.json の順。同じ難しさの中はこの順に示す。FR-CONV-09） */
const SCENES = [
  'convenience-store',
  'restaurant',
  'drink-stand',
  'night-market',
  'transport',
  // 上級向け（版 1.37）
  'clinic',
  'device-repair',
  'bulky-waste',
]
/** 用意する訓練の言語（18.6）。言語を足すときは、各場面の下書きに訳を加えてからここに足す */
const LANGUAGES = ['ja', 'en']

function dictPath() {
  const i = process.argv.indexOf('--dict')
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1]
  return join(root, 'scripts', 'packs', 'sources', 'dict_revised_2015_20260929.zip')
}

function loadIndex() {
  const zip = readZip(readFileSync(dictPath()))
  const name = [...zip.keys()].find((k) => /^dict_revised_.*\d\.xlsx$/.test(k))
  if (!name) throw new Error('辞書の xlsx が zip の中にありません')
  return buildReadingIndex(readFirstSheet(zip.get(name)))
}

const json = (data) => `${JSON.stringify(data, null, 2)}\n`

async function main() {
  const index = loadIndex()
  /** @type {Map<string, any>} */
  const phrases = new Map()
  const scenes = []
  const translations = Object.fromEntries(
    LANGUAGES.map((l) => [l, { language: l, scenes: {}, items: {} }]),
  )
  const report = []

  const sentence = (src, where) => {
    const s = typeof src === 'string' ? { text: src } : src
    if (s.zhuyin) {
      // 下書きで読みを指定した文（自動で決められない読み）
      const r = readSentence(s.text, index, PREFER)
      return { text: s.text, zhuyin: s.zhuyin, pinyin: s.pinyin ?? r.pinyin }
    }
    const r = readSentence(s.text, index, PREFER)
    for (const n of r.notes) report.push({ where, sentence: s.text, chosen: r.zhuyin, ...n })
    return { text: s.text, zhuyin: r.zhuyin, pinyin: r.pinyin }
  }

  for (const sceneId of SCENES) {
    const mod = await import(pathToFileURL(join(here, 'scenes', `${sceneId}.mjs`)).href)
    const { scene, phrases: list, uses = [] } = mod.default
    if (scene.id !== sceneId) throw new Error(`${sceneId}: scene.id が違います`)
    const items = []
    for (const p of list) {
      if (phrases.has(p.id)) throw new Error(`項目の ID が重複しています：${p.id}`)
      const phrase = { id: p.id, kind: p.kind }
      if (p.kind === 'respond') phrase.line = sentence(p.line, p.id)
      phrase.answers = p.answers.map((a, i) => sentence(a, `${p.id}.answers[${i}]`))
      phrases.set(p.id, phrase)
      for (const l of LANGUAGES) {
        const tr = p[l]
        if (!tr) throw new Error(`${p.id}: ${l} の訳がありません`)
        translations[l].items[p.id] = tr
      }
      if (!p.notInScene) items.push(p.id)
    }
    items.push(...uses)
    for (const l of LANGUAGES) translations[l].scenes[scene.id] = scene.names[l]
    const entry = {
      id: scene.id,
      version: scene.version,
      name: scene.name,
      level: scene.level,
      languages: LANGUAGES,
      items,
    }
    if (scene.image) entry.image = scene.image
    scenes.push(entry)
  }
  for (const s of scenes) {
    for (const id of s.items) if (!phrases.has(id)) throw new Error(`${s.id}: ${id} がありません`)
  }

  mkdirSync(join(OUT, 'locales'), { recursive: true })
  writeFileSync(join(OUT, 'index.json'), json({ format: 'tc-vocab-scenes', version: 1, scenes }))
  const sorted = [...phrases.values()].sort((a, b) => a.id.localeCompare(b.id))
  writeFileSync(join(OUT, 'phrases.json'), json({ items: sorted }))
  for (const l of LANGUAGES) {
    const tr = translations[l]
    const items = Object.fromEntries(
      Object.keys(tr.items)
        .sort()
        .map((k) => [k, tr.items[k]]),
    )
    writeFileSync(join(OUT, 'locales', `${l}.json`), json({ ...tr, items }))
  }

  mkdirSync(join(here, 'reports'), { recursive: true })
  const lines = [
    '# 場面別会話の読みの要確認',
    '',
    '辞書の候補が複数ある語（多音字など）と、辞書に無い字。`readings.mjs` の PREFER か、下書きの文の `zhuyin` で読みを指定する。',
    '',
    '| 項目 | 文 | 語 | 理由 | 候補 | 使った読み（文全体） |',
    '| --- | --- | --- | --- | --- | --- |',
    ...report.map(
      (r) =>
        `| ${r.where} | ${r.sentence} | ${r.text} | ${r.reason} | ${r.candidates.join(' / ')} | ${r.chosen} |`,
    ),
  ]
  writeFileSync(join(here, 'reports', 'readings.md'), `${lines.join('\n')}\n`)
  console.log(`場面 ${scenes.length}、項目 ${phrases.size}、読みの要確認 ${report.length} 件`)
}

await main()
