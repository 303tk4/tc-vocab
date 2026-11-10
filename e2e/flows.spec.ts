import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import { addSampleWords, startFlashcard } from './helpers'

// 主要な流れの E2E テスト（仕様書 13.1）

/** 登録単語数の表示から語数を読む */
async function wordCount(page: Page): Promise<number> {
  const text = await page
    .getByText(/^登録単語数：\d+ 語$/)
    .first()
    .textContent()
  return Number(text?.match(/\d+/)?.[0])
}

/** 単語データ画面の「ファイルを読み込んで単語を追加」でファイルを取り込む（仕様書 9.3） */
async function importFile(page: Page, file: { name: string; mimeType: string; buffer: Buffer }) {
  await page.goto('./#/words')
  await page.getByRole('button', { name: 'ファイルを読み込んで単語を追加', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.locator('input[type="file"]').setInputFiles(file)
  await dialog.getByRole('button', { name: /^取り込む（\d+）$/ }).click()
  await expect(page.getByRole('status').filter({ hasText: '取り込みました' })).toBeVisible()
}

test('最初の案内からサンプル単語を追加すると、ホームから学習を始められる', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByText('登録単語数：0 語')).toBeVisible()
  // 単語が無いあいだは暗記カードを開けない（FR-HOME-03）
  await expect(page.getByRole('link', { name: /^暗記カード/ })).toHaveCount(0)

  await page.getByRole('button', { name: /サンプル単語を追加/ }).click()
  await expect(page.getByRole('heading', { name: '単語を追加して始めましょう' })).toBeHidden()
  expect(await wordCount(page)).toBeGreaterThanOrEqual(40)

  await page.getByRole('link', { name: /^暗記カード/ }).click()
  await startFlashcard(page)
  await page.getByRole('button', { name: /答えを表示/ }).click()
  await page.getByRole('button', { name: /^普通/ }).click()
  await expect(page.getByText(/^2 \/ \d+ 枚$/)).toBeVisible()
  await page.getByRole('button', { name: '中断' }).click()
  await expect(page.getByRole('heading', { name: '結果' })).toBeVisible()
  await page.getByRole('link', { name: 'ホームへ戻る' }).click()
  // 学習した単語は復習待ちに入らない（今日は新規だけ）が、ホームに戻れる
  await expect(page.getByRole('heading', { name: '学習モード' })).toBeVisible()
})

