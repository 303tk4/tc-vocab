// 1語のタグを編集するダイアログ（FR-WORDS-09・FR-FC-15）
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LIMITS, tagError } from '../io/validate'
import type { Word } from '../types/word'
import { Dialog, DialogActions } from './Dialog'
import { CloseIcon } from './icons'
import { TagField } from './TagField'
import styles from './WordTagsDialog.module.css'

interface Props {
  /** 編集する単語。null のときは閉じる */
  word: Word | null
  /** 入力候補（登録済みのタグ） */
  allTags: readonly string[]
  busy: boolean
  /** 保存に失敗したときなどにダイアログ内に出す文 */
  error?: string | null
  onClose(): void
  /** 編集後のタグで保存する。書き込みと閉じる処理は呼び出し元が行う */
  onSave(tags: string[]): void
}

export function WordTagsDialog({ word, allTags, busy, error, onClose, onSave }: Props) {
  const { t } = useTranslation()
  return (
    <Dialog
      open={word !== null}
      title={word ? t('tags.editTitle', { hanzi: word.hanzi }) : ''}
      onClose={onClose}
    >
      {word && (
        <Body
          key={word.id}
          word={word}
          allTags={allTags}
          busy={busy}
          error={error}
          onClose={onClose}
          onSave={onSave}
        />
      )}
    </Dialog>
  )
}

function Body({ word, allTags, busy, error, onClose, onSave }: Props & { word: Word }) {
  const { t } = useTranslation()
  const [tags, setTags] = useState<string[]>(word.tags)
  const [input, setInput] = useState('')
  const name = input.trim()
  const full = tags.length >= LIMITS.tags
  const inputError = full && name !== '' ? 'tooMany' : tagError(input)
  const canAdd = !inputError && !tags.includes(name)
  const changed = tags.join('\n') !== word.tags.join('\n')

  const add = () => {
    if (!canAdd) return
    setTags([...tags, name])
    setInput('')
  }

  return (
    <>
      <section aria-label={t('tags.currentTags')}>
        <h3 className={styles.subTitle}>{t('tags.currentTags')}</h3>
        {tags.length === 0 ? (
          <p className="muted">{t('tags.noTags')}</p>
        ) : (
          <ul className={styles.chips}>
            {tags.map((tag) => (
              <li key={tag} className={styles.chip}>
                <span>{tag}</span>
                <button
                  type="button"
                  className={styles.chipRemove}
                  aria-label={t('tags.removeTag', { tag })}
                  onClick={() => setTags(tags.filter((x) => x !== tag))}
                >
                  <CloseIcon />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <TagField
        label={t('tags.newTag')}
        value={input}
        onChange={setInput}
        suggestions={allTags.filter((x) => !tags.includes(x))}
        error={inputError}
        onEnter={add}
        action={
          <button type="button" className="button" disabled={!canAdd} onClick={add}>
            {t('tags.add')}
          </button>
        }
      />
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <DialogActions>
        <button type="button" className="button" disabled={busy} onClick={onClose}>
          {t('common.cancel')}
        </button>
        <button
          type="button"
          className="button button--primary"
          disabled={busy || !changed}
          onClick={() => onSave(tags)}
        >
          {t('tags.save')}
        </button>
      </DialogActions>
    </>
  )
}
