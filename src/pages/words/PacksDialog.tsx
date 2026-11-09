import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '../../components/Dialog'
import { ReviewReadingNote } from '../../components/ReviewReadingNote'
import { countReviewReading } from '../../io/reviewReading'
import { getInstalledPacks } from '../../db/repos/packs'
import { listWords, type ImportResult } from '../../db/repos/words'
import {
  PACK_STRATEGIES,
  previewImport,
  type DuplicateStrategy,
  type ImportPreview,
} from '../../io/importer'
import {
  formatSize,
  packStatus,
  pickText,
  type InstalledPacks,
  type LevelGuide,
  type PackEntry,
} from '../../io/packs'
import type { ParsedFile } from '../../io/parsed'
import { addPack, fetchPack, fetchPackIndex } from '../../services/packs'
import { addSampleWords, fetchSamples, SAMPLE_STRATEGIES } from '../../services/samples'
import styles from './WordsPage.module.css'

/** 見本として示す単語の数 */
const EXAMPLE_COUNT = 5

interface Props {
  open: boolean
  onClose(): void
  onAdded(name: string, result: ImportResult): void
}

/** 一覧の項目。サンプル単語は同梱のパッケージとして先頭に示す（FR-SMP-04） */
type PackItem = { kind: 'samples' } | { kind: 'pack'; entry: PackEntry }

type IndexState =
  | { status: 'loading' }
  | { status: 'offline' }
  | { status: 'error' }
  | { status: 'ready'; packs: PackEntry[] }

type State =
  | { step: 'list'; error?: string }
  | { step: 'loading'; key: string }
  | { step: 'preview'; item: PackItem; file: ParsedFile; preview: ImportPreview }

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false
const keyOf = (item: PackItem) => (item.kind === 'samples' ? 'samples' : `pack:${item.entry.id}`)

