import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import { addSampleWords, startConversation, startFlashcard } from './helpers'

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

test('準備画面の「一回の出題数」で、1回の学習の枚数を変えられる（FR-PLUG-08、仕様書 8.1）', async ({
  page,
}) => {
  await addSampleWords(page)
  await page.goto('./#/mode/flashcard')
  const size = page.getByLabel('一回の出題数')
  // 「学習を始める」の下にあり、初期値は 20 枚
  await expect(size).toHaveValue('20')
  const start = await page.getByRole('button', { name: '学習を始める' }).boundingBox()
  const field = await size.boundingBox()
  expect(field!.y).toBeGreaterThan(start!.y)

  await size.fill('0')
  await expect(page.getByText('1〜200 の整数を入力してください。')).toBeVisible()
  await expect(page.getByRole('button', { name: '学習を始める' })).toBeDisabled()

  await size.fill('3')
  await startFlashcard(page)
  await expect(page.getByText('1 / 3 枚')).toBeVisible()

  // 次に開いたときも同じ値を使い、設定画面には置かない
  // 1枚も評価せずに中断するとホームへ戻る（FR-FC-32）。戻り終えてから開き直す
  await page.getByRole('button', { name: '中断' }).click()
  await expect(page.getByRole('heading', { name: '学習モード' })).toBeVisible()
  await page.goto('./#/mode/flashcard')
  await expect(page.getByLabel('一回の出題数')).toHaveValue('3')
  await page.goto('./#/settings')
  await expect(page.getByRole('heading', { name: '学習モードの設定' })).toBeVisible()
  await expect(page.getByLabel('一回の出題数')).toHaveCount(0)
})

test('単語が0件でも場面別会話を始められ、訓練の言語は画面の言語とは別に選べる（仕様書 18章）', async ({
  page,
}) => {
  await page.goto('./')
  await expect(page.getByText('登録単語数：0 語')).toBeVisible()
  // 単語を使わないモードは、単語が無くても開ける（FR-HOME-03・FR-PLUG-07）
  await page.getByRole('link', { name: /^場面別会話ドリル/ }).click()

  // 訓練の言語を English にし、コンビニの「言いたいことを伝える」だけを選ぶ（FR-CONV-01・05）
  await page.getByRole('radio', { name: 'English' }).check()
  await expect(page.getByText('Convenience store')).toBeVisible()
  await page.getByRole('checkbox', { name: /便利商店/ }).check()
  await page.getByRole('radio', { name: '言いたいことを伝える' }).check()
  await startConversation(page)

  // 問題文は訓練の言語（英語）、ボタンは画面の言語（日本語）で示す（18.2）
  await expect(page.getByText('Say it in Chinese')).toHaveCount(0)
  await expect(page.getByText('中国語で言ってみましょう')).toBeVisible()
  await expect(page.getByText("You want to say you don't need a bag.")).toBeVisible()
  await page.getByRole('button', { name: '回答例を見る' }).click()
  await expect(page.getByText('不用袋子，謝謝。')).toBeVisible()
  await page.getByRole('button', { name: /^普通/ }).click()
  await expect(page.getByText(/^2 \/ \d+ 問$/)).toBeVisible()
  await page.getByRole('button', { name: '中断' }).click()
  await expect(page.getByRole('heading', { name: '結果' })).toBeVisible()

  // 選んだ条件は次回の初期値になる（FR-MODE-02・FR-CONV-05）
  await page.reload()
  await page.goto('./#/mode/conversation')
  await expect(page.getByRole('radio', { name: 'English' })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: /便利商店/ })).toBeChecked()
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
  await expect(packs.first()).toHaveAccessibleName(
    /^選択する（TOCFL 入門級.*（単語の意味の表記：日本語））$/,
  )
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
  await expect(page.getByText('インターネットに接続すると開けます。').first()).toBeVisible()
  await context.setOffline(false)
  await expect(link).toBeVisible()
})

test('設定画面で著作権・出典とライセンス・免責・データの扱いを確かめられる（仕様書 10.3、FR-SET-07〜10）', async ({
  page,
}) => {
  await page.goto('./#/settings')
  await expect(page.getByText('© 2026 303tk4')).toBeVisible()
  const repo = page.getByRole('link', { name: /^ソースコードとライセンス（GitHub）/ })
  await expect(repo).toHaveAttribute('href', 'https://github.com/303tk4/tc-vocab')
  await expect(repo).toHaveAttribute('target', '_blank')
  await expect(page.getByRole('heading', { name: '免責' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'データの扱い' })).toBeVisible()

  await page.getByRole('button', { name: '出典とライセンス' }).click()
  const dialog = page.getByRole('dialog', { name: '出典とライセンス' })
  await expect(dialog.getByText('教育部《重編國語辭典修訂本》', { exact: false })).toBeVisible()
  await expect(dialog.getByText('react', { exact: true })).toBeVisible()
  // 名前を押すと、そのライブラリのライセンスの全文が開く
  const react = dialog
    .getByRole('listitem')
    .filter({ has: page.getByText('react', { exact: true }) })
  await react.getByText('react', { exact: true }).click()
  await expect(react.getByText(/Permission is hereby granted/)).toBeVisible()
  await dialog.getByRole('button', { name: '閉じる' }).click()
  await expect(dialog).toBeHidden()
})

