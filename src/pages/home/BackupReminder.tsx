import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { loadReminderInput } from '../../db/repos/backup'
import { getSetting, setSetting } from '../../db/repos/settings'
import { useBackupActions } from '../../hooks/useBackupActions'
import {
  BACKUP_REMINDER_INTERVAL,
  BACKUP_REMINDER_SNOOZE_KEY,
  LAST_BACKUP_KEY,
  shouldRemindBackup,
} from '../../io/backup'
import styles from './BackupReminder.module.css'

/**
 * ホームでのバックアップの勧め（FR-SET-14、仕様書 10.4）。
 * 前回のバックアップ（無ければ最も古いデータ）から30日以上たち、そのあとに単語や学習の記録が
 * 増えていれば示す。「閉じる」で30日間は示さない
 */
export function BackupReminder() {
  const { t } = useTranslation()
  const show = useLiveQuery(async () => {
    const [input, lastBackupAt, snoozedUntil] = await Promise.all([
      loadReminderInput(),
      getSetting<number>(LAST_BACKUP_KEY),
      getSetting<number>(BACKUP_REMINDER_SNOOZE_KEY),
    ])
    return shouldRemindBackup({ ...input, lastBackupAt, snoozedUntil })
  })
  const { busy, message, save } = useBackupActions()
  const [failed, setFailed] = useState(false)

  // 保存し終えたら、その旨を示すために残す
  if (!show && message?.kind !== 'ok') return null

  const close = async () => {
    setFailed(false)
    try {
      await setSetting(BACKUP_REMINDER_SNOOZE_KEY, Date.now() + BACKUP_REMINDER_INTERVAL)
    } catch {
      // 保存に失敗したら知らせる（NFR-07）
      setFailed(true)
    }
  }

  return (
    <section className={`panel ${styles.reminder}`} aria-labelledby="backup-reminder-title">
      <h2 id="backup-reminder-title" className="section-title">
        {t('backup.reminderTitle')}
      </h2>
      <p>{t('backup.reminderBody')}</p>
      {message && (
        <p
          className={message.kind === 'error' ? styles.error : undefined}
          role={message.kind === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </p>
      )}
      {failed && (
        <p className={styles.error} role="alert">
          {t('install.hideFailed')}
        </p>
      )}
      <div className={styles.actions}>
        {show && (
          <button
            type="button"
            className="button button--primary button--block-sm"
            disabled={busy}
            onClick={() => void save()}
          >
            {busy ? t('backup.saving') : t('backup.save')}
          </button>
        )}
        {show && (
          <button type="button" className="button button--block-sm" onClick={() => void close()}>
            {t('common.close')}
          </button>
        )}
      </div>
    </section>
  )
}
