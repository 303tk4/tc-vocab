import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '../../components/Dialog'
import { countData, type DataCounts } from '../../db/repos/backup'
import { getSetting } from '../../db/repos/settings'
import { BackupFileError, LAST_BACKUP_KEY, readBackupFile, type Backup } from '../../io/backup'
import { canShareBackup, resetApp, restoreFromBackup } from '../../services/backup'
import { useBackupActions, type BackupMessage as Message } from '../../hooks/useBackupActions'
import styles from './BackupPanel.module.css'

/** 日時を画面の言語で示す */
function useFormatDate() {
  const { i18n } = useTranslation()
  return (time: number) =>
    new Date(time).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })
}

function MessageLine({ message }: { message: Message }) {
  if (!message) return null
  return message.kind === 'error' ? (
    <p className={styles.error} role="alert">
      {message.text}
    </p>
  ) : (
    <p className={styles.ok} role="status">
      {message.text}
    </p>
  )
}

/** 保存のボタン列。ダイアログの中（「先に…保存する」）でも使う */
function SaveButtons({ saveLabel }: { saveLabel?: string }) {
  const { t } = useTranslation()
  const { busy, message, save, share } = useBackupActions()
  const shareable = useMemo(() => canShareBackup(), [])
  return (
    <div className={styles.group}>
      <div className={styles.buttons}>
        <button
          type="button"
          className="button button--block-sm"
          disabled={busy}
          onClick={() => void save()}
        >
          {busy ? t('backup.saving') : (saveLabel ?? t('backup.save'))}
        </button>
        {shareable && (
          <button
            type="button"
            className="button button--block-sm"
            disabled={busy}
            onClick={() => void share()}
          >
            {t('backup.share')}
          </button>
        )}
      </div>
      {shareable && <p className={styles.hint}>{t('backup.shareNote')}</p>}
      <MessageLine message={message} />
    </div>
  )
}

/** バックアップと初期化（仕様書 10.4、FR-SET-11〜13） */
export function BackupPanel() {
  const { t } = useTranslation()
  const formatDate = useFormatDate()
  const lastBackupAt = useLiveQuery(() => getSetting<number>(LAST_BACKUP_KEY))
  const fileRef = useRef<HTMLInputElement>(null)
  const [readError, setReadError] = useState('')
  const [restore, setRestore] = useState<{
    fileName: string
    backup: Backup
    counts: DataCounts
  } | null>(null)
  const [resetCounts, setResetCounts] = useState<DataCounts | null>(null)

  const pickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // 同じファイルを選び直せるよう、選択を空にしておく
    e.target.value = ''
    if (!file) return
    setReadError('')
    try {
      const backup = await readBackupFile(file)
      setRestore({ fileName: file.name, backup, counts: await countData() })
    } catch (error) {
      setReadError(
        error instanceof BackupFileError
          ? t(`backup.errors.${error.code}`, error.params)
          : t('backup.errors.readFailed'),
      )
    }
  }

  const openReset = async () => {
    setResetCounts(await countData())
  }

  return (
    <div className={`panel stack ${styles.panel}`}>
      <h3 className="section-title">{t('backup.title')}</h3>
      <p>{t('backup.intro')}</p>

      <div className={styles.block}>
        <p className={styles.hint}>
          {typeof lastBackupAt === 'number'
            ? t('backup.lastBackup', { date: formatDate(lastBackupAt) })
            : t('backup.never')}
        </p>
        <SaveButtons />
      </div>

      <div className={styles.block}>
        <button
          type="button"
          className="button button--block-sm"
          onClick={() => fileRef.current?.click()}
        >
          {t('backup.restore')}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          hidden
          data-testid="backup-file"
          onChange={(e) => void pickFile(e)}
        />
        <p className={styles.hint}>{t('backup.restoreNote')}</p>
        {readError && (
          <p className={styles.error} role="alert">
            {readError}
          </p>
        )}
      </div>

      <div className={styles.block}>
        <button
          type="button"
          className={`button button--block-sm ${styles.danger}`}
          onClick={() => void openReset()}
        >
          {t('backup.reset')}
        </button>
        <p className={styles.hint}>{t('backup.resetNote')}</p>
      </div>

      <RestoreDialog value={restore} onClose={() => setRestore(null)} />
      <ResetDialog counts={resetCounts} onClose={() => setResetCounts(null)} />
    </div>
  )
}

