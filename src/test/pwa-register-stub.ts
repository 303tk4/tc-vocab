import { useState } from 'react'
import type { useRegisterSW as UseRegisterSW } from 'virtual:pwa-register/react'

/**
 * テスト用の `virtual:pwa-register/react` の代わり（vite.config.ts の test.alias で差し替える）。
 * テストでは Service Worker を登録せず、更新もないものとする
 */
export const useRegisterSW: typeof UseRegisterSW = () => {
  const needRefresh = useState(false)
  const offlineReady = useState(false)
  return { needRefresh, offlineReady, updateServiceWorker: () => Promise.resolve() }
}
