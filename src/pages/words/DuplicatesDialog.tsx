// 重複単語の整理（FR-WORDS-13、仕様書 4.5 の統合の規則）
import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogActions } from '../../components/Dialog'
import { listProgressForWords, mergeDuplicateGroups } from '../../db/repos/words'
import { findDuplicateGroups, mergeWords, type MergeOverflow } from '../../io/duplicates'
import type { Progress, Word } from '../../types/word'
import type { RunWrite } from './TagDialogs'
import styles from './WordsPage.module.css'

/** 一度に表示する組の数の上限（選択と統合は全件が対象） */
const SHOW_LIMIT = 100

interface Props {
  open: boolean
  words: readonly Word[]
  busy: boolean
  onClose(): void
  run: RunWrite
}

interface Candidate {
  /** 組の識別子（残す単語の id） */
  key: string
  words: Word[]
  merged: Word | null
  overflow: MergeOverflow | null
}

export function DuplicatesDialog({ open, words, busy, onClose, run }: Props) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} title={t('dup.title')} onClose={onClose}>
      {open && <Body words={words} busy={busy} onClose={onClose} run={run} />}
    </Dialog>
  )
}

function Body({ words, busy, onClose, run }: Omit<Props, 'open'>) {
  const { t, i18n } = useTranslation()
  const [step, setStep] = useState<'list' | 'confirm'>('list')
  /** 選択を外した組。初期値はすべて選択 */
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set())

  const candidates = useMemo<Candidate[]>(() => {
    // 統合後の内容の表示用（更新日時は表示しないため 0 でよい。保存時に改めて計算する）
    return findDuplicateGroups(words).map((group) => {
      const result = mergeWords(group, 0)
      return {
        key: group[0].id,
        words: group,
        merged: result.ok ? result.word : null,
        overflow: result.ok ? null : result.overflow,
      }
    })
  }, [words])
  const mergeable = candidates.filter((c) => c.merged)
  const manual = candidates.filter((c) => !c.merged)
  const selected = mergeable.filter((c) => !excluded.has(c.key))
  const selectedWordCount = selected.reduce((n, c) => n + c.words.length, 0)

  // 学習記録の有無と最終学習日を示すため、組の単語の進捗を読む（仕様書 4.5）
  const ids = useMemo(() => candidates.flatMap((c) => c.words.map((w) => w.id)), [candidates])
  const progress = useLiveQuery(() => listProgressForWords(ids), [ids], [] as Progress[])
  const lastStudied = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of progress) map.set(p.wordId, Math.max(map.get(p.wordId) ?? 0, p.updatedAt))
    return map
  }, [progress])

  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' })

  const toggle = (key: string) =>
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  const allSelected = selected.length === mergeable.length
  const toggleAll = () =>
    setExcluded(allSelected ? new Set(mergeable.map((c) => c.key)) : new Set())

  const merge = () =>
    run(async () => {
      const r = await mergeDuplicateGroups(selected.map((c) => c.words.map((w) => w.id)))
      return [
        t('dup.done', { merged: r.merged, removed: r.removed }),
        r.skipped > 0 ? t('dup.doneSkipped', { count: r.skipped }) : '',
      ]
        .filter(Boolean)
        .join(' ')
    })

  const rules = (
    <ul className={styles.ruleList}>
      <li>
        <strong>{t('dup.rules.readingLabel')}</strong> {t('dup.rules.reading')}
      </li>
      <li>
        <strong>{t('dup.rules.progressLabel')}</strong> {t('dup.rules.progress')}
      </li>
      <li>
        <strong>{t('dup.rules.contentLabel')}</strong> {t('dup.rules.content')}
      </li>
    </ul>
  )

  const actions = (children: ReactNode) => <DialogActions>{children}</DialogActions>

  if (candidates.length === 0) {
    return (
      <>
        <p>{t('dup.none')}</p>
        {actions(
          <button type="button" className="button" onClick={onClose}>
            {t('common.close')}
          </button>,
        )}
      </>
    )
  }

  if (step === 'confirm') {
    return (
      <>
        <p className={styles.strong}>
          {t('dup.confirm', { groups: selected.length, words: selectedWordCount })}
        </p>
        <section className={styles.ruleBox} aria-label={t('dup.rules.title')}>
          <h3 className={styles.duplicateTitle}>{t('dup.rules.title')}</h3>
          {rules}
        </section>
        <p className={styles.strong}>{t('dup.cannotUndo')}</p>
        {actions(
          <>
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={() => setStep('list')}
            >
              {t('dup.back')}
            </button>
            <button
              type="button"
              className="button button--primary"
              disabled={busy}
              onClick={() => void merge()}
            >
              {t('dup.mergeNow', { count: selected.length })}
            </button>
          </>,
        )}
      </>
    )
  }

  return (
    <>
      <p>{t('dup.intro')}</p>
      <section className={styles.ruleBox} aria-labelledby="dup-rules">
        <h3 id="dup-rules" className={styles.duplicateTitle}>
          {t('dup.rules.title')}
        </h3>
        {rules}
      </section>

      {mergeable.length > 0 && (
        <>
          <label className={styles.checkbox}>
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            {t('dup.selectAll', { count: mergeable.length })}
          </label>
          <ul className={styles.groupList}>
            {mergeable.slice(0, SHOW_LIMIT).map((c) => (
              <li key={c.key} className={styles.group}>
                <label className={styles.groupHead}>
                  <input
                    type="checkbox"
                    checked={!excluded.has(c.key)}
                    onChange={() => toggle(c.key)}
                  />
                  <span lang="zh-TW" className={styles.groupHanzi}>
                    {c.words[0].hanzi}
                  </span>
                  <span className="muted">{t('dup.wordCount', { count: c.words.length })}</span>
                </label>
                <ol className={styles.groupWords}>
                  {c.words.map((w, i) => (
                    <li key={w.id}>
                      <span className={styles.groupMeta}>
                        {i === 0 && <span className={styles.keepBadge}>{t('dup.keep')}</span>}
                        {t('dup.registered', { date: date.format(w.createdAt) })}
                        {' · '}
                        {lastStudied.has(w.id)
                          ? t('dup.studied', { date: date.format(lastStudied.get(w.id)) })
                          : t('dup.notStudied')}
                      </span>
                      <span lang="zh-TW">{[w.zhuyin, w.pinyin].filter(Boolean).join(' · ')}</span>{' '}
                      <span>{w.meaning}</span>
                    </li>
                  ))}
                </ol>
                {c.merged && (
                  <p className={styles.groupResult}>
                    <span className={styles.groupResultLabel}>{t('dup.after')}</span>{' '}
                    <span lang="zh-TW">
                      {[c.merged.zhuyin, c.merged.pinyin].filter(Boolean).join(' · ')}
                    </span>{' '}
                    {c.merged.meaning}
                    {c.merged.tags.length > 0 && ` · ${c.merged.tags.join(', ')}`}
                    {c.merged.examples.length > 0 &&
                      ` · ${t('dup.examples', { count: c.merged.examples.length })}`}
                  </p>
                )}
              </li>
            ))}
          </ul>
          {mergeable.length > SHOW_LIMIT && (
            <p className="muted">{t('dup.more', { count: mergeable.length - SHOW_LIMIT })}</p>
          )}
        </>
      )}

      {manual.length > 0 && (
        <details className={styles.details}>
          <summary>{t('dup.manualTitle', { count: manual.length })}</summary>
          <ul className={styles.issueList}>
            {manual.map((c) => (
              <li key={c.key}>
                <span lang="zh-TW">{c.words[0].hanzi}</span> {t(`dup.overflow.${c.overflow}`)}
              </li>
            ))}
          </ul>
        </details>
      )}

      {actions(
        <>
          <button type="button" className="button" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="button button--primary"
            disabled={selected.length === 0}
            onClick={() => setStep('confirm')}
          >
            {t('dup.mergeSelected', { count: selected.length })}
          </button>
        </>,
      )}
    </>
  )
}
