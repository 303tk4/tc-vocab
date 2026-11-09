// タグの編集用ダイアログ（FR-WORDS-08・10・11）。1語の編集は components/WordTagsDialog.tsx
import { useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogActions } from '../../components/Dialog'
import { ReviewReadingNote } from '../../components/ReviewReadingNote'
import { REVIEW_READING_TAG } from '../../io/reviewReading'
import { TagField } from '../../components/TagField'
import {
  addTagToWords,
  removeTagEverywhere,
  removeTagFromWords,
  renameTag,
  summarizeAddTag,
} from '../../db/repos/tags'
import { LIMITS, tagError } from '../../io/validate'
import type { Word } from '../../types/word'
import styles from './WordsPage.module.css'

/** 書き込みを行い、成功時の通知文を返す。失敗時の通知とダイアログを閉じるのは呼び出し元が行う */
export type RunWrite = (action: () => Promise<string>) => Promise<void>

function CancelButton({ busy, onClose }: { busy: boolean; onClose(): void }) {
  const { t } = useTranslation()
  return (
    <button type="button" className="button" disabled={busy} onClick={onClose}>
      {t('common.cancel')}
    </button>
  )
}

interface BulkProps {
  mode: 'add' | 'remove' | null
  words: readonly Word[]
  allTags: readonly string[]
  busy: boolean
  onClose(): void
  run: RunWrite
}

/** 選択した単語へのタグの一括追加・削除（FR-WORDS-08） */
export function BulkTagDialog({ mode, words, allTags, busy, onClose, run }: BulkProps) {
  const { t } = useTranslation()
  return (
    <Dialog
      open={mode !== null}
      title={mode === 'remove' ? t('tags.removeTitle') : t('tags.addTitle')}
      onClose={onClose}
    >
      {mode === 'add' && (
        <BulkAdd words={words} allTags={allTags} busy={busy} onClose={onClose} run={run} />
      )}
      {mode === 'remove' && <BulkRemove words={words} busy={busy} onClose={onClose} run={run} />}
    </Dialog>
  )
}

type BulkBodyProps = Omit<BulkProps, 'mode' | 'allTags'>

function BulkAdd({
  words,
  allTags,
  busy,
  onClose,
  run,
}: BulkBodyProps & { allTags: readonly string[] }) {
  const { t } = useTranslation()
  const [tag, setTag] = useState('')
  const error = tagError(tag)
  const summary = error ? null : summarizeAddTag(words, tag)
  const canRun = !busy && !!summary && summary.targets.length > 0

  const submit = () => {
    if (!canRun) return
    const name = tag.trim()
    void run(async () => {
      const r = await addTagToWords(
        words.map((w) => w.id),
        name,
      )
      return t('tags.added', { tag: name, count: r.added })
    })
  }

  return (
    <>
      <TagField
        label={t('tags.tagName')}
        value={tag}
        onChange={setTag}
        suggestions={allTags}
        error={error}
        onEnter={submit}
      />
      {summary && (
        <div>
          <p>{t('tags.willAdd', { count: summary.targets.length })}</p>
          {summary.already > 0 && (
            <p className="muted">{t('tags.alreadyHave', { count: summary.already })}</p>
          )}
          {summary.overLimit > 0 && (
            <p className={styles.warning}>
              {t('tags.overLimit', { count: summary.overLimit, max: LIMITS.tags })}
            </p>
          )}
        </div>
      )}
      <DialogActions>
        <CancelButton busy={busy} onClose={onClose} />
        <button
          type="button"
          className="button button--primary"
          disabled={!canRun}
          onClick={submit}
        >
          {t('tags.add')}
        </button>
      </DialogActions>
    </>
  )
}

function BulkRemove({ words, busy, onClose, run }: BulkBodyProps) {
  const { t } = useTranslation()
  const id = useId()
  // 選択した単語に付いているタグと、その単語数
  const counts = useMemo(() => countTags(words), [words])
  const tags = [...counts.keys()].sort((a, b) => a.localeCompare(b))
  const [chosen, setChosen] = useState('')
  const tag = counts.has(chosen) ? chosen : (tags[0] ?? '')
  const count = counts.get(tag) ?? 0

  const submit = () =>
    run(async () => {
      const n = await removeTagFromWords(
        words.map((w) => w.id),
        tag,
      )
      return t('tags.removed', { tag, count: n })
    })

  return (
    <>
      {tags.length === 0 ? (
        <p>{t('tags.noTagsOnSelected')}</p>
      ) : (
        <>
          <div className={styles.field}>
            <label htmlFor={id}>{t('words.tag')}</label>
            <select
              id={id}
              className={styles.input}
              value={tag}
              onChange={(e) => setChosen(e.target.value)}
            >
              {tags.map((x) => (
                <option key={x} value={x}>
                  {x}（{t('tags.count', { count: counts.get(x) })}）
                </option>
              ))}
            </select>
          </div>
          <p>{t('tags.willRemove', { count })}</p>
        </>
      )}
      <DialogActions>
        <CancelButton busy={busy} onClose={onClose} />
        <button
          type="button"
          className="button button--primary"
          disabled={busy || count === 0}
          onClick={() => void submit()}
        >
          {t('tags.remove')}
        </button>
      </DialogActions>
    </>
  )
}

