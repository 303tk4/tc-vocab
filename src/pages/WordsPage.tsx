import { useLiveQuery } from 'dexie-react-hooks'
import { useDeferredValue, useEffect, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { BackLink } from '../components/BackLink'
import { Dialog } from '../components/Dialog'
import { ReviewReadingNote } from '../components/ReviewReadingNote'
import { REVIEW_READING_TAG } from '../io/reviewReading'
import { TagChips } from '../components/TagChips'
import { WordTagsDialog } from '../components/WordTagsDialog'
import { setWordTags } from '../db/repos/tags'
import { deleteWords, listTags, listWords, type ImportResult } from '../db/repos/words'
import type { Word } from '../types/word'
import { findDuplicateGroups } from '../io/duplicates'
import { DuplicatesDialog } from './words/DuplicatesDialog'
import { ExportDialog } from './words/ExportDialog'
import { ImportDialog } from './words/ImportDialog'
import { PacksDialog } from './words/PacksDialog'
import { createMatcher, sortWords } from './words/search'
import { BulkTagDialog, TagManagerDialog } from './words/TagDialogs'
import { WordList } from './words/WordList'
import styles from './words/WordsPage.module.css'

type DialogKind =
  | 'import'
  | 'packs'
  | 'export'
  | 'deleteSelected'
  | 'addTag'
  | 'removeTag'
  | 'manageTags'
  | 'duplicates'
  | null
type Notice = { kind: 'success' | 'error'; text: string } | null

/** ホームの案内から開けるダイアログ（`#/words?open=packs` など。仕様書 16.5） */
const OPENABLE: readonly DialogKind[] = ['packs', 'import']

export function WordsPage() {
  const { t } = useTranslation()
  const searchId = useId()
  const allWords = useLiveQuery(listWords)
  const allTags = useLiveQuery(listTags, [], [] as string[])

  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [searchParams, setSearchParams] = useSearchParams()
  const openParam = searchParams.get('open')
  const [dialog, setDialog] = useState<DialogKind>(null)
  // URL で指定されたダイアログを開く。表示中の画面で URL だけが変わった場合も開く
  const [handledOpen, setHandledOpen] = useState<string | null>(null)
  if (openParam !== handledOpen) {
    setHandledOpen(openParam)
    const kind = OPENABLE.find((k) => k === openParam)
    if (kind) setDialog(kind)
  }
  // 開いたあとは URL から外し、再読み込みや戻る操作で再び開かないようにする
  useEffect(() => {
    if (openParam !== null) setSearchParams({}, { replace: true })
  }, [openParam, setSearchParams])
  const [notice, setNotice] = useState<Notice>(null)
  const [busy, setBusy] = useState(false)
  /** タグを編集中の単語の id */
  const [editingId, setEditingId] = useState<string | null>(null)

  const sorted = useMemo(() => sortWords(allWords ?? []), [allWords])
  // 重複している組の数（FR-WORDS-13）。重複があっても統合は促さない
  const duplicateGroupCount = useMemo(() => findDuplicateGroups(sorted).length, [sorted])
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
  const selectedWords = useMemo(() => sorted.filter((w) => selected.has(w.id)), [sorted, selected])
  const selectedIds = selectedWords.map((w) => w.id)
  const editingWord = sorted.find((w) => w.id === editingId) ?? null
  const allShownSelected = shown.length > 0 && shown.every((w) => selected.has(w.id))

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
      setEditingId(null)
    }
  }

  // 取り込みの結果。重複も追加した場合は「重複単語の整理」を案内する（FR-IO-03）
  const importedText = (r: ImportResult) =>
    [
      t('io.imported', { ...r }),
      r.duplicatesAdded > 0 ? t('io.duplicatesAddedNote', { count: r.duplicatesAdded }) : '',
      r.mergeOverflow > 0 ? t('io.mergeOverflowNote', { count: r.mergeOverflow }) : '',
      r.tagged > 0 ? t('io.taggedNote', { count: r.tagged }) : '',
      r.tagOverflow > 0 ? t('io.tagOverflowNote', { count: r.tagOverflow }) : '',
    ]
      .filter(Boolean)
      .join(' ')

  const confirmDeleteSelected = () =>
    write(async () => {
      await deleteWords(selectedIds)
      setSelected(new Set())
      return t('words.deleted', { count: selectedIds.length })
    })

  const cancelButton = (
    <button type="button" className="button" disabled={busy} onClick={() => setDialog(null)}>
      {t('common.cancel')}
    </button>
  )

  return (
    <div className="stack">
      <div className={styles.heading}>
        <div className="title-row">
          <BackLink />
          <h1 className="page-title">{t('words.title')}</h1>
        </div>
        {allWords && <p className="muted">{t('home.wordCount', { count: allWords.length })}</p>}
      </div>

      <div className={styles.toolbar}>
        <button type="button" className="button" onClick={() => setDialog('import')}>
          {t('words.import')}
        </button>
        {/* 単語パッケージ（FR-WORDS-07）。サンプル単語もこの一覧から追加する（FR-SMP-04） */}
        <button type="button" className="button" onClick={() => setDialog('packs')}>
          {t('words.packs')}
        </button>
        <button
          type="button"
          className="button"
          disabled={!allWords?.length}
          onClick={() => setDialog('export')}
        >
          {t('words.export')}
        </button>
        <button
          type="button"
          className="button"
          disabled={allTags.length === 0}
          onClick={() => setDialog('manageTags')}
        >
          {t('tags.manage')}
        </button>
        <button
          type="button"
          className="button"
          disabled={duplicateGroupCount === 0}
          onClick={() => setDialog('duplicates')}
        >
          {t('dup.open', { count: duplicateGroupCount })}
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
        {allTags.includes(REVIEW_READING_TAG) && <ReviewReadingNote />}
      </section>

      {allWords === undefined ? (
        <p className="muted">{t('common.loading')}</p>
      ) : (
        <section
          className={`stack ${selectedIds.length > 0 ? styles.withActionBar : ''}`}
          aria-label={t('words.list')}
        >
          {/* 選択の操作。スクロールしても届くよう固定する（FR-WORDS-12） */}
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
            <div
              className={styles.selectionActions}
              data-active={selectedIds.length > 0}
              role="group"
              aria-label={t('words.selectionActions')}
            >
              <button
                type="button"
                className="button"
                disabled={selectedIds.length === 0}
                onClick={() => setDialog('addTag')}
              >
                {t('tags.addToSelected', { count: selectedIds.length })}
              </button>
              <button
                type="button"
                className="button"
                disabled={selectedIds.length === 0}
                onClick={() => setDialog('removeTag')}
              >
                {t('tags.removeFromSelected', { count: selectedIds.length })}
              </button>
              <button
                type="button"
                className="button"
                disabled={selectedIds.length === 0}
                onClick={() => setDialog('deleteSelected')}
              >
                {t('words.deleteSelected', { count: selectedIds.length })}
              </button>
            </div>
          </div>
          {shown.length === 0 ? (
            <p className="muted">{allWords.length === 0 ? t('words.empty') : t('words.noMatch')}</p>
          ) : (
            <WordList
              words={shown}
              selected={selected}
              onToggle={toggleWord}
              onEditTags={(w) => setEditingId(w.id)}
            />
          )}
        </section>
      )}

      <PacksDialog
        open={dialog === 'packs'}
        onClose={() => setDialog(null)}
        onAdded={(name, r) => {
          setDialog(null)
          setNotice({
            kind: 'success',
            text: `${t('words.packAdded', { name })} ${importedText(r)}`,
          })
        }}
      />
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

      <BulkTagDialog
        mode={dialog === 'addTag' ? 'add' : dialog === 'removeTag' ? 'remove' : null}
        words={selectedWords}
        allTags={allTags}
        busy={busy}
        onClose={() => setDialog(null)}
        run={write}
      />
      <WordTagsDialog
        word={editingWord}
        allTags={allTags}
        busy={busy}
        onClose={() => setEditingId(null)}
        onSave={(tags) => {
          if (!editingWord) return
          void write(async () => {
            await setWordTags(editingWord.id, tags)
            return t('tags.saved', { hanzi: editingWord.hanzi })
          })
        }}
      />
      <DuplicatesDialog
        open={dialog === 'duplicates'}
        words={sorted}
        busy={busy}
        onClose={() => setDialog(null)}
        run={write}
      />
      <TagManagerDialog
        open={dialog === 'manageTags'}
        words={sorted}
        busy={busy}
        onClose={() => setDialog(null)}
        run={write}
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
        <p className={styles.strong}>{t('words.cannotUndo')}</p>
      </Dialog>
    </div>
  )
}

const NO_WORDS: Word[] = []
