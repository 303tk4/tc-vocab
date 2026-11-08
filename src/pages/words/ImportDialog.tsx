import { useId, useState, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '../../components/Dialog'
import { SegmentedControl } from '../../components/SegmentedControl'
import { importWords, listWords, type ImportResult } from '../../db/repos/words'
import {
  DUPLICATE_STRATEGIES,
  isValidExtraTag,
  previewImport,
  type DuplicateStrategy,
  type ImportPreview,
} from '../../io/importer'
import { ImportFileError, type ParsedFile } from '../../io/parsed'
import { readImportFile } from '../../io/readFile'
import { tagError, type ValidationError } from '../../io/validate'
import styles from './WordsPage.module.css'

/** 一覧に表示する件数の上限（多すぎると画面が重くなるため） */
const LIST_LIMIT = 50

interface Props {
  open: boolean
  onClose(): void
  onImported(result: ImportResult): void
}

type State =
  | { step: 'pick'; error?: string }
  | { step: 'reading' }
  | { step: 'preview'; fileName: string; file: ParsedFile; preview: ImportPreview }

export function ImportDialog({ open, onClose, onImported }: Props) {
  const { t } = useTranslation()
  const [state, setState] = useState<State>({ step: 'pick' })
  const [strategy, setStrategy] = useState<DuplicateStrategy>('skip')
  const [extraTag, setExtraTag] = useState('')
  const [busy, setBusy] = useState(false)
  const [runError, setRunError] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputId = useId()

  const reset = () => {
    setState({ step: 'pick' })
    setStrategy('skip')
    setExtraTag('')
    setRunError('')
    setBusy(false)
  }

  const close = () => {
    if (busy) return
    reset()
    onClose()
  }

  const handleFile = async (picked: File | undefined) => {
    if (!picked) return
    setState({ step: 'reading' })
    setRunError('')
    try {
      const file = await readImportFile(picked)
      const preview = previewImport(file, await listWords())
      setState({ step: 'preview', fileName: picked.name, file, preview })
    } catch (e) {
      const message =
        e instanceof ImportFileError ? t(`io.fatal.${e.code}`, e.params) : t('io.fatal.readFailed')
      setState({ step: 'pick', error: message })
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    void handleFile(e.dataTransfer.files[0])
  }

  const tagValid = isValidExtraTag(extraTag)
  const tagProblem = tagValid ? null : tagError(extraTag)
  const importable =
    state.step === 'preview'
      ? state.preview.counts.new + (strategy === 'skip' ? 0 : state.preview.counts.duplicate)
      : 0

  const run = async () => {
    if (state.step !== 'preview' || importable === 0 || !tagValid) return
    setBusy(true)
    setRunError('')
    try {
      const result = await importWords(state.file, { strategy, extraTag })
      reset()
      onImported(result)
    } catch {
      setBusy(false)
      setRunError(t('words.writeFailed'))
    }
  }

  const formatError = (e: ValidationError) =>
    t(`io.errors.${e.code}`, { field: t(`io.fields.${e.field}`), max: e.max })

  const position = (kind: ParsedFile['kind'], n: number) =>
    kind === 'json' ? t('io.positionJson', { index: n }) : t('io.positionCsv', { line: n })

  let body
  if (state.step === 'preview') {
    const { preview, file } = state
    const errors = preview.rows.filter((r) => r.status === 'error')
    const duplicates = preview.rows.filter((r) => r.status === 'duplicate')
    body = (
      <>
        <p className={styles.fileName}>{state.fileName}</p>
        <dl className={styles.counts}>
          <div>
            <dt>{t('io.countNew')}</dt>
            <dd>{preview.counts.new}</dd>
          </div>
          <div>
            <dt>{t('io.countDuplicate')}</dt>
            <dd>{preview.counts.duplicate}</dd>
          </div>
          <div>
            <dt>{t('io.countError')}</dt>
            <dd>{preview.counts.error}</dd>
          </div>
        </dl>
        {file.progress.length > 0 && (
          <p className="muted">{t('io.progressCount', { count: file.progress.length })}</p>
        )}

        {errors.length > 0 && (
          <details className={styles.details} open>
            <summary>{t('io.errorsTitle')}</summary>
            <ul className={styles.issueList}>
              {errors.slice(0, LIST_LIMIT).map((row) => (
                <li key={row.position}>
                  <strong>{position(file.kind, row.position)}</strong>{' '}
                  {row.errors.map(formatError).join(' / ')}
                </li>
              ))}
            </ul>
            {errors.length > LIST_LIMIT && (
              <p className="muted">{t('io.more', { count: errors.length - LIST_LIMIT })}</p>
            )}
          </details>
        )}

        {duplicates.length > 0 && (
          <>
            <details className={styles.details}>
              <summary>{t('io.duplicatesTitle')}</summary>
              <ul className={styles.issueList}>
                {duplicates.slice(0, LIST_LIMIT).map((row) => (
                  <li key={row.position}>
                    <strong>{position(file.kind, row.position)}</strong>{' '}
                    <span lang="zh-TW">
                      {row.word?.hanzi} {row.word?.pinyin}
                    </span>
                  </li>
                ))}
              </ul>
              {duplicates.length > LIST_LIMIT && (
                <p className="muted">{t('io.more', { count: duplicates.length - LIST_LIMIT })}</p>
              )}
            </details>
            <SegmentedControl<DuplicateStrategy>
              label={t('io.duplicates')}
              value={strategy}
              options={DUPLICATE_STRATEGIES.map((s) => ({
                value: s,
                label: t(`io.strategies.${s}`),
              }))}
              onChange={setStrategy}
            />
          </>
        )}

        <div className={styles.field}>
          <label htmlFor={`${inputId}-tag`}>{t('io.extraTag')}</label>
          <input
            id={`${inputId}-tag`}
            className={styles.input}
            value={extraTag}
            placeholder={t('io.extraTagPlaceholder')}
            aria-invalid={!tagValid}
            onChange={(e) => setExtraTag(e.target.value)}
          />
          {tagProblem && <p className={styles.error}>{t(`tags.errors.${tagProblem}`)}</p>}
        </div>

        {importable === 0 && <p>{t('io.nothingToImport')}</p>}
        {runError && (
          <p className={styles.error} role="alert">
            {runError}
          </p>
        )}
      </>
    )
  } else {
    body = (
      <>
        <div
          className={styles.dropzone}
          data-dragging={dragging}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <p>{t('io.dropHere')}</p>
          <label className="button button--primary">
            {t('io.chooseFile')}
            <input
              type="file"
              className="visually-hidden"
              accept=".json,.csv,application/json,text/csv"
              disabled={state.step === 'reading'}
              onChange={(e) => {
                void handleFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </label>
          <p className="muted">{t('io.fileHint')}</p>
        </div>
        {state.step === 'reading' && <p role="status">{t('common.loading')}</p>}
        {state.step === 'pick' && state.error && (
          <p className={styles.error} role="alert">
            {state.error}
          </p>
        )}
      </>
    )
  }

  return (
    <Dialog
      open={open}
      title={t('io.importTitle')}
      onClose={close}
      actions={
        state.step === 'preview' ? (
          <>
            <button type="button" className="button" disabled={busy} onClick={reset}>
              {t('io.chooseAnother')}
            </button>
            <button
              type="button"
              className="button button--primary"
              disabled={busy || importable === 0 || !tagValid}
              onClick={() => void run()}
            >
              {busy ? t('io.importing') : t('io.run', { count: importable })}
            </button>
          </>
        ) : (
          <button type="button" className="button" onClick={close}>
            {t('common.cancel')}
          </button>
        )
      }
    >
      {body}
    </Dialog>
  )
}
