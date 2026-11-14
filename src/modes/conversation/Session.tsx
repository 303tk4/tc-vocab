// 場面別会話の学習セッション（仕様書 18章）
import { useEffect, useEffectEvent, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { SpeakerIcon } from '../../components/icons'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useSwipe } from '../../hooks/useSwipe'
import { itemProgressId, type Progress } from '../../types/word'
import { MODE_ID } from './modeId'
import { countDueByEndOfTomorrow, planReviews, requeue } from '../shared/queue'
import {
  intervalLabel,
  isSrsState,
  RATINGS,
  schedule,
  type Rating,
  type SrsState,
} from '../shared/srs'
import type { SessionProps } from '../types'
import { sanitizeOptions, type ConversationOptions } from './options'
import {
  availableLanguages,
  buildItems,
  loadSceneData,
  loadSceneIndex,
  pickLanguage,
  sceneImageUrl,
  type Sentence,
  type StudyItem,
} from './scenes'
import { DEFAULT_SESSION_SIZE, loadSettings, type ConversationSettings } from './settings'
import styles from './Session.module.css'

type Props = SessionProps<ConversationOptions>

/** 項目の進捗の ID（6.2） */
const keyOf = (item: StudyItem) => itemProgressId(MODE_ID, item.phrase.id)

interface Loaded {
  settings: ConversationSettings
  language: string
  /** 選んだ条件の全項目（「追加で学習する」で使う） */
  all: StudyItem[]
  progress: Map<string, Progress>
  cards: StudyItem[]
  nextDue: number | null
  startedAt: number
}

export default function ConversationSession(props: Props) {
  const { options: rawOptions, progress, modeSettings, sessionSize, services, onAbort } = props
  const { t } = useTranslation('mode.conversation')
  const { t: tc } = useTranslation()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  // 出題対象を決める（FR-CONV-01〜03）。セッションの開始時に一度だけ決める
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const options = sanitizeOptions(rawOptions)
      const [settings, rows, index] = await Promise.all([
        loadSettings(modeSettings),
        progress.list(),
        loadSceneIndex(),
      ])
      const language = pickLanguage(
        availableLanguages(index),
        options.language,
        services.settings.uiLanguage,
        options.languageUi,
      )
      if (!language) throw new Error('訓練の言語の用意がありません')
      const data = await loadSceneData(language)
      const all = buildItems({
        index: data.index,
        phrases: data.phrases,
        translation: data.translation,
        sceneIds: options.scenes,
        kinds: options.kinds,
      })
      const map = new Map<string, Progress>()
      for (const row of rows) map.set(row.wordId, row)
      const now = Date.now()
      const plan = planReviews({
        items: all,
        keyOf,
        progress: map,
        now,
        // 期限が来た項目を先に、残りを新しい項目で埋めて「一回の出題数」まで出す（FR-CONV-03、版 1.41）
        limit: sessionSize ?? DEFAULT_SESSION_SIZE,
      })
      if (!cancelled) {
        setLoaded({
          settings,
          language,
          all,
          progress: map,
          cards: plan.items,
          nextDue: plan.nextDue,
          startedAt: now,
        })
      }
    })().catch((error: unknown) => {
      console.error('場面別会話の読み込みに失敗しました', error)
      if (!cancelled) setLoadFailed(true)
    })
    return () => {
      cancelled = true
    }
    // セッションの開始時に一度だけ決める
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loadFailed) {
    return (
      <div className="stack">
        <p role="alert">{t('loadFailed')}</p>
        <button type="button" className="button button--block-sm" onClick={onAbort}>
          {tc('mode.backHome')}
        </button>
      </div>
    )
  }
  if (!loaded) return <p className="muted">{tc('common.loading')}</p>

  // 出題対象が0件のとき（FR-CONV-03。FR-FC-03 と同じ）。期限が来た項目も新しい項目も無い
  if (loaded.cards.length === 0) return <EmptyState loaded={loaded} onBack={onAbort} />

  return <Study {...props} loaded={loaded} />
}

function EmptyState(props: { loaded: Loaded; onBack(): void }) {
  const { t, i18n } = useTranslation('mode.conversation')
  const { t: tc } = useTranslation()
  const { nextDue } = props.loaded
  const date =
    nextDue === null
      ? null
      : new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(
          nextDue,
        )
  return (
    <section className="panel stack">
      <h2 className="section-title">{t('empty.title')}</h2>
      <p className={styles.emptyText}>
        {date ? t('empty.nextDue', { date }) : t('empty.noSchedule')}
      </p>
      <div className={styles.emptyActions}>
        <button type="button" className="button button--block-sm" onClick={props.onBack}>
          {tc('mode.backHome')}
        </button>
      </div>
    </section>
  )
}

