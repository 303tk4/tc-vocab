import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  canPickSaveLocation,
  canShareBackup,
  createBackupFile,
  saveBackupFile,
  shareBackupFile,
  type BackupFile,
  type SaveOutcome,
} from '../services/backup'
import styles from './BackupButton.module.css'
import { Dialog } from './Dialog'

interface Props {
  /** ボタンの名前（省略時は「バックアップファイルを作成する」） */
  label?: string
  /** ボタンに足すクラス（例：button--primary） */
  className?: string
  /** 保存か共有が終わったとき */
  onSaved?(): void
}

type Message = { kind: 'ok' | 'error'; text: string } | null

/**
 * 「バックアップファイルを作成する」（FR-SET-11、仕様書 10.4 の「保存方法の選択」）。
 * 押すとファイルを作り、保存方法（ファイルとして保存／ほかのアプリと共有／キャンセル）を選ばせる。
 * 共有の機能が無いブラウザでは、選ばせずにすぐ保存する。
 * 設定画面、復元・初期化の確認、ホームの勧めで使う
 */
export function BackupButton({ label, className = '', onSaved }: Props) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<Message>(null)
  const [pending, setPending] = useState<BackupFile | null>(null)
  const shareable = useMemo(() => canShareBackup(), [])
  const pickable = useMemo(() => canPickSaveLocation(), [])

  const finish = (outcome: SaveOutcome) => {
    if (outcome !== 'saved') return
    setMessage({ kind: 'ok', text: t('backup.saved') })
    onSaved?.()
  }
  const fail = () => setMessage({ kind: 'error', text: t('backup.saveFailed') })

  const start = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const backup = await createBackupFile()
      if (shareable) setPending(backup)
      else finish(await saveBackupFile(backup))
    } catch {
      fail()
    } finally {
      setBusy(false)
    }
  }

  const choose = async (how: 'save' | 'share') => {
    if (!pending) return
    const backup = pending
    setPending(null)
    try {
      // 共有と保存先の選択は、押した操作の直後に呼ぶ（間に待ち時間を入れない）
      finish(await (how === 'save' ? saveBackupFile(backup) : shareBackupFile(backup)))
    } catch {
      fail()
    }
  }

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={`button button--block-sm ${className}`}
        disabled={busy}
        onClick={() => void start()}
      >
        {busy ? t('backup.creating') : (label ?? t('backup.create'))}
      </button>
      {message &&
        (message.kind === 'error' ? (
          <p className={styles.error} role="alert">
            {message.text}
          </p>
        ) : (
          <p role="status">{message.text}</p>
        ))}
      <Dialog
        open={pending !== null}
        title={t('backup.chooseTitle')}
        onClose={() => setPending(null)}
        actions={
          <button type="button" className="button" onClick={() => setPending(null)}>
            {t('common.cancel')}
          </button>
        }
      >
        <div className={styles.choices}>
          <button
            type="button"
            className="button button--primary"
            onClick={() => void choose('save')}
          >
            {pickable ? t('backup.saveToLocation') : t('backup.saveAsFile')}
          </button>
          {!pickable && <p className={styles.hint}>{t('backup.downloadNote')}</p>}
          <button type="button" className="button" onClick={() => void choose('share')}>
            {t('backup.shareToApp')}
          </button>
        </div>
      </Dialog>
    </div>
  )
}
