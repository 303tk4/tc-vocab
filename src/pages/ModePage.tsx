import { useLiveQuery } from 'dexie-react-hooks'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import { BackIcon } from '../components/icons'
import { TagChips } from '../components/TagChips'
import { addSessionRecord, createProgressStore } from '../db/repos/progress'
import { createModeSettingsStore, getSetting, setSetting } from '../db/repos/settings'
import { setWordTags } from '../db/repos/tags'
import { listTags, listWords } from '../db/repos/words'
import { modeNamespace } from '../i18n'
import { getMode } from '../modes/registry'
import type { AnyStudyMode, CoreServices, SessionResult } from '../modes/types'
import { canSpeak, speak } from '../services/speech'
import { useSettings } from '../settings/context'
import type { Word } from '../types/word'
import styles from './ModePage.module.css'

export function ModePage() {
  const { modeId = '' } = useParams()
  const { t } = useTranslation()
  const mode = getMode(modeId)

  if (!mode) {
    return (
      <div className="stack">
        <p>{t('mode.notFound')}</p>
        <Link to="/" className="button">
          {t('mode.backHome')}
        </Link>
      </div>
    )
  }
  // モードが変わったら状態を作り直す
  return <ModeRunner key={mode.id} mode={mode} />
}

type Phase = 'setup' | 'session' | 'result'

const optionsKey = (modeId: string) => `mode.${modeId}.setupOptions`
const tagsKey = (modeId: string) => `mode.${modeId}.setupTags`

function hasValue(value: unknown): boolean {
  if (typeof value === 'string') return value.trim() !== ''
  if (Array.isArray(value)) return value.length > 0
  return value !== undefined && value !== null
}

function ModeRunner({ mode }: { mode: AnyStudyMode }) {
  const { t } = useTranslation()
  const { t: tm } = useTranslation(modeNamespace(mode.id))
  const navigate = useNavigate()
  const { settings } = useSettings()

  const progress = useMemo(() => createProgressStore(mode.id), [mode.id])
  const modeSettings = useMemo(() => createModeSettingsStore(mode.id), [mode.id])
  const services = useMemo<CoreServices>(
    () => ({ speak, canSpeak, settings, tags: { list: listTags, setWordTags } }),
    [settings],
  )

  const [phase, setPhase] = useState<Phase>('setup')
  const [options, setOptions] = useState<unknown>(mode.defaultOptions)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sessionWords, setSessionWords] = useState<Word[]>([])
  const [result, setResult] = useState<SessionResult | null>(null)
  const startedAt = useRef(0)

  // 前回の準備画面の条件を復元する（FR-MODE-02）
  useEffect(() => {
    void getSetting<object>(optionsKey(mode.id)).then((saved) => {
      if (saved && typeof saved === 'object') {
        setOptions({ ...(mode.defaultOptions as object), ...saved })
      }
    })
    void getSetting<string[]>(tagsKey(mode.id)).then((saved) => {
      if (Array.isArray(saved)) setSelectedTags(saved)
    })
  }, [mode])

  const allTags = useLiveQuery(listTags, [], [] as string[])
  // 存在しなくなったタグは条件から外す
  const activeTags = selectedTags.filter((tag) => allTags.includes(tag))
  const words = useLiveQuery(async () => {
    const list = await listWords(activeTags)
    const required = mode.requiredFields ?? []
    return list.filter((w) => required.every((field) => hasValue(w[field])))
  }, [activeTags.join('\u0000'), mode])

  const minWords = mode.minWords ?? 1
  const canStart = words !== undefined && words.length >= minWords

  const changeOptions = (next: unknown) => {
    setOptions(next)
    void setSetting(optionsKey(mode.id), next)
  }

  const toggleTag = (tag: string) => {
    const next = activeTags.includes(tag)
      ? activeTags.filter((x) => x !== tag)
      : [...activeTags, tag]
    setSelectedTags(next)
    void setSetting(tagsKey(mode.id), next)
  }

  const start = () => {
    if (!words || !canStart) return
    // セッション中に単語が増減しても出題対象は変えない
    setSessionWords(words)
    startedAt.current = Date.now()
    setResult(null)
    setPhase('session')
  }

  const finish = (sessionResult: SessionResult) => {
    setResult(sessionResult)
    setPhase('result')
    void addSessionRecord({
      modeId: mode.id,
      startedAt: startedAt.current,
      finishedAt: Date.now(),
      summary: sessionResult.summary,
    })
  }

  const loading = <p className="muted">{t('common.loading')}</p>

  return (
    <div className="stack">
      <div className={styles.titleRow}>
        {phase !== 'session' && (
          <Link to="/" className={styles.back} aria-label={t('nav.back')}>
            <BackIcon />
          </Link>
        )}
        <h1 className="page-title">{tm(mode.titleKey)}</h1>
      </div>

      {phase === 'setup' && (
        <div className="stack">
          <div className="panel stack">
            {allTags.length > 0 && (
              <TagChips
                legend={t('mode.tags')}
                tags={allTags}
                selected={activeTags}
                onToggle={toggleTag}
              />
            )}
            {mode.Setup && (
              <Suspense fallback={loading}>
                <mode.Setup options={options} onChange={changeOptions} />
              </Suspense>
            )}
          </div>
          <div className={styles.actions}>
            <p className="muted">
              {words === undefined
                ? t('common.loading')
                : t('mode.targetWords', { count: words.length })}
            </p>
            {words !== undefined && !canStart && <p>{t('mode.notEnoughWords')}</p>}
            <button
              type="button"
              className="button button--primary button--block-sm"
              disabled={!canStart}
              onClick={start}
            >
              {t('mode.start')}
            </button>
          </div>
        </div>
      )}

      {phase === 'session' && (
        <Suspense fallback={loading}>
          <mode.Session
            words={sessionWords}
            options={options}
            progress={progress}
            modeSettings={modeSettings}
            services={services}
            onFinish={finish}
            onAbort={() => void navigate('/')}
          />
        </Suspense>
      )}

      {phase === 'result' && result && (
        <div className="stack">
          <section className="panel">
            <h2 className="section-title">{t('mode.resultTitle')}</h2>
            {mode.Result ? (
              <Suspense fallback={loading}>
                <mode.Result summary={result.summary} />
              </Suspense>
            ) : (
              Object.keys(result.summary).length > 0 && (
                <dl className={styles.summary}>
                  {Object.entries(result.summary).map(([key, value]) => (
                    <div key={key}>
                      <dt>{tm(`summary.${key}`, { defaultValue: key })}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              )
            )}
          </section>
          <div className={styles.actions}>
            <button
              type="button"
              className="button button--primary button--block-sm"
              onClick={start}
            >
              {t('mode.again')}
            </button>
            <Link to="/" className="button button--block-sm">
              {t('mode.backHome')}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
