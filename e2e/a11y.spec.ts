import { expect, test } from '@playwright/test'
import { addSampleWords, expectNoA11yViolations, startFlashcard } from './helpers'

// 全画面の自動のアクセシビリティ検査（NFR-03・04、仕様書 13.1）

test('ホーム（単語が無いとき）', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: '単語を追加して始めましょう' })).toBeVisible()
  await expectNoA11yViolations(page)
})

test.describe('単語があるとき', () => {
  test.beforeEach(async ({ page }) => {
    await addSampleWords(page)
  })

  test('ホーム', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '単語を増やすには' })).toBeVisible()
    await expectNoA11yViolations(page)
  })

  test('単語データと各ダイアログ', async ({ page }) => {
    await page.goto('./#/words')
    await expect(page.getByRole('heading', { name: '単語データ', level: 1 })).toBeVisible()
    await expectNoA11yViolations(page)

    const dialogs = [
      '単語を追加',
      'ファイルを読み込んで単語を追加',
      '単語集を読み込む',
      'ファイルに書き出す',
      'タグの管理',
    ]
    for (const name of dialogs) {
      await page.getByRole('button', { name, exact: true }).click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      await expectNoA11yViolations(page)
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
    }
  })

  test('設定', async ({ page }) => {
    await page.goto('./#/settings')
    await expect(page.getByRole('heading', { name: '設定', level: 1 })).toBeVisible()
    await expectNoA11yViolations(page)
  })

  test('暗記カード（準備・表・裏・結果）', async ({ page }) => {
    await page.goto('./#/mode/flashcard')
    await expect(page.getByRole('button', { name: '学習を始める' })).toBeVisible()
    await expectNoA11yViolations(page)

    await startFlashcard(page)
    await expectNoA11yViolations(page)

    await page.getByRole('button', { name: /答えを表示/ }).click()
    await expect(page.getByRole('group', { name: '覚え具合の評価' })).toBeVisible()
    await expectNoA11yViolations(page)

    // 1枚評価してから中断すると結果画面に移る（FR-FC-32）
    await page.keyboard.press('3')
    await expect(page.getByText(/2 \/ \d+ 枚/).first()).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('heading', { name: '結果' })).toBeVisible()
    await expectNoA11yViolations(page)
  })
})

test('黒の背景（機器の設定に従う）でも違反がない', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await addSampleWords(page)
  await expectNoA11yViolations(page)
  await page.goto('./#/words')
  await expect(page.getByRole('heading', { name: '単語データ', level: 1 })).toBeVisible()
  await expectNoA11yViolations(page)
  await page.goto('./#/mode/flashcard')
  await startFlashcard(page)
  await page.getByRole('button', { name: /答えを表示/ }).click()
  await expect(page.getByRole('group', { name: '覚え具合の評価' })).toBeVisible()
  await expectNoA11yViolations(page)
})