test('JSON に書き出して、別の端末（空のブラウザ）で読み込める（仕様書 9.5）', async ({
  page,
  browser,
}) => {
  await addSampleWords(page)
  const count = await wordCount(page)

  await page.goto('./#/words')
  await page.getByRole('button', { name: 'ファイルに書き出す', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('学習進捗を含める').check()
  const downloadPromise = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'ダウンロード' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/\.json$/)
  const json = await readFile(await download.path(), 'utf8')
  expect(JSON.parse(json).words).toHaveLength(count)

  // 別の端末の代わりに、データが空の新しいブラウザで読み込む
  const other = await browser.newContext()
  const otherPage = await other.newPage()
  await importFile(otherPage, {
    name: download.suggestedFilename(),
    mimeType: 'application/json',
    buffer: Buffer.from(json),
  })
  expect(await wordCount(otherPage)).toBe(count)
  await other.close()
})

test('CSV を読み込み、検索とタグで絞り込める（仕様書 9.2）', async ({ page }) => {
  const csv = [
    'hanzi,zhuyin,pinyin,meaning,tags',
    '捷運,ㄐㄧㄝˊ ㄩㄣˋ,jié yùn,MRT（都市鉄道）,交通;E2E',
    '夜市,ㄧㄝˋ ㄕˋ,yè shì,夜市,E2E',
  ].join('\n')
  await importFile(page, { name: 'words.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })
  await expect(page.getByText('登録単語数：2 語')).toBeVisible()

  await page.getByRole('searchbox', { name: '検索' }).fill('MRT')
  // 単語の行は、選択のチェックボックスの名前で見分ける（「夜市」は意味にも出るため）
  const row = (hanzi: string) => page.getByRole('checkbox', { name: `${hanzi} を選択` })
  await expect(row('捷運')).toBeVisible()
  await expect(row('夜市')).toBeHidden()

  await page.getByRole('searchbox', { name: '検索' }).fill('')
  await page.getByRole('button', { name: '交通', exact: true }).click()
  await expect(row('捷運')).toBeVisible()
  await expect(row('夜市')).toBeHidden()
})

test('単語を1語追加し、編集できる（FR-WORDS-15・16）', async ({ page }) => {
  await page.goto('./#/words')
  await page.getByRole('button', { name: '単語を追加', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel(/^繁体字/).fill('珍珠奶茶')
  await dialog.getByLabel(/^意味/).fill('タピオカミルクティー')
  await dialog.getByRole('button', { name: '保存', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText('登録単語数：1 語')).toBeVisible()

  await page.getByRole('button', { name: '珍珠奶茶 を編集' }).click()
  await dialog.getByLabel(/^意味/).fill('タピオカ入りのミルクティー')
  await dialog.getByRole('button', { name: '保存', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText('タピオカ入りのミルクティー')).toBeVisible()
})

test('配布中の単語集を追加できる（仕様書 16.5）', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('link', { name: /配布中の単語集から選ぶ/ }).click()
  const dialog = page.getByRole('dialog')
  // 日本語の UI では、意味が日本語の単語集が先に並ぶ（16.5「意味の言語」）
  const packs = dialog.getByRole('button', { name: /^選択する（TOCFL/ })
  await expect(packs.first()).toHaveAccessibleName(/^選択する（TOCFL 入門級.*（意味：日本語））$/)
  await packs.first().click()
  await dialog.getByRole('button', { name: /^追加する（\d+）$/ }).click()
  // 1,000 語を超えるため、遅い環境（Windows の WebKit など）では数秒かかる
  await expect(page.getByRole('status').filter({ hasText: '追加しました' })).toBeVisible({
    timeout: 30_000,
  })
  expect(await wordCount(page)).toBeGreaterThan(1000)
})

test('設定は再読み込みのあとも保たれる（仕様書 10.1）', async ({ page }) => {
  await page.goto('./#/settings')
  await page.getByRole('radio', { name: '黒', exact: true }).check()
  await page.getByRole('radio', { name: '特大', exact: true }).check()
  await page.getByRole('radio', { name: 'English', exact: true }).check()
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible()
  const root = page.locator('html')
  await expect(root).toHaveAttribute('lang', 'en')
  await expect(root).toHaveAttribute('data-theme', 'dark')
  await expect(root).toHaveAttribute('data-font-scale', 'xl')
})

test('設定画面で版を確かめ、フィードバックのフォームを開くリンクがある（仕様書 10.3）', async ({
  page,
  context,
}) => {
  const { version } = JSON.parse(await readFile('package.json', 'utf8')) as { version: string }
  await page.goto('./#/settings')
  await expect(page.getByRole('heading', { name: 'このアプリについて' })).toBeVisible()
  await expect(page.getByText(`版：${version}`)).toBeVisible()

  // 新しいタブで開く外部のリンク。フォームのサイトには接続しない
  const link = page.getByRole('link', { name: /^意見を送るフォームを開く/ })
  await expect(link).toHaveAttribute('href', /^https:\/\/docs\.google\.com\/forms\//)
  await expect(link).toHaveAttribute('target', '_blank')
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  await expect(link).toHaveAccessibleName(/^意見を送るフォームを開く ?（新しいタブで開きます）$/)

  // オフラインでは押せない状態になり、戻ると押せる
  await context.setOffline(true)
  await expect(page.getByRole('button', { name: '意見を送るフォームを開く' })).toBeDisabled()
  await expect(page.getByText('インターネットに接続すると開けます。')).toBeVisible()
  await context.setOffline(false)
  await expect(link).toBeVisible()
})
