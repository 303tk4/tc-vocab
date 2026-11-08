import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { db } from '../db/schema'

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

beforeEach(async () => {
  localStorage.clear()
  await Promise.all(db.tables.map((table) => table.clear()))
})

afterEach(() => {
  cleanup()
})