type Counts = Record<Rating, number>

const zeroCounts = (): Counts => Object.fromEntries(RATINGS.map((rating) => [rating, 0])) as Counts

function Study({
  loaded,
  progress,
  services,
  autoSpeak = true,
  onFinish,
  onAbort,
}: Props & { loaded: Loaded }) {
  const { t } = useTranslation('mode.conversation')
  const { t: tc } = useTranslation()
  const coarse = useMediaQuery('(pointer: coarse)')
  const { settings, language } = loaded

  const [cards, setCards] = useState(loaded.cards)
  const [pos, setPos] = useState(0)
  const [flipped, setFlipped] = useState(false)
  /** 「音声だけで出す」で、文字を表示したか（FR-CONV-11） */
  const [textShown, setTextShown] = useState(false)
  const [states, setStates] = useState(() => {
    const map = new Map<string, SrsState>()
    for (const [id, p] of loaded.progress) if (isSrsState(p.state)) map.set(id, p.state)
    return map
  })
  const [counts, setCounts] = useState<Counts>(zeroCounts)
  const [studied, setStudied] = useState<ReadonlySet<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  const frontRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLDivElement>(null)

  const card = cards[pos]
  const { phrase } = card
  const key = keyOf(card)
  const prevState = states.get(key)
  // 自動再生がオフのときは音が出ないので、音声だけでは出さない（FR-CONV-11）
  const audioOnly = settings.audioOnly && autoSpeak && services.canSpeak

  // 場面の背景の画像（FR-CONV-16）。設定がオフ・画像が無い・読めないときは使わない
  useEffect(() => {
    if (!settings.showBackground) return
    let cancelled = false
    sceneImageUrl(card.scene).then(
      (url) => !cancelled && setImageUrl(url),
      () => !cancelled && setImageUrl(null),
    )
    return () => {
      cancelled = true
    }
  }, [card.scene, settings.showBackground])

  // カードが変わったら表面に、裏返したら裏面にフォーカスを移す（NFR-03）
  useEffect(() => {
    const target = flipped ? backRef.current : frontRef.current
    target?.focus({ preventScroll: true })
  }, [pos, flipped])

  // 「答える」の表面を出したら、セリフを読み上げる（FR-CONV-10）
  const speakLineOnShow = useEffectEvent(() => {
    if (autoSpeak && phrase.kind === 'respond' && phrase.line && services.canSpeak) {
      services.speak(phrase.line.text)
    }
  })
  useEffect(() => {
    speakLineOnShow()
  }, [pos])

  const flip = () => {
    if (flipped) return
    setFlipped(true)
  }

  const finish = async (finalCounts: Counts, studiedCount: number) => {
    setBusy(true)
    const summary: Record<string, number> = {
      studied: studiedCount,
      ...finalCounts,
      durationSec: Math.round((Date.now() - loaded.startedAt) / 1000),
    }
    try {
      summary.dueTomorrow = countDueByEndOfTomorrow(await progress.list(), Date.now())
    } catch (error) {
      console.error('明日の復習予定を数えられませんでした', error)
    }
    onFinish({ summary })
  }

  const rate = async (rating: Rating) => {
    if (!flipped || busy) return
    const now = Date.now()
    const next = schedule(prevState, rating, now)
    setBusy(true)
    try {
      await progress.put(key, next.due, next.state)
    } catch (error) {
      // 保存に失敗したら次へ進まない（NFR-07）
      console.error('評価の保存に失敗しました', error)
      setSaveFailed(true)
      setBusy(false)
      return
    }
    setSaveFailed(false)
    setStates((m) => new Map(m).set(key, next.state))
    const nextCounts = { ...counts, [rating]: counts[rating] + 1 }
    const nextStudied = new Set(studied).add(key)
    setCounts(nextCounts)
    setStudied(nextStudied)
    // 「もう一度」は数枚後に再び出す（FR-FC-22）
    const nextCards = rating === 'again' ? requeue(cards, pos) : cards
    if (pos + 1 >= nextCards.length) {
      await finish(nextCounts, nextStudied.size)
      return
    }
    setCards(nextCards)
    setPos(pos + 1)
    setFlipped(false)
    setTextShown(false)
    setBusy(false)
  }

  // 中断（FR-MODE-03・FR-FC-32）。1問以上評価していれば結果を表示する
  const abort = () => {
    if (busy) return
    if (studied.size > 0) void finish(counts, studied.size)
    else onAbort()
  }

  /** S キーで読み上げる文：セリフ、または裏面の最初の回答例 */
  const speakMain = () => {
    if (!services.canSpeak) return
    const text =
      phrase.kind === 'respond' ? phrase.line?.text : flipped ? phrase.answers[0]?.text : undefined
    if (text) services.speak(text)
  }

  const swipe = useSwipe({
    enabled: flipped && !busy,
    onSwipeLeft: () => void rate('again'),
    onSwipeRight: () => void rate('good'),
  })

  // キーボード操作（FR-CONV-20。FR-FC-31 から T・E を除いたもの）
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    const target = e.target instanceof HTMLElement ? e.target : null
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
    if (e.key === 'Escape') {
      e.preventDefault()
      abort()
    } else if (e.key === ' ') {
      // フォーカス中のボタンの操作を妨げない
      if (target?.closest('button, a')) return
      e.preventDefault()
      if (!flipped && !e.repeat) flip()
    } else if (/^[1-9]$/.test(e.key) && Number(e.key) <= RATINGS.length) {
      if (!flipped || e.repeat) return
      e.preventDefault()
      void rate(RATINGS[Number(e.key) - 1])
    } else if (e.key === 's' || e.key === 'S') {
      if (e.repeat) return
      e.preventDefault()
      speakMain()
    }
  })
  useEffect(() => {
    const listener = (e: KeyboardEvent) => onKeyDown(e)
    document.addEventListener('keydown', listener)
    return () => document.removeEventListener('keydown', listener)
  }, [])

  const formatInterval = (rating: Rating) => {
    const label = intervalLabel(prevState, rating)
    return t(`intervals.${label.unit}`, { value: label.value })
  }

  const swipeDirection = swipe.dx < 0 ? 'again' : swipe.dx > 0 ? 'good' : null
  const background = settings.showBackground ? imageUrl : null
  const stageStyle = background
    ? ({ '--scene-image': `url("${background}")` } as CSSProperties)
    : undefined

  const sceneLabel = (
    <p className={styles.scene}>
      <span lang="zh-TW">{card.scene.name}</span>
      {card.sceneName && <span lang={language}>{card.sceneName}</span>}
    </p>
  )

  return (
    <div className={styles.session}>
      <div className={styles.toolbar}>
        <p className={styles.counter} aria-live="polite">
          {t('progress', { current: pos + 1, total: cards.length })}
        </p>
        <button type="button" className="button" onClick={abort} disabled={busy}>
          {tc('mode.abort')}
        </button>
      </div>
      <div
        className={styles.bar}
        role="progressbar"
        aria-label={t('progress', { current: pos + 1, total: cards.length })}
        aria-valuemin={0}
        aria-valuemax={cards.length}
        aria-valuenow={pos}
      >
        <span style={{ width: `${(pos / cards.length) * 100}%` }} />
      </div>

      <div
        className={styles.stage}
        data-background={background ? 'image' : undefined}
        style={stageStyle}
      >
        {!flipped ? (
          <div
            key={`front-${pos}`}
            ref={frontRef}
            tabIndex={-1}
            className={`${styles.card} ${styles.front}`}
          >
            {sceneLabel}
            <p className={styles.kind}>{t(`kind.${phrase.kind}`)}</p>
            {phrase.kind === 'respond' && phrase.line ? (
              <div className={styles.prompt}>
                {audioOnly && !textShown ? (
                  <>
                    <p className={styles.audioOnly}>{t('audioOnly')}</p>
                    <button type="button" className="button" onClick={() => setTextShown(true)}>
                      {t('showText')}
                    </button>
                  </>
                ) : (
                  <p className={styles.line} lang="zh-TW">
                    {phrase.line.text}
                  </p>
                )}
                {/* 答えを見る前にセリフを聞ける読み上げボタン。暗記カードの表面と同じ形（FR-CONV-10） */}
                {services.canSpeak && (
                  <button
                    type="button"
                    className={styles.speak}
                    aria-label={t('speakLine')}
                    title={t('speakLine')}
                    onClick={() => services.speak(phrase.line!.text)}
                  >
                    <SpeakerIcon />
                  </button>
                )}
              </div>
            ) : (
              <p className={styles.intent} lang={language}>
                {card.translation.intent}
              </p>
            )}
            <button type="button" className="button button--primary" onClick={flip}>
              {t('showAnswer')}
            </button>
            {!coarse && <p className={styles.hint}>{t('showAnswerKeyHint')}</p>}
          </div>
        ) : (
          <div
            key={`back-${pos}`}
            ref={backRef}
            tabIndex={-1}
            className={`${styles.card} ${styles.back}`}
            data-swipe={swipeDirection ?? undefined}
            style={
              swipe.dragging
                ? { transform: `translateX(${swipe.dx}px) rotate(${swipe.dx / 30}deg)` }
                : undefined
            }
            {...swipe.handlers}
          >
            {swipeDirection && (
              <span className={styles.swipeLabel} aria-hidden="true">
                {t(`ratings.${swipeDirection}`)}
              </span>
            )}
            <Back
              item={card}
              language={language}
              settings={settings}
              canSpeak={services.canSpeak}
              speak={services.speak}
            />
          </div>
        )}
      </div>

      {saveFailed && (
        <p className={styles.error} role="alert">
          {t('saveFailed')}
        </p>
      )}

      {flipped && (
        <div className={styles.footer}>
          <div className={styles.ratings} role="group" aria-label={t('ratingsLabel')}>
            {RATINGS.map((rating, i) => (
              <button
                key={rating}
                type="button"
                className={`button ${styles.rating} ${styles[rating]}`}
                disabled={busy}
                onClick={() => void rate(rating)}
              >
                <span className={styles.ratingName}>{t(`ratings.${rating}`)}</span>
                <span className={styles.ratingInterval}>{formatInterval(rating)}</span>
                {!coarse && (
                  <kbd className={styles.kbd} aria-hidden="true">
                    {i + 1}
                  </kbd>
                )}
              </button>
            ))}
          </div>
          {/* 評価すると次へ進むことを示す。スワイプの案内は分かりにくいので示さない（8.4・FR-CONV-20） */}
          <p className={styles.nextHint}>{t('nextHint')}</p>
          {!coarse && <p className={styles.hintLine}>{t('keyHint')}</p>}
        </div>
      )}
    </div>
  )
}

