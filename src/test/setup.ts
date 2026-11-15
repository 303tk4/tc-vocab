import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach } from 'vitest'
import { db } from '../db/schema'

// findBy・waitFor の待ち時間（既定 1 秒）を少し伸ばす。全体を並べて流すと、重い画面のテストがまれに時間切れになるため
configure({ asyncUtilTimeout: 2000 })

// jsdom には matchMedia が無いので、常に不一致を返す簡易版を用意する
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

// jsdom の <dialog> はモーダル表示を実装していないため、open 属性の切り替えで代用する
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.open = false
  }
}

// 仮想スクロールが呼ぶが jsdom には無い
window.scrollTo = () => {}

// 共通の文言は動的 import() で読み込むため（仕様書 16.8）、テストでは先にすべての言語を読み込んでおく
beforeAll(async () => {
  const { loadLanguage } = await import('../i18n')
  const { UI_LANGUAGES } = await import('../settings/types')
  await Promise.all(UI_LANGUAGES.map((lang) => loadLanguage(lang)))
})

beforeEach(async () => {
  localStorage.clear()
  await Promise.all(db.tables.map((table) => table.clear()))
  // データが消えうることの知らせ（FR-PWA-06）は、ほかの画面のテストでは出さない（示し済みとする）
  await db.settings.put({ key: 'app.storageNoticeShown', value: true })
})

afterEach(() => {
  cleanup()
})