/** 単語パッケージの一覧と追加（仕様書 16.5、FR-WORDS-07） */
export function PacksDialog({ open, onClose, onAdded }: Props) {
  const { t, i18n } = useTranslation()
  const [index, setIndex] = useState<IndexState>({ status: 'loading' })
  const [installed, setInstalled] = useState<InstalledPacks>({})
  const [state, setState] = useState<State>({ step: 'list' })
  const [strategy, setStrategy] = useState<DuplicateStrategy>('tagOnly')
  const [busy, setBusy] = useState(false)
  const [runError, setRunError] = useState('')
  const inputId = useId()

  // 開いたときに一覧を読み込む。オフラインのときは読み込まない（16.5 の「通信と容量の表示」）
  useEffect(() => {
    if (!open) return
    let active = true
    void getInstalledPacks().then((v) => {
      if (active) setInstalled(v)
    })
    const settle = (next: IndexState) => {
      if (active) setIndex(next)
    }
    if (isOffline()) {
      settle({ status: 'offline' })
    } else {
      settle({ status: 'loading' })
      fetchPackIndex().then(
        (packs) => settle({ status: 'ready', packs }),
        () => settle({ status: isOffline() ? 'offline' : 'error' }),
      )
    }
    return () => {
      active = false
    }
  }, [open])

  const nameOf = (item: PackItem) =>
    item.kind === 'samples' ? t('packs.samplesName') : pickText(item.entry.name, i18n.language)

  const reset = () => {
    setState({ step: 'list' })
    setRunError('')
    setBusy(false)
  }

  const close = () => {
    if (busy) return
    reset()
    onClose()
  }

  const choose = async (item: PackItem) => {
    setState({ step: 'loading', key: keyOf(item) })
    setRunError('')
    try {
      const file = item.kind === 'samples' ? await fetchSamples() : await fetchPack(item.entry)
      const preview = previewImport(file, await listWords())
      // 重複の扱いの初期値：パッケージは「タグだけ付ける」、サンプル単語は「インポートしない」
      setStrategy(item.kind === 'samples' ? 'skip' : 'tagOnly')
      setState({ step: 'preview', item, file, preview })
    } catch {
      setState({ step: 'list', error: t('packs.packFailed') })
    }
  }

  /** 追加またはタグを付ける対象の数 */
  const actionable =
    state.step === 'preview'
      ? state.preview.counts.new + (strategy === 'skip' ? 0 : state.preview.counts.duplicate)
      : 0

  const run = async () => {
    if (state.step !== 'preview' || actionable === 0) return
    setBusy(true)
    setRunError('')
    try {
      const { item, file } = state
      const result =
        item.kind === 'samples'
          ? await addSampleWords(file, SAMPLE_STRATEGIES.find((s) => s === strategy) ?? 'skip')
          : await addPack(item.entry, file, strategy)
      const name = nameOf(item)
      reset()
      onAdded(name, result)
    } catch {
      setBusy(false)
      setRunError(t('words.writeFailed'))
    }
  }

  let body
  if (state.step === 'preview') {
    const { item, preview } = state
    const examples = preview.rows.filter((r) => r.word).slice(0, EXAMPLE_COUNT)
    const reviewCount = countReviewReading(preview.rows.map((r) => r.word))
    const strategies = item.kind === 'samples' ? SAMPLE_STRATEGIES : PACK_STRATEGIES
    body = (
      <>
        <p className={styles.fileName}>{nameOf(item)}</p>
        <dl className={styles.counts}>
          <div>
            <dt>{t('io.countNew')}</dt>
            <dd>{preview.counts.new}</dd>
          </div>
          <div>
            <dt>{t('io.countDuplicate')}</dt>
            <dd>{preview.counts.duplicate}</dd>
          </div>
          {preview.counts.error > 0 && (
            <div>
              <dt>{t('io.countError')}</dt>
              <dd>{preview.counts.error}</dd>
            </div>
          )}
        </dl>

        {examples.length > 0 && (
          <section aria-labelledby={`${inputId}-examples`}>
            <h3 id={`${inputId}-examples`} className={styles.duplicateTitle}>
              {t('packs.examples')}
            </h3>
            <ul className={styles.packExamples}>
              {examples.map((row) => (
                <li key={row.position}>
                  <span lang="zh-TW" className={styles.packHanzi}>
                    {row.word?.hanzi}
                  </span>{' '}
                  <span lang="zh-TW" className="muted">
                    {row.word?.pinyin}
                  </span>{' '}
                  <span>{row.word?.meaning}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {item.kind === 'pack' && item.entry.levelGuide && (
          <LevelGuideTable guide={item.entry.levelGuide} language={i18n.language} />
        )}

        {item.kind === 'pack' && (item.entry.license || item.entry.source) && (
          <details className={styles.details}>
            <summary>{t('packs.sourceAndLicense')}</summary>
            {item.entry.source && (
              <p className={styles.packSource}>
                {t('packs.source', { source: item.entry.source })}
              </p>
            )}
            {item.entry.license && (
              <p className={styles.packSource}>
                {t('packs.license', { license: item.entry.license })}
              </p>
            )}
          </details>
        )}

        {preview.counts.duplicate > 0 && (
          <section className={styles.duplicateBox} aria-labelledby={`${inputId}-dup`}>
            <h3 id={`${inputId}-dup`} className={styles.duplicateTitle}>
              {t('io.duplicateFound', { count: preview.counts.duplicate })}
            </h3>
            <fieldset className={styles.choices}>
              <legend>{t('io.duplicates')}</legend>
              {strategies.map((s) => (
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

        {reviewCount > 0 && <ReviewReadingNote count={reviewCount} />}
        {actionable === 0 && <p>{t('packs.nothing')}</p>}
        {runError && (
          <p className={styles.error} role="alert">
            {runError}
          </p>
        )}
      </>
    )
  } else {
    const loadingKey = state.step === 'loading' ? state.key : null
    const items: PackItem[] = [
      { kind: 'samples' },
      ...(index.status === 'ready'
        ? index.packs.map((entry): PackItem => ({ kind: 'pack', entry }))
        : []),
    ]
    body = (
      <>
        <p>{t('packs.intro')}</p>
        <ul className={styles.packList}>
          {items.map((item) => {
            const key = keyOf(item)
            const status = item.kind === 'pack' ? packStatus(item.entry, installed) : null
            const meta =
              item.kind === 'samples'
                ? t('packs.bundled')
                : [
                    t('packs.wordCount', {
                      count: item.entry.wordCount,
                      formatted: item.entry.wordCount.toLocaleString(i18n.language),
                    }),
                    t('packs.size', formatSize(item.entry.size)),
                  ].join(' · ')
            return (
              <li key={key} className={styles.packItem}>
                <div className={styles.packText}>
                  <p className={styles.packName}>
                    <span>{nameOf(item)}</span>
                    {status === 'installed' && (
                      <span className={styles.packBadge}>{t('packs.installed')}</span>
                    )}
                    {status === 'updateAvailable' && (
                      <span className={`${styles.packBadge} ${styles.packBadgeUpdate}`}>
                        {t('packs.updateAvailable')}
                      </span>
                    )}
                  </p>
                  <p className={styles.packDescription}>
                    {item.kind === 'samples'
                      ? t('packs.samplesDescription')
                      : pickText(item.entry.description, i18n.language)}
                  </p>
                  {/* 対象の試験や級がひと目でわかるよう、パッケージのタグを示す（16.5） */}
                  {item.kind === 'pack' && item.entry.tags.length > 0 && (
                    <ul className={styles.packTags} aria-label={t('packs.tags')}>
                      {item.entry.tags.map((tag) => (
                        <li key={tag}>{tag}</li>
                      ))}
                    </ul>
                  )}
                  <p className={styles.packMeta}>{meta}</p>
                </div>
                <button
                  type="button"
                  className="button"
                  disabled={loadingKey !== null}
                  aria-label={t('packs.chooseNamed', { name: nameOf(item) })}
                  onClick={() => void choose(item)}
                >
                  {loadingKey === key ? t('common.loading') : t('packs.choose')}
                </button>
              </li>
            )
          })}
        </ul>
        {index.status === 'loading' && <p className="muted">{t('common.loading')}</p>}
        {index.status === 'offline' && <p className={styles.warning}>{t('packs.offline')}</p>}
        {index.status === 'error' && (
          <p className={styles.error} role="alert">
            {t('packs.loadFailed')}
          </p>
        )}
        {index.status === 'ready' && index.packs.length === 0 && (
          <p className="muted">{t('packs.empty')}</p>
        )}
        {index.status !== 'offline' && <p className="muted">{t('packs.network')}</p>}
        {state.step === 'list' && state.error && (
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
      title={t('packs.title')}
      onClose={close}
      actions={
        state.step === 'preview' ? (
          <>
            <button type="button" className="button" disabled={busy} onClick={reset}>
              {t('packs.back')}
            </button>
            <button
              type="button"
              className="button button--primary"
              disabled={busy || actionable === 0}
              onClick={() => void run()}
            >
              {busy ? t('packs.adding') : t('packs.run', { count: actionable })}
            </button>
          </>
        ) : (
          <button type="button" className="button" disabled={busy} onClick={close}>
            {t('packs.close')}
          </button>
        )
      }
    >
      {body}
    </Dialog>
  )
}

/** 級の対応表（16.5 の levelGuide）。このパッケージに収めている級を目立たせる */
function LevelGuideTable({ guide, language }: { guide: LevelGuide; language: string }) {
  const { t } = useTranslation()
  const titleId = useId()
  const col = (key: keyof LevelGuide['columns']) => pickText(guide.columns[key], language)
  return (
    <section aria-labelledby={titleId}>
      <h3 id={titleId} className={styles.duplicateTitle}>
        {pickText(guide.title, language)}
      </h3>
      <div className={styles.guideTableWrap}>
        <table className={`${styles.guideTable} ${styles.levelTable}`}>
          <thead>
            <tr>
              <th scope="col">{col('tocfl')}</th>
              <th scope="col">{col('cefr')}</th>
              <th scope="col">{col('listening')}</th>
              <th scope="col">{col('reading')}</th>
            </tr>
          </thead>
          <tbody>
            {guide.rows.map((row, i) => (
              <tr key={i} className={row.inPack ? styles.levelInPack : undefined}>
                <th scope="row">
                  {pickText(row.tocfl, language)}
                  {row.inPack && <span className={styles.packBadge}>{t('packs.inPack')}</span>}
                  {row.tag && <span className={styles.levelTag}>{row.tag}</span>}
                </th>
                <td>{row.cefr || '—'}</td>
                <td>{row.listening}</td>
                <td>{row.reading}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pickText(guide.note, language) && (
        <p className={styles.packSource}>{pickText(guide.note, language)}</p>
      )}
      {guide.source && (
        <p className={styles.packSource}>{t('packs.source', { source: guide.source })}</p>
      )}
    </section>
  )
}
