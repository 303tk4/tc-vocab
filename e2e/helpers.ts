import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

/** ホームの最初の案内からサンプル単語を追加する（FR-SMP-03） */
export async function addSampleWords(page: Page) {
  await page.goto('./')
  await page.getByRole('button', { name: /サンプル単語を追加/ }).click()
  await expect(page.getByText(/登録単語数：\d+ 語/)).not.toHaveText('登録単語数：0 語')
}

/** WCAG 2.1 AA の自動検査（NFR-03・04）。違反があれば内容を示して失敗する */
export async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  const summary = results.violations.map((v) => ({
    id: v.id,
    help: v.help,
    targets: v.nodes.map((n) => n.target.join(' ')),
  }))
  expect(summary).toEqual([])
}

export interface FocusStop {
  tag: string
  name: string
  width: number
  height: number
  outline: string
}

/**
 * Tab キーでフォーカスを順に移し、止まった要素を記録する（NFR-03）。
 * 同じ要素に戻ってきたら（一周したら）終える
 */
export async function walkFocus(page: Page, max = 200): Promise<FocusStop[]> {
  const stops: FocusStop[] = []
  const seen = new Set<string>()
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab')
    const stop = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      if (!el || el === document.body) return null
      if (!el.dataset.walkId) el.dataset.walkId = String(Math.random())
      // チェックボックスなどは、押せる範囲を囲む label の大きさで見る
      const target = el.closest('label') ?? el
      const rect = target.getBoundingClientRect()
      const style = getComputedStyle(el)
      return {
        id: el.dataset.walkId,
        tag:
          el.tagName.toLowerCase() +
          (el.getAttribute('type') ? `[${el.getAttribute('type')}]` : ''),
        name: (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        outline: `${style.outlineStyle} ${style.outlineWidth}`,
      }
    })
    if (!stop) continue
    if (seen.has(stop.id)) break
    seen.add(stop.id)
    const { id: _id, ...rest } = stop
    void _id
    stops.push(rest)
  }
  return stops
}

/**
 * 暗記カードの準備画面から学習を始め、1枚目のカードが出るまで待つ。
 * 準備画面の部品は遅延読み込みで後から出て配置がずれるため、出そろってから押す
 */
export async function startFlashcard(page: Page) {
  await expect(page.getByText(/^対象：\d+ 語$/)).toBeVisible()
  await expect(page.getByRole('group', { name: '出題の向き' })).toBeVisible()
  await page.getByRole('button', { name: '学習を始める' }).click()
  await expect(page.getByText(/^1 \/ \d+ 枚$/)).toBeVisible()
}

/**
 * 場面別会話の準備画面から学習を始め、1問目が出るまで待つ（仕様書 18章）。
 * 準備画面の部品は遅延読み込みで後から出るため、出そろってから押す
 */
export async function startConversation(page: Page) {
  await expect(page.getByText(/^対象：\d+ 項目$/)).toBeVisible()
  await expect(page.getByRole('group', { name: '出題の種類' })).toBeVisible()
  await page.getByRole('button', { name: '学習を始める' }).click()
  await expect(page.getByText(/^1 \/ \d+ 問$/)).toBeVisible()
}
