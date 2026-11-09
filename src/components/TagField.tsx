// タグ名の入力欄（FR-WORDS-08〜10・FR-FC-15 で共通に使う）
import { useId, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LIMITS, type TagError } from '../io/validate'
import styles from './TagField.module.css'

export interface TagFieldProps {
  label: string
  value: string
  onChange(value: string): void
  /** 入力候補（登録済みのタグ） */
  suggestions: readonly string[]
  /** 表示するエラー。入力が空のうちは出さない */
  error?: TagError | 'same' | 'tooMany' | null
  onEnter?(): void
  /** 入力欄の右に置くボタン */
  action?: ReactNode
}

/** 登録済みのタグを候補に出すタグ名の入力欄 */
export function TagField({
  label,
  value,
  onChange,
  suggestions,
  error,
  onEnter,
  action,
}: TagFieldProps) {
  const { t } = useTranslation()
  const id = useId()
  const shownError = value.trim() === '' && error === 'empty' ? null : error
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.inline}>
        <input
          id={id}
          className={styles.input}
          value={value}
          list={`${id}-list`}
          autoComplete="off"
          placeholder={t('tags.tagPlaceholder')}
          aria-invalid={!!shownError}
          aria-describedby={shownError ? `${id}-error` : undefined}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing && onEnter) {
              e.preventDefault()
              onEnter()
            }
          }}
        />
        {action}
      </div>
      <datalist id={`${id}-list`}>
        {suggestions.map((tag) => (
          <option key={tag} value={tag} />
        ))}
      </datalist>
      {shownError && (
        <p id={`${id}-error`} className={styles.error}>
          {t(`tags.errors.${shownError}`, { max: LIMITS.tags })}
        </p>
      )}
    </div>
  )
}
