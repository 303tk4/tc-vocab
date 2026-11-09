import { useEffect, useId, useRef, type ReactNode } from 'react'
import styles from './Dialog.module.css'

interface Props {
  open: boolean
  title: string
  onClose(): void
  children: ReactNode
  /** 下部のボタン列 */
  actions?: ReactNode
}

/**
 * ネイティブの <dialog> を使ったモーダル。
 * フォーカスの閉じ込めと Esc キーでの close はブラウザに任せる。
 */
export function Dialog({ open, title, onClose, children, actions }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
    >
      {open && (
        <div className={styles.inner}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <div className={styles.body}>{children}</div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      )}
    </dialog>
  )
}

/**
 * 本文の中に置くボタン列。中身の状態に応じてボタンを変えたいときに使う。
 * 本文をスクロールしても下端に見える
 */
export function DialogActions({ children }: { children: ReactNode }) {
  return <div className={styles.bodyActions}>{children}</div>
}
