import { expect, test, type Page } from '@playwright/test'

// 1万語での性能（NFR-01、仕様書 13.1）。Chromium だけで測る（CPU を遅くする機能を使うため）

const WORDS = 10_000
const DAY = 24 * 60 * 60 * 1000

/** 1万語と、その半分の学習進捗を含む JSON（仕様書 9.1）を作る */
function buildLargeJson(): string {
  const now = Date.now()
  const tags = Array.from({ length: 20 }, (_, i) => `タグ${i + 1}`)
  const words = Array.from({ length: WORDS }, (_, i) => {
    // 「一」から始まる漢字を2文字組み合わせて、重ならない単語を作る
    const hanzi =
      String.fromCodePoint(0x4e00 + Math.floor(i / 200)) + String.fromCodePoint(0x5000 + (i % 200))
    return {
      id: `w${i}`,
      hanzi,
      zhuyin: 'ㄘㄜˋ ㄕˋ',
      pinyin: 'cè shì',
      meaning: `試験用の単語 ${i}`,
      examples: [{ text: `這是第${i}個例句。`, translation: `${i} 番目の例文です。` }],
      tags: [tags[i % 20], tags[(i * 7) % 20]].filter((t, j, a) => a.indexOf(t) === j),
    }
  })
  // 半分は学習済み。うち 300 語は今日が復習日
  const progress = words.slice(0, WORDS / 2).map((w, i) => ({
    modeId: 'flashcard',
    wordId: w.id,
    due: i < 300 ? now - DAY : now + ((i % 60) + 1) * DAY,
    state: { reps: 3, interval: 10, ease: 2.5, introducedAt: now - 30 * DAY },
    updatedAt: now - DAY,
  }))
  return JSON.stringify({ format: 'tc-vocab', version: 1, words, progress })
}

async function importLarge(page: Page) {
  await page.goto('./#/words')
  await page.getByRole('button', { name: 'ファイルを読み込んで単語を追加', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.locator('input[type="file"]').setInputFiles({
    name: 'large.json',
    mimeType: 'application/json',
    buffer: Buffer.from(buildLargeJson()),
  })
  await dialog.getByRole('button', { name: `取り込む（${WORDS}）` }).click()
  await expect(page.getByText(`登録単語数：${WORDS} 語`)).toBeVisible({ timeout: 120_000 })
}

type Target = 'list' | 'setup' | 'card'

/**
 * 押してから表示されるまでの時間（ミリ秒）。
 * Playwright の待ち合わせの間隔が混ざらないよう、ページの中で描画のたびに確かめる。
 * list：ヘッダーの「単語データ」を押して、一覧の単語の行が出るまで
 * setup：ホームの「暗記カード」を押して、準備画面で対象の語数が出て「学習を始める」を押せるまで
 * card：「学習を始める」を押して、1枚目のカードが出るまで
 */
async function measure(page: Page, target: Target) {
  return page.evaluate(async (target) => {
    const startButton = () =>
      [...document.querySelectorAll('button')].find((b) => b.textContent === '学習を始める')
    const hasText = (selector: string, pattern: RegExp) =>
      [...document.querySelectorAll(selector)].some((el) => pattern.test(el.textContent ?? ''))
    const steps = {
      list: {
        click: () => document.querySelector<HTMLElement>('header a[href="#/words"]'),
        done: () =>
          !!document.querySelector(
            'input[type="checkbox"][aria-label$="を選択"]:not([aria-label^="表示中"])',
          ),
      },
      setup: {
        click: () => document.querySelector<HTMLElement>('main a[href="#/mode/flashcard"]'),
        done: () => hasText('p', /^対象：\d+ 語$/) && !startButton()?.disabled,
      },
      card: {
        click: () => startButton() ?? null,
        done: () => hasText('p', /^1 \/ \d+ 枚$/),
      },
    }
    const { click, done } = steps[target]
    const element = click()
    if (!element) throw new Error(`押す要素がありません：${target}`)
    const start = performance.now()
    element.click()
    await new Promise<void>((resolve) => {
      const check = () => (done() ? resolve() : requestAnimationFrame(check))
      check()
    })
    return Math.round(performance.now() - start)
  }, target)
}

/** ホームを読み込み直して開く（ハッシュだけの移動では読み込み直さないため、前の計測のメモリ上のデータを持ち越さない） */
async function openHome(page: Page) {
  await page.goto('./')
  await page.reload()
  await expect(page.getByText(`登録単語数：${WORDS} 語`)).toBeVisible()
}

test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium だけで測る')
test.setTimeout(300_000)

test('1万語で、単語一覧の表示と学習の開始が1秒以内（NFR-01）', async ({ page }, testInfo) => {
  await importLarge(page)
  const cdp = await page.context().newCDPSession(page)
  const results: Record<string, number> = {}

  // 開発機の速さそのままと、CPU を4倍遅くした場合（スマホの代わり）で測る。
  // CI は実行環境の速さがばらつくため、そのままの速さだけを測る
  for (const rate of process.env.CI ? [1] : [1, 4]) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate })
    const label = rate === 1 ? 'そのまま' : `CPU ${rate}倍遅く`

    await openHome(page)
    results[`単語一覧（${label}）`] = await measure(page, 'list')

    await openHome(page)
    results[`準備画面（${label}）`] = await measure(page, 'setup')
    results[`学習の開始（${label}）`] = await measure(page, 'card')
    await page.getByRole('button', { name: '中断' }).click()
  }

  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  console.log(results)
  await testInfo.attach('results', { body: JSON.stringify(results, null, 2) })
  for (const [name, ms] of Object.entries(results)) expect(ms, name).toBeLessThanOrEqual(1000)
})
