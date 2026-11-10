// PWA のアイコン画像を public/favicon.svg から作る（仕様書 12.1）
// 使い方: node scripts/build-icons.mjs（Playwright の Chromium、なければ入っている Chrome で描く）
import { readFileSync, writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const source = readFileSync('public/favicon.svg', 'utf8')
// 角を丸めない正方形（iPhone と maskable は、端末が形を切り抜く）
const square = source.replace(/ rx="\d+"/, '')
// maskable は、字を安全な範囲（中心から半径 40% の円）に収めるため縮める
const maskable = square.replace(
  /(<path [^>]*\/>)/,
  '<g transform="translate(32 32) scale(0.75) translate(-32 -32)">$1</g>',
)

const outputs = [
  { file: 'public/icons/icon-192.png', size: 192, svg: source },
  { file: 'public/icons/icon-512.png', size: 512, svg: source },
  { file: 'public/icons/maskable-512.png', size: 512, svg: maskable },
  { file: 'public/icons/apple-touch-icon.png', size: 180, svg: square },
]

const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }))
const page = await browser.newPage()
for (const { file, size, svg } of outputs) {
  await page.setViewportSize({ width: size, height: size })
  const sized = svg.replace('<svg ', `<svg width="${size}" height="${size}" `)
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block}</style>${sized}`,
  )
  writeFileSync(file, await page.screenshot({ omitBackground: true }))
  console.log(file)
}
await browser.close()
