import { useEffect, useId, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Dialog } from '../../components/Dialog'
import { ReviewReadingNote } from '../../components/ReviewReadingNote'
import { countReviewReading } from '../../io/reviewReading'
import { getInstalledPacks } from '../../db/repos/packs'
import { countWordsWithAnyTag, listWords, type ImportResult } from '../../db/repos/words'
import {
  PACK_STRATEGIES,
  previewImport,
  type DuplicateStrategy,
  type ImportPreview,
} from '../../io/importer'
import {
  formatSize,
  meaningLanguageName,
  packStatus,
  presenceTagsOf,
  packDescription,
  pickText,
  sortByMeaningLanguage,
  type InstalledPacks,
  type LevelGuide,
  type PackEntry,
  type PackStatus,
} from '../../io/packs'
import type { ParsedFile } from '../../io/parsed'
import { addPack, fetchPack, fetchPackIndex } from '../../services/packs'
import {
  addSampleWords,
  fetchSamples,
  SAMPLE_LANGUAGES,
  SAMPLE_STRATEGIES,
  SAMPLE_TAG,
  type SampleLanguage,
} from '../../services/samples'
import styles from './WordsPage.module.css'

/** 見本として示す単語の数 */
const EXAMPLE_COUNT = 5

interface Props {
  open: boolean
  onClose(): void
  onAdded(name: string, result: ImportResult): void
}

/**
 * 一覧の項目。サンプル単語は同梱のパッケージとして、意味の言語ごと（日本語版・英語版）に先頭に示す
 * （FR-SMP-04）
 */
type PackItem = { kind: 'samples'; language: SampleLanguage } | { kind: 'pack'; entry: PackEntry }

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
const keyOf = (item: PackItem) =>
  item.kind === 'samples' ? `samples:${item.language}` : `pack:${item.entry.id}`
/** 登録中の単語の数の記録のキー。サンプル単語はどの版も `sample` タグで数える（仕様書 11章） */
const countKeyOf = (item: PackItem) => (item.kind === 'samples' ? 'samples' : keyOf(item))
/** 意味の言語（仕様書 16.5）。サンプル単語は版の言語 */
const meaningOf = (item: PackItem) =>
  item.kind === 'samples' ? item.language : item.entry.meaningLanguage

/** 単語集の説明文。意味の言語で示し、lang を付ける（16.5） */
function PackDescription({ entry, uiLanguage }: { entry: PackEntry; uiLanguage: string }) {
  const { text, lang } = packDescription(entry, uiLanguage)
  return (
    <p className={styles.packDescription} lang={lang}>
      {text}
    </p>
  )
}

/** 「意味の表記：English」の表示（16.5）。言語名はその言語自身での名前で示す */
function MeaningLanguage({ language }: { language: string }) {
  return (
    <Trans
      i18nKey="packs.meaningLanguage"
      values={{ language: meaningLanguageName(language) }}
      components={[<span key="language" lang={language} />]}
    />
  )
}

