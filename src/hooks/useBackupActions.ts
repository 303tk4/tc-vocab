import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { saveBackup, shareBackup } from '../services/backup'

export type BackupMessage = { kind: 'ok' | 'error'; text: string } | null

/** 「バックアップを保存」と、共有の機能があれば「共有して保存」（FR-SET-11） */
export function useBackupActions() {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<BackupMessage>(null)

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setMessage(null)
    try {
      const result = await action()
      if (result !== 'cancelled') setMessage({ kind: 'ok', text: t('backup.saved') })
    } catch {
      setMessage({ kind: 'error', text: t('backup.saveFailed') })
    } finally {
      setBusy(false)
    }
  }

  return {
    busy,
    message,
    save: () => run(saveBackup),
    share: () => run(shareBackup),
  }
}
