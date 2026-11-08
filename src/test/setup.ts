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

beforeEach(async () => {
  localStorage.clear()
  await Promise.all(db.tables.map((table) => table.clear()))
})

afterEach(() => {
  cleanup()
})
