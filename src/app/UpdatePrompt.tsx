import { useRegisterSW } from 'virtual:pwa-register/react'
import { UpdateNotice } from './UpdateNotice'

/** 更新を確認する間隔（1時間）。開いたままでも新しいバージョンに気づけるようにする */
const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000

/**
 * Service Worker を登録し、新しいバージョンがあれば通知する（FR-PWA-01・03）。
 * 確認先は自分の公開元だけで、外部とは通信しない（NFR-06）
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      setInterval(() => {
        if (registration.installing || !navigator.onLine) return
        void registration.update()
      }, UPDATE_CHECK_INTERVAL)
    },
  })

  return (
    <UpdateNotice
      needRefresh={needRefresh}
      onReload={() => void updateServiceWorker(true)}
      onDismiss={() => setNeedRefresh(false)}
    />
  )
}
