import { expect, test } from '@playwright/test'
import { addSampleWords, walkFocus } from './helpers'

// キーボードだけでの操作とフォーカスの見え方、押せる大きさ（NFR-03、CLAUDE.md の 44px）

// Safari は初期設定では Tab がリンクに止まらず、スマホにはキーボードも無いため、PC のブラウザだけで確かめる
test.skip(({ isMobile }) => isMobile, 'キーボード操作は PC のブラウザで確かめる')

const screens = [
  { path: './', title: /^學中文 \| tc-vocab$/ },
  { path: './#/words', title: /^単語データ \| 學中文$/ },
  { path: './#/settings', title: /^設定 \| 學中文$/ },
  { path: './#/mode/flashcard', title: /^暗記カード \| 學中文$/ },
]

for (const width of [375, 1280]) {
  test(`Tab で止まる要素は枠が見え、44px 以上ある（幅 ${width}px）`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await addSampleWords(page)
    for (const screen of screens) {
      await page.goto(screen.path)
      // 画面ごとにタブの題名が変わる（WCAG 2.4.2）
      await expect(page).toHaveTitle(screen.title)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const stops = await walkFocus(page)
      expect(stops.length).toBeGreaterThan(3)
      for (const stop of stops) {
        const where = `${screen.path} ${stop.tag} ${stop.name}`
        expect(stop.outline, where).not.toMatch(/^none/)
        expect(stop.width, where).toBeGreaterThanOrEqual(44)
        expect(stop.height, where).toBeGreaterThanOrEqual(44)
      }
    }
  })
}

test('キーボードだけで暗記カードを1回学習できる', async ({ page }) => {
  await addSampleWords(page)
  await page.goto('./')

  // ホームのモードのカードまで Tab で進んで開く
  const card = page.getByRole('link', { name: /^暗記カード/ })
  for (let i = 0; i < 10 && !(await card.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press('Tab')
  }
  await expect(card).toBeFocused()
  await page.keyboard.press('Enter')

  // 準備画面が出そろい、対象の語数が決まってから始める
  await expect(page.getByText(/^対象：\d+ 語$/)).toBeVisible()
  await expect(page.getByRole('group', { name: '出題の向き' })).toBeVisible()
  const start = page.getByRole('button', { name: '学習を始める' })
  await expect(start).toBeEnabled()
  await start.focus()
  await page.keyboard.press('Enter')

  // Space でめくり、数字キーで評価する（FR-FC-20 など）
  const total = Number(
    (await page.getByText(/^1 \/ \d+ 枚$/).textContent())?.match(/\/ (\d+)/)?.[1],
  )
  expect(total).toBeGreaterThan(0)
  const rounds = Math.min(total - 1, 3)
  for (let i = 1; i <= rounds; i++) {
    await expect(page.getByText(new RegExp(`^${i} / ${total} 枚$`))).toBeVisible()
    await page.keyboard.press('Space')
    await expect(page.getByRole('group', { name: '覚え具合の評価' })).toBeVisible()
    await page.keyboard.press('4')
  }
  // 評価の保存中は Esc を受け付けないため、次のカードに進んでから中断する
  await expect(page.getByText(new RegExp(`^${rounds + 1} / ${total} 枚$`))).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { name: '結果' })).toBeVisible()
})

test('ダイアログを閉じるとフォーカスが開いたボタンに戻る', async ({ page }) => {
  await addSampleWords(page)
  await page.goto('./#/words')
  const opener = page.getByRole('button', { name: 'ファイルに書き出す', exact: true })
  await opener.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(opener).toBeFocused()
})
