import { useLiveQuery } from 'dexie-react-hooks'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import { setStudying } from '../app/studyActivity'
import { BackLink } from '../components/BackLink'
import { TagChips } from '../components/TagChips'
import { addSessionRecord, createProgressStore } from '../db/repos/progress'
import { createModeSettingsStore, getSetting, setSetting } from '../db/repos/settings'
import { setWordTags } from '../db/repos/tags'
import { findDuplicateWord, listTags, listWords, updateWord } from '../db/repos/words'
import { modeNamespace } from '../i18n'
import { getMode } from '../modes/registry'
import {
  LEGACY_DAILY_LIMIT_KEY,
  parseSessionSize,
  resolveSessionSize,
  SESSION_SIZE_KEY,
} from '../modes/sessionSize'
import type { AnyStudyMode, CoreServices, SessionResult } from '../modes/types'
import { AUTO_SPEAK_KEY, resolveAutoSpeak } from '../modes/autoSpeak'
import { canSpeak, speak, unlockSpeech } from '../services/speech'
import { useSettings } from '../settings/context'
import type { Word } from '../types/word'
import styles from './ModePage.module.css'
import { AutoSpeakField } from './mode/AutoSpeakField'
import { SessionSizeField } from './mode/SessionSizeField'
import { usePageTitle } from '../hooks/usePageTitle'

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
  usePageTitle(tm(mode.titleKey))
  const navigate = useNavigate()
  const { settings } = useSettings()

  const progress = useMemo(() => createProgressStore(mode.id), [mode.id])
  const modeSettings = useMemo(() => createModeSettingsStore(mode.id), [mode.id])
  const services = useMemo<CoreServices>(
    () => ({
      speak,
      canSpeak,
      settings,
      tags: { list: listTags, setWordTags },
      words: { update: updateWord, findDuplicate: findDuplicateWord },
    }),
    [settings],
  )

  const [phase, setPhase] = useState<Phase>('setup')
  const [options, setOptions] = useState<unknown>(mode.defaultOptions)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sessionWords, setSessionWords] = useState<Word[]>([])
  const [result, setResult] = useState<SessionResult | null>(null)
  // 単語を使わないモードは、開始できるかをモード自身が決める（FR-MODE-01・FR-PLUG-07）
  const usesWords = mode.usesWords !== false
  const [setupReady, setSetupReady] = useState(true)
  // 一回の出題数（FR-PLUG-08）。入力中の文字のまま持ち、正しいときだけ保存して使う
  const [sizeDraft, setSizeDraft] = useState(() =>
    mode.sessionSize ? String(mode.sessionSize.defaultValue) : '',
  )
  const [sizeSaveFailed, setSizeSaveFailed] = useState(false)
  const sessionSize = mode.sessionSize ? parseSessionSize(sizeDraft) : null
  // 音声を自動で再生するか（FR-PLUG-09）。読み上げに対応していない環境では使わない
  const [autoSpeak, setAutoSpeak] = useState(mode.autoSpeak?.defaultValue ?? false)
  const [autoSpeakSaveFailed, setAutoSpeakSaveFailed] = useState(false)
  const startedAt = useRef(0)

  // 学習セッション中は更新の通知を保留する（FR-PWA-03）
  useEffect(() => {
    if (phase !== 'session') return
    setStudying(true)
    return () => setStudying(false)
  }, [phase])

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

  // 保存した出題数を読む。版 1.40 までの「1日の上限」があれば引き継ぐ（仕様書 8.1）
  useEffect(() => {
    if (!mode.sessionSize) return
    const { defaultValue } = mode.sessionSize
    void Promise.all([modeSettings.get(SESSION_SIZE_KEY), modeSettings.get(LEGACY_DAILY_LIMIT_KEY)])
      .then(([saved, legacy]) =>
        setSizeDraft(String(resolveSessionSize(saved, legacy, defaultValue))),
      )
      .catch((error: unknown) => console.error('出題数の読み込みに失敗しました', error))
  }, [mode, modeSettings])

  // 保存した自動再生の値を読む。暗記カードは版 1.47 までの設定と同じキーなので引き継ぐ（FR-FC-14）
  useEffect(() => {
    if (!mode.autoSpeak) return
    const { defaultValue } = mode.autoSpeak
    void modeSettings
      .get(AUTO_SPEAK_KEY)
      .then((saved) => setAutoSpeak(resolveAutoSpeak(saved, defaultValue)))
      .catch((error: unknown) => console.error('自動再生の設定の読み込みに失敗しました', error))
  }, [mode, modeSettings])

  const changeAutoSpeak = (checked: boolean) => {
    setAutoSpeak(checked)
    modeSettings.set(AUTO_SPEAK_KEY, checked).then(
      () => setAutoSpeakSaveFailed(false),
      (error: unknown) => {
        // 保存に失敗したら知らせる（NFR-07）。今回の学習にはその値を使える
        console.error('自動再生の設定の保存に失敗しました', error)
        setAutoSpeakSaveFailed(true)
      },
    )
  }

  const changeSize = (text: string) => {
    setSizeDraft(text)
    const n = parseSessionSize(text)
    if (n === null) return
    modeSettings.set(SESSION_SIZE_KEY, n).then(
      () => setSizeSaveFailed(false),
      (error: unknown) => {
        // 保存に失敗したら知らせる（NFR-07）。今回の学習にはその値を使える
        console.error('出題数の保存に失敗しました', error)
        setSizeSaveFailed(true)
      },
    )
  }

  const allTags = useLiveQuery(listTags, [], [] as string[])
  // 存在しなくなったタグは条件から外す
  const activeTags = selectedTags.filter((tag) => allTags.includes(tag))
  const words = useLiveQuery(async () => {
    if (!usesWords) return [] as Word[]
    const list = await listWords(activeTags)
    const required = mode.requiredFields ?? []
    return list.filter((w) => required.every((field) => hasValue(w[field])))
  }, [activeTags.join('\u0000'), mode, usesWords])

  const minWords = mode.minWords ?? 1
  const canStart =
    (usesWords ? words !== undefined && words.length >= minWords : setupReady) &&
    (!mode.sessionSize || sessionSize !== null)

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
    // 自動再生がオンなら、押した操作の中で読み上げを使えるようにしておく（スマホ向け。FR-PLUG-09）
    if (mode.autoSpeak && autoSpeak) unlockSpeech()
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
      <div className="title-row">
        {/* 学習セッション中は置かない（中断の操作で戻る。FR-NAV-01） */}
        {phase !== 'session' && <BackLink />}
        <h1 className="page-title">{tm(mode.titleKey)}</h1>
      </div>

      {phase === 'setup' && (
        <div className="stack">
          <div className="panel stack">
            {usesWords && allTags.length > 0 && (
              <TagChips
                legend={t('mode.tags')}
                tags={allTags}
                selected={activeTags}
                onToggle={toggleTag}
              />
            )}
            {mode.Setup && (
              <Suspense fallback={loading}>
                <mode.Setup
                  options={options}
                  onChange={changeOptions}
                  onCanStartChange={usesWords ? undefined : setSetupReady}
                  progress={progress}
                />
              </Suspense>
            )}
          </div>
          <div className={styles.actions}>
            {usesWords && (
              <p className="muted">
                {words === undefined
                  ? t('common.loading')
                  : t('mode.targetWords', { count: words.length })}
              </p>
            )}
            {usesWords && words !== undefined && !canStart && <p>{t('mode.notEnoughWords')}</p>}
            <button
              type="button"
              className="button button--primary button--block-sm"
              disabled={!canStart}
              onClick={start}
            >
              {t('mode.start')}
            </button>
            {/* 学習を始めるボタンのすぐ下に、目立つ形で置く（FR-MODE-05・FR-PLUG-09） */}
            {mode.autoSpeak && canSpeak && (
              <AutoSpeakField
                checked={autoSpeak}
                saveFailed={autoSpeakSaveFailed}
                onChange={changeAutoSpeak}
              />
            )}
            {mode.sessionSize && (
              <SessionSizeField
                value={sizeDraft}
                valid={sessionSize !== null}
                unit={tm('sessionSizeUnit')}
                saveFailed={sizeSaveFailed}
                onChange={changeSize}
              />
            )}
          </div>
          {/* モード別の表示の設定（FR-PLUG-10）。開閉できる欄にし、初めは閉じる */}
          {mode.SettingsPanel && (
            <details className={`panel ${styles.display}`}>
              <summary className={styles.displaySummary}>{t('mode.displaySettings')}</summary>
              <Suspense fallback={loading}>
                <mode.SettingsPanel settings={modeSettings} autoSpeak={autoSpeak && canSpeak} />
              </Suspense>
            </details>
          )}
        </div>
      )}

      {phase === 'session' && (
        <Suspense fallback={loading}>
          <mode.Session
            words={sessionWords}
            options={options}
            progress={progress}
            modeSettings={modeSettings}
            sessionSize={sessionSize ?? undefined}
            autoSpeak={mode.autoSpeak ? autoSpeak && canSpeak : undefined}
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
