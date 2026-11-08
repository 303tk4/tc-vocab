import { useLiveQuery } from 'dexie-react-hooks'
import { useDeferredValue, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '../components/Dialog'
import { TagChips } from '../components/TagChips'
import {
  deleteAllData,
  deleteWords,
  deleteWordsByTag,
  listTags,
  listWords,
  type ImportResult,
} from '../db/repos/words'
import { addSampleWords } from '../services/samples'
import type { Word } from '../types/word'
import { ExportDialog } from './words/ExportDialog'
import { ImportDialog } from './words/ImportDialog'
import { createMatcher, sortWords } from './words/search'
import { WordList } from './words/WordList'
import styles from './words/WordsPage.module.css'

type DialogKind = 'import' | 'export' | 'deleteSelected' | 'deleteByTag' | 'deleteAll' | null
type Notice = { kind: 'success' | 'error'; text: string } | null

export function WordsPage() {
  const { t } = useTranslation()
  const searchId = useId()
  const allWords = useLiveQuery(listWords)
  const allTags = useLiveQuery(listTags, [], [] as string[])

  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [dialog, setDialog] = useState<DialogKind>(null)
  const [notice, setNotice] = useState<Notice>(null)
  const [busy, setBusy] = useState(false)
  const [deleteTag, setDeleteTag] = useState('')

  const sorted = useMemo(() => sortWords(allWords ?? []), [allWords])
  const activeFilterTags = filterTags.filter((tag) => allTags.includes(tag))
  // 配列の中身で比較するため、文字列にして依存配列に入れる
  const filterKey = activeFilterTags.join('\n')
  const shown = useMemo(() => {
    const tags = filterKey === '' ? [] : filterKey.split('\n')
    const matches = createMatcher(deferredQuery)
    return sorted.filter(
      (w) => (tags.length === 0 || w.tags.some((tag) => tags.includes(tag))) && matches(w),
    )
  }, [sorted, deferredQuery, filterKey])

  // 削除済みの単語は選択から外して数える
  const selectedIds = sorted.filter((w) => selected.has(w.id)).map((w) => w.id)
  const allShownSelected = shown.length > 0 && shown.every((w) => selected.has(w.id))
  const effectiveDeleteTag = allTags.includes(deleteTag) ? deleteTag : (allTags[0] ?? '')
  const deleteTagCount = sorted.filter((w) => w.tags.includes(effectiveDeleteTag)).length

  const toggleFilterTag = (tag: string) =>
    setFilterTags(
      activeFilterTags.includes(tag)
        ? activeFilterTags.filter((x) => x !== tag)
        : [...activeFilterTags, tag],
    )

  const toggleWord = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleAllShown = () =>
    setSelected((prev) => {
      const next = new Set(prev)
      for (const w of shown) {
        if (allShownSelected) next.delete(w.id)
        else next.add(w.id)
      }
      return next
    })

  /** DB への書き込みを行い、失敗したら通知する（NFR-07） */
  const write = async (action: () => Promise<string>) => {
    setBusy(true)
    try {
      setNotice({ kind: 'success', text: await action() })
    } catch {
      setNotice({ kind: 'error', text: t('words.writeFailed') })
    } finally {
      setBusy(false)
      setDialog(null)
    }
  }

  const importedText = (r: ImportResult) => t('io.imported', { ...r })

  const addSamples = () =>
    write(async () => {
      const r = await addSampleWords()
      return t('words.samplesAdded', { added: r.added, skipped: r.skipped })
    })

  const confirmDeleteSelected = () =>
    write(async () => {
      await deleteWords(selectedIds)
      setSelected(new Set())
      return t('words.deleted', { count: selectedIds.length })
    })

  const confirmDeleteByTag = () =>
    write(async () => {
      const count = await deleteWordsByTag(effectiveDeleteTag)
      return t('words.deleted', { count })
    })

  const confirmDeleteAll = () =>
    write(async () => {
      await deleteAllData()
      setSelected(new Set())
      return t('words.allDeleted')
    })

  const cancelButton = (
    <button type="button" className="button" disabled={busy} onClick={() => setDialog(null)}>
      {t('common.cancel')}
    </button>
  )

  return (
    <div className="stack">
      <div className={styles.heading}>
        <h1 className="page-title">{t('words.title')}</h1>
        {allWords && <p className="muted">{t('home.wordCount', { count: allWords.length })}</p>}
      </div>

      <div className={styles.toolbar}>
        <button type="button" className="button" onClick={() => setDialog('import')}>
          {t('words.import')}
        </button>
        <button
          type="button"
          className="button"
          disabled={!allWords?.length}
          onClick={() => setDialog('export')}
        >
          {t('words.export')}
        </button>
        <button type="button" className="button" disabled={busy} onClick={() => void addSamples()}>
          {t('words.addSamples')}
        </button>
      </div>

      {notice && (
        <p
          className={notice.kind === 'error' ? styles.noticeError : styles.notice}
          role={notice.kind === 'error' ? 'alert' : 'status'}
        >
          {notice.text}
        </p>
      )}

      <section className="panel stack" aria-label={t('words.filter')}>
        <div className={styles.field}>
          <label htmlFor={searchId}>{t('words.search')}</label>
          <input
            id={searchId}
            type="search"
            className={styles.input}
            value={query}
            placeholder={t('words.searchPlaceholder')}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {allTags.length > 0 && (
          <TagChips
            legend={t('words.filterTags')}
            tags={allTags}
            selected={activeFilterTags}
            onToggle={toggleFilterTag}
          />
        )}
      </section>

      {allWords === undefined ? (
        <p className="muted">{t('common.loading')}</p>
      ) : (
        <section className="stack" aria-label={t('words.list')}>
          <div className={styles.listBar}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={allShownSelected}
                disabled={shown.length === 0}
                onChange={toggleAllShown}
              />
              {t('words.selectAllShown', { count: shown.length })}
            </label>
            <button
              type="button"
              className="button"
              disabled={selectedIds.length === 0}
              onClick={() => setDialog('deleteSelected')}
            >
              {t('words.deleteSelected', { count: selectedIds.length })}
            </button>
          </div>
          {shown.length === 0 ? (
            <p className="muted">{allWords.length === 0 ? t('words.empty') : t('words.noMatch')}</p>
          ) : (
            <WordList words={shown} selected={selected} onToggle={toggleWord} />
          )}
        </section>
      )}

      <section className={`panel stack ${styles.danger}`} aria-labelledby="bulk-title">
        <h2 id="bulk-title" className="section-title">
          {t('words.bulkTitle')}
        </h2>
        <div className={styles.toolbar}>
          <button
            type="button"
            className="button"
            disabled={allTags.length === 0}
            onClick={() => setDialog('deleteByTag')}
          >
            {t('words.deleteByTag')}
          </button>
          <button
            type="button"
            className={`button ${styles.dangerButton}`}
            disabled={!allWords?.length}
            onClick={() => setDialog('deleteAll')}
          >
            {t('words.deleteAll')}
          </button>
        </div>
      </section>

      <ImportDialog
        open={dialog === 'import'}
        onClose={() => setDialog(null)}
        onImported={(r) => {
          setDialog(null)
          setNotice({ kind: 'success', text: importedText(r) })
        }}
      />
      <ExportDialog
        open={dialog === 'export'}
        words={allWords ?? NO_WORDS}
        tags={allTags}
        onClose={() => setDialog(null)}
        onExported={(count) => {
          setDialog(null)
          setNotice({ kind: 'success', text: t('io.exported', { count }) })
        }}
      />

      <Dialog
        open={dialog === 'deleteSelected'}
        title={t('words.deleteSelectedTitle')}
        onClose={() => setDialog(null)}
        actions={
          <>
            {cancelButton}
            <button
              type="button"
              className={`button ${styles.dangerButton}`}
              disabled={busy}
              onClick={() => void confirmDeleteSelected()}
            >
              {t('common.delete')}
            </button>
          </>
        }
      >
        <p>{t('words.confirmDeleteSelected', { count: selectedIds.length })}</p>
      </Dialog>

      <Dialog
        open={dialog === 'deleteByTag'}
        title={t('words.deleteByTag')}
        onClose={() => setDialog(null)}
        actions={
          <>
            {cancelButton}
            <button
              type="button"
              className={`button ${styles.dangerButton}`}
              disabled={busy || deleteTagCount === 0}
              onClick={() => void confirmDeleteByTag()}
            >
              {t('common.delete')}
            </button>
          </>
        }
      >
        <div className={styles.field}>
          <label htmlFor={`${searchId}-tag`}>{t('words.tag')}</label>
          <select
            id={`${searchId}-tag`}
            className={styles.input}
            value={effectiveDeleteTag}
            onChange={(e) => setDeleteTag(e.target.value)}
          >
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>
        <p>{t('words.confirmDeleteByTag', { count: deleteTagCount })}</p>
      </Dialog>

      <Dialog
        open={dialog === 'deleteAll'}
        title={t('words.deleteAll')}
        onClose={() => setDialog(null)}
        actions={
          <>
            {cancelButton}
            <button
              type="button"
              className={`button ${styles.dangerButton}`}
              disabled={busy}
              onClick={() => void confirmDeleteAll()}
            >
              {t('words.deleteAllConfirm')}
            </button>
          </>
        }
      >
        <p>{t('words.confirmDeleteAll', { count: allWords?.length ?? 0 })}</p>
        <p className={styles.strong}>{t('words.cannotUndo')}</p>
      </Dialog>
    </div>
  )
}

const NO_WORDS: Word[] = []