function Counts({ label, counts }: { label: 'countsFile' | 'countsNow'; counts: DataCounts }) {
  const { t } = useTranslation()
  return <p>{t(`backup.${label}`, { ...counts })}</p>
}

/**
 * 元に戻せない操作の確認では、初めに「キャンセル」を選んでおく（仕様書 10.4）。
 * Dialog（子）の showModal() のあとに動くよう、親の effect でフォーカスを移す
 */
function useInitialFocus(open: boolean, ref: RefObject<HTMLButtonElement | null>) {
  useEffect(() => {
    if (open) ref.current?.focus()
  }, [open, ref])
}

/** 復元の確認（FR-SET-12） */
function RestoreDialog({
  value,
  onClose,
}: {
  value: { fileName: string; backup: Backup; counts: DataCounts } | null
  onClose(): void
}) {
  const { t } = useTranslation()
  const formatDate = useFormatDate()
  const cancelRef = useRef<HTMLButtonElement>(null)
  useInitialFocus(value !== null, cancelRef)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const close = () => {
    if (busy) return
    setError('')
    onClose()
  }

  const run = async () => {
    if (!value) return
    setBusy(true)
    setError('')
    try {
      // 成功したらホームを開き直すため、busy は戻さない
      await restoreFromBackup(value.backup)
    } catch {
      setError(t('backup.restoreFailed'))
      setBusy(false)
    }
  }

  const backup = value?.backup
  return (
    <Dialog
      open={value !== null}
      title={t('backup.restoreTitle')}
      onClose={close}
      actions={
        <>
          <button ref={cancelRef} type="button" className="button" disabled={busy} onClick={close}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className={`button ${styles.danger}`}
            disabled={busy}
            onClick={() => void run()}
          >
            {busy ? t('backup.restoring') : t('backup.restoreRun')}
          </button>
        </>
      }
    >
      {value && backup && (
        <div className={styles.dialogBody}>
          <p className={styles.fileName}>{t('backup.fileName', { name: value.fileName })}</p>
          <p>
            {t('backup.exportedAt', {
              date: formatDate(backup.exportedAt),
              version: backup.appVersion || '?',
            })}
          </p>
          <Counts
            label="countsFile"
            counts={{
              words: backup.words.length,
              progress: backup.progress.length,
              sessions: backup.sessions.length,
            }}
          />
          <Counts label="countsNow" counts={value.counts} />
          <p className={styles.strong}>{t('backup.replaceWarning')}</p>
          <SaveButtons saveLabel={t('backup.saveFirst')} />
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </Dialog>
  )
}

/** 初期化の確認（FR-SET-13） */
function ResetDialog({ counts, onClose }: { counts: DataCounts | null; onClose(): void }) {
  const { t } = useTranslation()
  const cancelRef = useRef<HTMLButtonElement>(null)
  useInitialFocus(counts !== null, cancelRef)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const close = () => {
    if (busy) return
    setError('')
    onClose()
  }

  const run = async () => {
    setBusy(true)
    setError('')
    try {
      // 成功したらホームを開き直すため、busy は戻さない
      await resetApp()
    } catch {
      setError(t('backup.resetFailed'))
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={counts !== null}
      title={t('backup.resetTitle')}
      onClose={close}
      actions={
        <>
          <button ref={cancelRef} type="button" className="button" disabled={busy} onClick={close}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className={`button ${styles.danger}`}
            disabled={busy}
            onClick={() => void run()}
          >
            {busy ? t('backup.resetting') : t('backup.resetRun')}
          </button>
        </>
      }
    >
      {counts && (
        <div className={styles.dialogBody}>
          <p>{t('backup.resetBody', { count: counts.words })}</p>
          <p className={styles.strong}>{t('backup.cannotUndo')}</p>
          <SaveButtons saveLabel={t('backup.saveFirst')} />
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </Dialog>
  )
}