/** 裏面（FR-CONV-12・14・15） */
function Back(props: {
  item: StudyItem
  language: string
  settings: ConversationSettings
  canSpeak: boolean
  speak(text: string): void
}) {
  const { t } = useTranslation('mode.conversation')
  const { item, language } = props
  const { phrase, translation } = item

  return (
    <div className={styles.backBody}>
      <p className={styles.scene}>
        <span lang="zh-TW">{item.scene.name}</span>
        {item.sceneName && <span lang={language}>{item.sceneName}</span>}
      </p>

      {phrase.kind === 'respond' && phrase.line ? (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('line')}</h3>
          <SentenceView sentence={phrase.line} translation={translation.line} {...props} large />
        </section>
      ) : (
        <p className={styles.intentSmall} lang={language}>
          {translation.intent}
        </p>
      )}

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('answers')}</h3>
        {phrase.answers.length === 0 ? (
          <p>{t('noReply')}</p>
        ) : (
          <ul className={styles.answers}>
            {phrase.answers.map((answer, i) => (
              <li key={i}>
                <SentenceView sentence={answer} translation={translation.answers[i]} {...props} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {translation.note && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('note')}</h3>
          <p className={styles.note} lang={language}>
            {translation.note}
          </p>
        </section>
      )}
    </div>
  )
}

/** 繁体字の文と読み・訳。読み上げボタン付き（FR-CONV-15） */
function SentenceView(props: {
  sentence: Sentence
  translation: string | undefined
  language: string
  settings: ConversationSettings
  canSpeak: boolean
  speak(text: string): void
  large?: boolean
}) {
  const { t } = useTranslation('mode.conversation')
  const { sentence, settings } = props
  return (
    <div className={styles.sentence}>
      <div className={styles.sentenceRow}>
        <p className={props.large ? styles.lineLarge : styles.text} lang="zh-TW">
          {sentence.text}
        </p>
        {props.canSpeak && (
          <button
            type="button"
            className={styles.speak}
            aria-label={t('speak')}
            title={t('speak')}
            onClick={() => props.speak(sentence.text)}
          >
            <SpeakerIcon />
          </button>
        )}
      </div>
      {settings.showZhuyin && sentence.zhuyin && (
        <p className={styles.zhuyin} lang="zh-TW">
          {sentence.zhuyin}
        </p>
      )}
      {settings.showPinyin && sentence.pinyin && (
        <p className={styles.pinyin} lang="zh-Latn-pinyin">
          {sentence.pinyin}
        </p>
      )}
      {props.translation && (
        <p className={styles.translation} lang={props.language}>
          {props.translation}
        </p>
      )}
    </div>
  )
}