/** 単語パッケージの一覧と追加（仕様書 16.5、FR-WORDS-07） */
export function PacksDialog({ open, onClose, onAdded }: Props) {
  const { t, i18n } = useTranslation()
  const [index, setIndex] = useState<IndexState>({ status: 'loading' })
  const [installed, setInstalled] = useState<InstalledPacks>({})
  /** 各項目のタグが付いた、登録中の単語の数（keyOf → 数）。追加済みかを実際の単語で判断する（16.5） */
  const [present, setPresent] = useState<Record<string, number>>({})
  /** 上書きの確認を表示中（元に戻せないため。16.5） */
  const [confirmingOverwrite, setConfirmingOverwrite] = useState(false)
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
    const count = (key: string, tags: readonly string[]) =>
      void countWordsWithAnyTag(tags).then((n) => {
        if (active) setPresent((prev) => ({ ...prev, [key]: n }))
      })
    count('samples', [SAMPLE_TAG])
    const settle = (next: IndexState) => {
      if (!active) return
      setIndex(next)
      if (next.status === 'ready') {
        for (const entry of next.packs) count(keyOf({ kind: 'pack', entry }), presenceTagsOf(entry))
      }
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

  /** 意味の言語を添えた名前。同じ名前の言語違い（サンプル単語の日本語版と英語版など）を区別する */
  const labelOf = (item: PackItem) => {
    const language = meaningOf(item)
    return language
      ? t('packs.nameWithLanguage', { name: nameOf(item), language: meaningLanguageName(language) })
      : nameOf(item)
  }

  const reset = () => {
    setConfirmingOverwrite(false)
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
      const file =
        item.kind === 'samples' ? await fetchSamples(item.language) : await fetchPack(item.entry)
      const preview = previewImport(file, await listWords())
      // 重複の扱いの初期値：パッケージは「タグだけ付ける」、サンプル単語は「インポートしない」
      setStrategy(item.kind === 'samples' ? 'skip' : 'tagOnly')
      setConfirmingOverwrite(false)
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

  const overwriteCount =
    state.step === 'preview' && strategy === 'overwrite' ? state.preview.counts.duplicate : 0

  const run = async () => {
    if (state.step !== 'preview' || actionable === 0) return
    // 単語集の内容に戻すのは取り消せないため、先に確認する（16.5）
    if (overwriteCount > 0 && !confirmingOverwrite) {
      setConfirmingOverwrite(true)
      return
    }
    setBusy(true)
    setRunError('')
    try {
      const { item, file } = state
      const result =
        item.kind === 'samples'
          ? await addSampleWords(
              item.language,
              file,
              SAMPLE_STRATEGIES.find((s) => s === strategy) ?? 'skip',
            )
          : await addPack(item.entry, file, strategy)
      const name = item.kind === 'samples' ? labelOf(item) : nameOf(item)
      reset()
      onAdded(name, result)
    } catch {
      setBusy(false)
      setRunError(t('words.writeFailed'))
    }
  }

  let body
  if (state.step === 'preview' && confirmingOverwrite) {
    body = (
      <>
        <p className={styles.fileName}>{nameOf(state.item)}</p>
        <div className={styles.warning} role="alert">
          <p className={styles.strong}>{t('packs.overwriteConfirm', { count: overwriteCount })}</p>
          <p>{t('packs.overwriteDetail')}</p>
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
    const { item, preview } = state
    const examples = preview.rows.filter((r) => r.word).slice(0, EXAMPLE_COUNT)
    const reviewCount = countReviewReading(preview.rows.map((r) => r.word))
    const strategies = item.kind === 'samples' ? SAMPLE_STRATEGIES : PACK_STRATEGIES
    const language = meaningOf(item)
    body = (
      <>
        <p className={styles.fileName}>{nameOf(item)}</p>
        {language && (
          <p className={styles.packMeta}>
            <MeaningLanguage language={language} />
          </p>
        )}
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
                    {/* 単語集の「上書き」は、元の内容に戻す操作として示す */}
                    <span className={styles.choiceName}>
                      {s === 'overwrite' ? t('packs.overwrite') : t(`io.strategies.${s}`)}
                    </span>
                    <span className={styles.choiceNote}>
                      {s === 'overwrite' ? t('packs.overwriteNote') : t(`io.strategyNotes.${s}`)}
                    </span>
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
    // UI 言語と同じ意味の言語の単語集を先に並べ、無ければ英語を先にする（16.5「意味の言語」）。
    // サンプル単語は意味の言語にかかわらず先頭に置く（FR-SMP-04）
    const samples = sortByMeaningLanguage(
      SAMPLE_LANGUAGES.map((language) => ({ language, meaningLanguage: language })),
      i18n.language,
    )
    const items: PackItem[] = [
      ...samples.map(({ language }): PackItem => ({ kind: 'samples', language })),
      ...(index.status === 'ready'
        ? sortByMeaningLanguage(index.packs, i18n.language).map((entry): PackItem => ({
            kind: 'pack',
            entry,
          }))
        : []),
    ]
    body = (
      <>
        <p>{t('packs.intro')}</p>
        <ul className={styles.packList}>
          {items.map((item) => {
            const key = keyOf(item)
            // 追加済みのものも一覧に残し、印を付けて、もう一度選べるようにする（16.5）
            const count = present[countKeyOf(item)] ?? 0
            const language = meaningOf(item)
            const status: PackStatus =
              item.kind === 'pack'
                ? packStatus(item.entry, installed, count)
                : count > 0
                  ? 'installed'
                  : 'notInstalled'
            const action =
              status === 'notInstalled'
                ? t('packs.choose')
                : status === 'updateAvailable'
                  ? t('packs.chooseUpdate')
                  : t('packs.chooseAgain')
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
                    {status === 'partial' && item.kind === 'pack' && (
                      <span className={styles.packBadge}>
                        {t('packs.partial', {
                          present: count.toLocaleString(i18n.language),
                          total: item.entry.wordCount.toLocaleString(i18n.language),
                        })}
                      </span>
                    )}
                    {status === 'updateAvailable' && (
                      <span className={`${styles.packBadge} ${styles.packBadgeUpdate}`}>
                        {t('packs.updateAvailable')}
                      </span>
                    )}
                  </p>
                  {language && (
                    <p className={styles.packMeta}>
                      <MeaningLanguage language={language} />
                    </p>
                  )}
                  {/* 説明文は意味の言語で示す（16.5・FR-SMP-04）。名前だけが UI 言語に合わせる */}
                  {item.kind === 'samples' ? (
                    <p className={styles.packDescription} lang={item.language}>
                      {t('packs.samplesDescription', { tag: SAMPLE_TAG, lng: item.language })}
                    </p>
                  ) : (
                    <PackDescription entry={item.entry} uiLanguage={i18n.language} />
                  )}
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
                <div className={styles.packAction}>
                  <button
                    type="button"
                    className="button"
                    disabled={loadingKey !== null}
                    aria-label={t('packs.chooseNamed', { action, name: labelOf(item) })}
                    aria-describedby={status === 'notInstalled' ? undefined : `${inputId}-${key}`}
                    onClick={() => void choose(item)}
                  >
                    {loadingKey === key ? t('common.loading') : action}
                  </button>
                  {/* もう一度追加しても学習の進捗は消えないことを示す（16.5） */}
                  {status !== 'notInstalled' && (
                    <p id={`${inputId}-${key}`} className={styles.packKeepNote}>
                      {t('packs.keepProgress')}
                    </p>
                  )}
                </div>
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
              {busy ? t('packs.adding') : t('packs.overwriteRun', { count: actionable })}
            </button>
          </>
        ) : state.step === 'preview' ? (
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