interface ManagerProps {
  open: boolean
  words: readonly Word[]
  busy: boolean
  onClose(): void
  run: RunWrite
}

type ManagerView = { kind: 'list' } | { kind: 'rename' | 'remove'; tag: string }

/** タグの一覧・名前変更・全単語から外す（FR-WORDS-10・11） */
export function TagManagerDialog({ open, words, busy, onClose, run }: ManagerProps) {
  const { t } = useTranslation()
  const [view, setView] = useState<ManagerView>({ kind: 'list' })
  const counts = useMemo(() => countTags(words), [words])
  const tags = [...counts.keys()].sort((a, b) => a.localeCompare(b))
  // 対象のタグが無くなっていたら一覧に戻す
  const current = view.kind !== 'list' && !counts.has(view.tag) ? { kind: 'list' as const } : view

  const close = () => {
    setView({ kind: 'list' })
    onClose()
  }
  const back = () => setView({ kind: 'list' })
  const runAndReset: RunWrite = async (action) => {
    await run(action)
    setView({ kind: 'list' })
  }

  const title =
    current.kind === 'rename'
      ? t('tags.renameTitle', { tag: current.tag })
      : current.kind === 'remove'
        ? t('tags.removeEverywhereTitle', { tag: current.tag })
        : t('tags.manage')

  return (
    <Dialog open={open} title={title} onClose={close}>
      {current.kind === 'list' && (
        <>
          {counts.has(REVIEW_READING_TAG) && <ReviewReadingNote />}
          {tags.length === 0 ? (
            <p>{t('tags.none')}</p>
          ) : (
            <ul className={styles.tagRows}>
              {tags.map((tag) => (
                <li key={tag} className={styles.tagRow}>
                  <span className={styles.tagName}>
                    {tag}
                    <span className="muted">{t('tags.count', { count: counts.get(tag) })}</span>
                  </span>
                  <span className={styles.tagRowActions}>
                    <button
                      type="button"
                      className="button"
                      aria-label={`${t('tags.rename')}：${tag}`}
                      onClick={() => setView({ kind: 'rename', tag })}
                    >
                      {t('tags.rename')}
                    </button>
                    <button
                      type="button"
                      className="button"
                      aria-label={`${t('tags.removeEverywhere')}：${tag}`}
                      onClick={() => setView({ kind: 'remove', tag })}
                    >
                      {t('tags.removeEverywhere')}
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <DialogActions>
            <button type="button" className="button" onClick={close}>
              {t('common.close')}
            </button>
          </DialogActions>
        </>
      )}
      {current.kind === 'rename' && (
        <RenameTag
          key={current.tag}
          tag={current.tag}
          count={counts.get(current.tag) ?? 0}
          allTags={tags}
          busy={busy}
          onBack={back}
          run={runAndReset}
        />
      )}
      {current.kind === 'remove' && (
        <>
          <p>{t('tags.confirmRemoveEverywhere', { count: counts.get(current.tag) ?? 0 })}</p>
          <DialogActions>
            <button type="button" className="button" disabled={busy} onClick={back}>
              {t('tags.back')}
            </button>
            <button
              type="button"
              className="button button--primary"
              disabled={busy}
              onClick={() =>
                void runAndReset(async () => {
                  const n = await removeTagEverywhere(current.tag)
                  return t('tags.removed', { tag: current.tag, count: n })
                })
              }
            >
              {t('tags.remove')}
            </button>
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}

function RenameTag(props: {
  tag: string
  count: number
  allTags: readonly string[]
  busy: boolean
  onBack(): void
  run: RunWrite
}) {
  const { t } = useTranslation()
  const { tag, allTags, busy, run } = props
  const [value, setValue] = useState(tag)
  const name = value.trim()
  const error = name === tag ? 'same' : tagError(value)
  const merge = !error && allTags.includes(name)
  const canRun = !busy && !error

  const submit = () => {
    if (!canRun) return
    void run(async () => {
      const count = await renameTag(tag, name)
      return t('tags.renamed', { from: tag, to: name, count })
    })
  }

  return (
    <>
      <TagField
        label={t('tags.newName')}
        value={value}
        onChange={setValue}
        suggestions={allTags.filter((x) => x !== tag)}
        error={error}
        onEnter={submit}
      />
      <p className="muted">{t('tags.count', { count: props.count })}</p>
      {merge && <p className={styles.warning}>{t('tags.mergeNote', { tag: name })}</p>}
      <DialogActions>
        <button type="button" className="button" disabled={busy} onClick={props.onBack}>
          {t('tags.back')}
        </button>
        <button
          type="button"
          className="button button--primary"
          disabled={!canRun}
          onClick={submit}
        >
          {t('tags.rename')}
        </button>
      </DialogActions>
    </>
  )
}

/** ダイアログ本文の末尾に置くボタン列 */

function countTags(words: readonly Word[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const w of words) for (const tag of w.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  return counts
}
