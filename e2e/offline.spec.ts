import { expect, test } from '@playwright/test'
import { startConversation, startFlashcard } from './helpers'

// オフラインでの起動と学習（FR-PWA-01、M4 の完了条件）
test.use({ serviceWorkers: 'allow' })

test('一度開いたあとは、オフラインでも起動してサンプル単語で学習できる', async ({
  page,
  context,
}) => {
  await page.goto('./')
  // Service Worker が事前キャッシュを終えて有効になるまで待ち、再読み込みで制御下に入れる
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: '学習モード' })).toBeVisible()

  // サンプル単語はアプリに同梱しているので、オフラインでも追加できる（FR-SMP-03）
  await page.getByRole('button', { name: /サンプル単語を追加/ }).click()
  await expect(page.getByRole('link', { name: /^暗記カード/ })).toBeVisible()

  // 単語データ画面（遅延読み込み）もオフラインで開ける
  await page.getByRole('link', { name: '単語データ' }).click()
  await expect(page.getByRole('heading', { name: '単語データ', level: 1 })).toBeVisible()

  await page.goto('./#/mode/flashcard')
  await startFlashcard(page)
  await page.getByRole('button', { name: /答えを表示/ }).click()
  await expect(page.getByRole('group', { name: '覚え具合の評価' })).toBeVisible()
})

test('オフラインでも、出典とライセンスのライブラリの一覧を開ける（FR-SET-08）', async ({
  page,
  context,
}) => {
  await page.goto('./#/settings')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)

  await context.setOffline(true)
  await page.getByRole('button', { name: '出典とライセンス' }).click()
  await expect(page.getByRole('dialog').getByText('react', { exact: true })).toBeVisible()
})

test('設定画面の「更新を確認」で、最新の版かを確かめられる（FR-SET-15）', async ({
  page,
  context,
}) => {
  await page.goto('./#/settings')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  const button = page.getByRole('button', { name: '更新を確認' })
  await button.click()
  await expect(page.getByRole('status').filter({ hasText: '最新の版です。' })).toBeVisible()
  await expect(
    page.getByText('アプリを開き直したときにも、新しい版があるか確かめます。'),
  ).toBeVisible()

  // オフラインでは押せない
  await context.setOffline(true)
  await expect(button).toBeDisabled()
  await expect(page.getByText('インターネットに接続すると確認できます。')).toBeVisible()
})

test('オフラインでも、場面別会話の場面のデータを読んで学習できる（FR-PLUG-07、仕様書 18.5）', async ({
  page,
  context,
}) => {
  await page.goto('./')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)

  await context.setOffline(true)
  // 場面の一覧・項目・訳は遅延読み込みだが、事前キャッシュに含まれる
  await page.goto('./#/mode/conversation')
  await page.getByRole('radio', { name: 'English' }).check()
  await startConversation(page)
  await page.getByRole('button', { name: '回答例を見る' }).click()
  await expect(page.getByRole('group', { name: '覚え具合の評価' })).toBeVisible()
})
