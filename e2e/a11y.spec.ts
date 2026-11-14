import { expect, test } from '@playwright/test'
import {
  addSampleWords,
  expectNoA11yViolations,
  startConversation,
  startFlashcard,
} from './helpers'

// 全画面の自動のアクセシビリティ検査（NFR-03・04、仕様書 13.1）

test('ホーム（単語が無いとき）', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: '単語を追加して始めましょう' })).toBeVisible()
  await expectNoA11yViolations(page)
  // 画面上部のバーの文字の大きさのメニュー（FR-NAV-02）
  await page.getByRole('button', { name: '文字の大きさ' }).click()
  await expect(page.getByRole('radio', { name: '中', exact: true })).toBeVisible()
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

    // 出典とライセンスのダイアログ（FR-SET-08）
    await page.getByRole('button', { name: '出典とライセンス' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('react', { exact: true })).toBeVisible()
    await dialog.getByText('react', { exact: true }).click()
    await expectNoA11yViolations(page)
    await dialog.getByRole('button', { name: '閉じる' }).click()

    // 初期化の確認（FR-SET-13）
    await page.getByRole('button', { name: 'アプリを初期状態に戻す' }).click()
    await expect(page.getByRole('dialog', { name: 'アプリを初期状態に戻しますか？' })).toBeVisible()
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
    // 評価ボタンの下に、選ぶと次へ進むことを示す。タッチの環境ではスワイプも案内する（8.4、版 1.50）
    const touch = await page.evaluate(() => matchMedia('(pointer: coarse)').matches)
    await expect(
      page.getByText(
        touch
          ? '単語をスワイプ（← もう一度・普通 →）、もしくは評価をどれか押すと、次の問題に進みます'
          : 'いずれかを選ぶと、次の問題に進みます',
      ),
    ).toBeVisible()
    await expectNoA11yViolations(page)

    // 1枚評価してから中断すると結果画面に移る（FR-FC-32）
    await page.keyboard.press('3')
    await expect(page.getByText(/2 \/ \d+ 枚/).first()).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('heading', { name: '結果' })).toBeVisible()
    await expectNoA11yViolations(page)
  })
})

test('場面別会話（準備・表・裏・結果。単語が無くても開ける）', async ({ page }) => {
  await page.goto('./#/mode/conversation')
  await expect(page.getByRole('button', { name: '学習を始める' })).toBeVisible()
  await expect(page.getByText(/^対象：\d+ 項目$/)).toBeVisible()
  await expectNoA11yViolations(page)
  // 「学習を始める」の下の表示の設定を開いた状態（FR-PLUG-10）
  await page.getByText('表示の設定').click()
  await expect(page.getByRole('checkbox', { name: '注音を表示' })).toBeVisible()
  await expectNoA11yViolations(page)

  await startConversation(page)
  await expectNoA11yViolations(page)

  await page.getByRole('button', { name: '回答例を見る' }).click()
  await expect(page.getByRole('group', { name: '覚え具合の評価' })).toBeVisible()
  // 評価ボタンの下に、選ぶと次へ進むことを示す（8.4・FR-CONV-20）
  await expect(page.getByText('いずれかを選ぶと、次の問題に進みます')).toBeVisible()
  await expectNoA11yViolations(page)

  // 1問評価してから中断すると結果画面に移る（FR-CONV-20・FR-FC-32）
  await page.keyboard.press('3')
  await expect(page.getByText(/^2 \/ \d+ 問$/)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { name: '結果' })).toBeVisible()
  await expectNoA11yViolations(page)
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
  // 場面別会話の準備画面と裏面（仕様書 18章）
  await page.goto('./#/mode/conversation')
  await startConversation(page)
  await page.getByRole('button', { name: '回答例を見る' }).click()
  await expect(page.getByRole('group', { name: '覚え具合の評価' })).toBeVisible()
  await expectNoA11yViolations(page)
})