test('バックアップを保存して初期化し、そのファイルから復元できる（仕様書 10.4、FR-SET-11〜13）', async ({
  page,
}) => {
  // 共有の機能がある端末として扱い、保存方法を選ぶダイアログを出す。
  // 保存先を選ぶ画面（showSaveFilePicker）はテストから操作できないため、ダウンロードとして保存させる
  await page.addInitScript(() => {
    delete (window as { showSaveFilePicker?: unknown }).showSaveFilePicker
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true })
  })
  // 単語を追加して1枚学習し、背景の色を変えておく
  await addSampleWords(page)
  const count = await wordCount(page)
  await page.getByRole('link', { name: /^暗記カード/ }).click()
  await startFlashcard(page)
  await page.getByRole('button', { name: /答えを表示/ }).click()
  await page.getByRole('button', { name: /^普通/ }).click()
  await page.getByRole('button', { name: '中断' }).click()
  await expect(page.getByRole('heading', { name: '結果' })).toBeVisible()
  await page.goto('./#/settings')
  await page.getByRole('radio', { name: '黒', exact: true }).check()

  // バックアップファイルを作成する（版 1.34・1.38）。スマートフォン（mobile-webkit）では保存方法を選び、
  // パソコン（chromium）では共有を選ばせずにすぐ保存する
  await expect(page.getByText('まだバックアップを保存していません。')).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'バックアップファイルを作成する', exact: true }).click()
  const choose = page.getByRole('dialog', {
    name: 'バックアップファイルの保存方法を選んでください',
  })
  if (test.info().project.name === 'mobile-webkit') {
    await expect(choose.getByRole('button', { name: /^ほかのアプリと共有/ })).toBeVisible()
    await choose.getByRole('button', { name: 'ファイルとして保存' }).click()
  } else {
    await expect(choose).toBeHidden()
  }
  const download = await downloadPromise
  await expect(page.getByText('バックアップファイルを作成しました。')).toBeVisible()
  expect(download.suggestedFilename()).toMatch(/^tc-vocab-backup-\d{8}-\d{4}\.json$/)
  const json = await readFile(await download.path(), 'utf8')
  const data = JSON.parse(json) as {
    backup: boolean
    words: unknown[]
    progress: unknown[]
    sessions: unknown[]
    settings: { key: string; value: unknown }[]
  }
  expect(data.backup).toBe(true)
  expect(data.words).toHaveLength(count)
  expect(data.progress.length).toBeGreaterThan(0)
  expect(data.sessions.length).toBeGreaterThan(0)
  expect(data.settings).toContainEqual({ key: 'app.theme', value: 'dark' })
  await expect(page.getByText(/^前回のバックアップ：/)).toBeVisible()

  // 初期化する。確認では「キャンセル」が初めに選ばれている
  await page.getByRole('button', { name: 'アプリを初期状態に戻す' }).click()
  const reset = page.getByRole('dialog', { name: 'アプリを初期状態に戻しますか？' })
  await expect(reset.getByText(`単語 ${count} 語と、`, { exact: false })).toBeVisible()
  await expect(reset.getByRole('button', { name: 'キャンセル' })).toBeFocused()
  await reset.getByRole('button', { name: '初期状態に戻す', exact: true }).click()
  await expect(page.getByText('登録単語数：0 語')).toBeVisible()
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark')

  // 単語のファイルはバックアップとして選べない
  await page.goto('./#/settings')
  const input = page.getByTestId('backup-file')
  await input.setInputFiles({
    name: 'words.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ format: 'tc-vocab', version: 1, words: [] })),
  })
  await expect(page.getByRole('alert')).toContainText('バックアップではありません')

  // 保存したファイルから復元する
  await input.setInputFiles({
    name: download.suggestedFilename(),
    mimeType: 'application/json',
    buffer: Buffer.from(json),
  })
  const restore = page.getByRole('dialog', { name: 'バックアップから復元しますか？' })
  await expect(
    restore.getByText(`ファイルの内容：単語 ${count} 語`, { exact: false }),
  ).toBeVisible()
  await expect(restore.getByText('今のデータ：単語 0 語', { exact: false })).toBeVisible()
  await restore.getByRole('button', { name: '復元する' }).click()
  await expect(page.getByText(`登録単語数：${count} 語`)).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.goto('./#/settings')
  await expect(page.getByText(/^前回のバックアップ：/)).toBeVisible()
})

test('保護されていない環境では、初めて単語を追加したときに1回だけ知らせる（FR-PWA-06）', async ({
  page,
}) => {
  await page.goto('./')
  // 自動削除から保護されていない環境にする
  await page.evaluate(() => {
    Object.defineProperty(navigator.storage, 'persisted', { value: () => Promise.resolve(false) })
    Object.defineProperty(navigator.storage, 'persist', { value: () => Promise.resolve(false) })
  })
  await page.getByRole('button', { name: /サンプル単語を追加/ }).click()
  const notice = page
    .getByRole('status')
    .filter({ hasText: 'データはこの端末のブラウザの中にあります' })
  await expect(notice).toBeVisible()
  await notice.getByRole('button', { name: '詳しく' }).click()
  await expect(page.getByRole('heading', { name: '設定', level: 1 })).toBeVisible()
  await expect(notice).toBeHidden()

  // 一度示したら、また単語を追加しても示さない
  await page.goto('./#/words')
  await page.getByRole('button', { name: '単語を追加', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel(/^繁体字/).fill('烏龍茶')
  await dialog.getByLabel(/^意味/).fill('ウーロン茶')
  await dialog.getByRole('button', { name: '保存', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(notice).toBeHidden()
})
