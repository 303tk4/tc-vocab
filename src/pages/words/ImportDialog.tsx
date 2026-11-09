import { useId, useState, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '../../components/Dialog'
import { importWords, listWords, type ImportResult } from '../../db/repos/words'
import {
  isValidExtraTag,
  previewImport,
  strategiesFor,
  type DuplicateStrategy,
  type ImportPreview,
} from '../../io/importer'
import { ImportFileError, type ParsedFile } from '../../io/parsed'
import { readImportFile } from '../../io/readFile'
import { tagError, type ValidationError } from '../../io/validate'
import { ReviewReadingNote } from '../../components/ReviewReadingNote'
import { countReviewReading } from '../../io/reviewReading'
import { CsvGuide } from './CsvGuide'
import styles from './WordsPage.module.css'

/** 一覧に表示する件数の上限（多すぎると画面が重くなるため） */
const LIST_LIMIT = 50

interface Props {
  open: boolean
  onClose(): void
  onImported(result: ImportResult): void
}

type State =
  | { step: 'pick'; error?: string; errorCode?: string }
  | { step: 'reading' }
  | { step: 'preview'; fileName: string; file: ParsedFile; preview: ImportPreview }

/** 既にある単語と重複したときの説明（FR-IO-09・FR-IO-03） */
function DuplicateGuide() {
  const { t } = useTranslation()
  return (
    <details className={styles.guide}>
      <summary>{t('io.guide.dup.title')}</summary>
      <p>{t('io.guide.dup.rule')}</p>
      <p>{t('io.guide.dup.preview')}</p>
      <ul className={styles.guideNotes}>
        {strategiesFor('csv').map((s) => (
          <li key={s}>
            <strong>{t(`io.strategies.${s}`)}</strong>：{t(`io.strategyNotes.${s}`)}
          </li>
        ))}
      </ul>
      <p className="muted">{t('io.guide.dup.overwrite')}</p>
    </details>
  )
}

export function ImportDialog({ open, onClose, onImported }: Props) {
  const { t } = useTranslation()
  const [state, setState] = useState<State>({ step: 'pick' })
  const [strategy, setStrategy] = useState<DuplicateStrategy>('skip')
  const [extraTag, setExtraTag] = useState('')
  const [busy, setBusy] = useState(false)
  const [runError, setRunError] = useState('')
  const [dragging, setDragging] = useState(false)
  /** 上書きの確認を表示中（FR-IO-03。誤操作を防ぐ） */
  const [confirmingOverwrite, setConfirmingOverwrite] = useState(false)
  const inputId = useId()

  const reset = () => {
    setConfirmingOverwrite(false)
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
      setState({
        step: 'pick',
        error: message,
        errorCode: e instanceof ImportFileError ? e.code : undefined,
      })
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

  const overwriteCount =
    state.step === 'preview' && strategy === 'overwrite' ? state.preview.counts.duplicate : 0

  const run = async () => {
    if (state.step !== 'preview' || importable === 0 || !tagValid) return
    // 上書きは元に戻せないため、先に確認する（FR-IO-03）
    if (overwriteCount > 0 && !confirmingOverwrite) {
      setConfirmingOverwrite(true)
      return
    }
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
  if (state.step === 'preview' && confirmingOverwrite) {
    body = (
      <>
        <p className={styles.fileName}>{state.fileName}</p>
        <div className={styles.warning} role="alert">
          <p className={styles.strong}>{t('io.overwriteConfirm', { count: overwriteCount })}</p>
          <p>{t('io.overwriteDetail')}</p>
        </div>
        <p className={styles.strong}>{t('words.cannotUndo')}</p>
        {runError && (
          <p className={styles.error} role="alert">
            {runError}
          </p>
        )}
      </>
    )
  } else if (state.step === 'preview') {
    const { preview, file } = state
    const errors = preview.rows.filter((r) => r.status === 'error')
    const duplicates = preview.rows.filter((r) => r.status === 'duplicate')
    const reviewCount = countReviewReading(preview.rows.map((r) => r.word))
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
        {file.ignoredColumns && file.ignoredColumns.length > 0 && (
          <div className={styles.warning}>
            <p>{t('io.ignoredColumns', { columns: file.ignoredColumns.join(', ') })}</p>
            {file.columnHints && file.columnHints.length > 0 && (
              <p>{t('io.columnHints', { hints: file.columnHints.join(', ') })}</p>
            )}
          </div>
        )}
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
          <section className={styles.duplicateBox} aria-labelledby={`${inputId}-dup`}>
            <h3 id={`${inputId}-dup`} className={styles.duplicateTitle}>
              {t('io.duplicateFound', { count: duplicates.length })}
            </h3>
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
            {/* 重複した単語の扱い（FR-IO-03）。選択肢ごとに短い説明を添える */}
            <fieldset className={styles.choices}>
              <legend>{t('io.duplicates')}</legend>
              {strategiesFor(file.kind).map((s) => (
                <label key={s} className={styles.choice}>
                  <input
                    type="radio"
                    name={`${inputId}-strategy`}
                    value={s}
                    checked={strategy === s}
                    onChange={() => setStrategy(s)}
                  />
                  <span>
                    <span className={styles.choiceName}>{t(`io.strategies.${s}`)}</span>
                    <span className={styles.choiceNote}>{t(`io.strategyNotes.${s}`)}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          </section>
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

        {reviewCount > 0 && <ReviewReadingNote count={reviewCount} />}
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
        <p>{t('io.lead')}</p>
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
              accept=".csv,.json,.tsv,.txt,text/csv,application/json,text/tab-separated-values,text/plain"
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
        {/* 文字コードの誤りや Excel のファイルのときは、保存方法の案内を開く（FR-IO-09） */}
        <CsvGuide
          saveGuideOpen={
            state.step === 'pick' &&
            (state.errorCode === 'invalidEncoding' || state.errorCode === 'spreadsheet')
          }
        />
        <DuplicateGuide />
      </>
    )
  }

  return (
    <Dialog
      open={open}
      title={t('io.importTitle')}
      onClose={close}
      actions={
        state.step === 'preview' && confirmingOverwrite ? (
          <>
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={() => setConfirmingOverwrite(false)}
            >
              {t('io.back')}
            </button>
            <button
              type="button"
              className={`button ${styles.dangerButton}`}
              disabled={busy}
              onClick={() => void run()}
            >
              {busy ? t('io.importing') : t('io.overwriteRun', { count: importable })}
            </button>
          </>
        ) : state.step === 'preview' ? (
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
