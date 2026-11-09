// 初回表示に必要な JS の gzip 後の大きさを確かめる（NFR-02、仕様書 13.1）
// `npm run build` のあとに `npm run size` で実行する。200KB を超えたら失敗する
import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

const LIMIT_KB = 200
const html = readFileSync('dist/index.html', 'utf8')
// index.html が読み込む JS（script と modulepreload）
const files = [...html.matchAll(/(?:src|href)="\/tc-vocab\/(assets\/[^"]+\.js)"/g)].map((m) => m[1])
if (files.length === 0) {
  console.error('dist/index.html から JS が見つかりません。先に npm run build を実行してください。')
  process.exit(1)
}

let total = 0
for (const file of files) {
  const size = gzipSync(readFileSync(`dist/${file}`)).length
  total += size
  console.log(`${file}  ${(size / 1024).toFixed(1)} KB`)
}
const totalKb = total / 1024
console.log(`合計（gzip 後）  ${totalKb.toFixed(1)} KB / 上限 ${LIMIT_KB} KB`)
if (totalKb > LIMIT_KB) {
  console.error(
    '初回表示の JS が上限を超えています（NFR-02）。React.lazy や動的 import() で遅らせてください。',
  )
  process.exit(1)
}
