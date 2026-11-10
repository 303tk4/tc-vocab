import { useRegisterSW } from 'virtual:pwa-register/react'
import { applyUpdate } from './applyUpdate'
import { StorageNotice } from './StorageNotice'
import { UpdateNotice } from './UpdateNotice'

/** 新しい版に切り替えて再読み込みする。どの場合も最後は必ず再読み込みする（FR-PWA-03） */
function reloadToUpdate() {
  const reload = () => window.location.reload()
  const container = 'serviceWorker' in navigator ? navigator.serviceWorker : undefined
  if (!container) return reload()
  container
    .getRegistration()
    .then((registration) => applyUpdate({ registration, container, reload }))
    .catch(reload)
}

/** 更新を確認する間隔（1時間）。開いたままでも新しいバージョンに気づけるようにする */
const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000

/**
 * Service Worker を登録し、新しいバージョンがあれば通知する（FR-PWA-01・03）。
 * 確認先は自分の公開元だけで、外部とは通信しない（NFR-06）
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
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
    <>
      <UpdateNotice
        needRefresh={needRefresh}
        onReload={reloadToUpdate}
        onDismiss={() => setNeedRefresh(false)}
      />
      {/* データが消えうることの知らせ（FR-PWA-06）は、更新の通知が閉じてから示す */}
      {!needRefresh && <StorageNotice />}
    </>
  )
}
