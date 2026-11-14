// 暗記カードの学習セッション（仕様書 8章）
import { useEffect, useEffectEvent, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PencilIcon, SpeakerIcon, TagIcon } from '../../components/icons'
import { WordEditDialog } from '../../components/WordEditDialog'
import { WordTagsDialog } from '../../components/WordTagsDialog'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useSwipe } from '../../hooks/useSwipe'
import type { Progress, Word } from '../../types/word'
import type { SessionProps } from '../types'
import type { FlashcardOptions } from './options'
import { countDueByEndOfTomorrow, planQueue, requeue, type Card } from './queue'
import { DEFAULT_SESSION_SIZE, loadSettings, type FlashcardSettings } from './settings'
import {
  intervalLabel,
  isSrsState,
  RATINGS,
  schedule,
  type Rating,
  type SrsState,
} from '../shared/srs'
import styles from './Session.module.css'

type Props = SessionProps<FlashcardOptions>

interface Loaded {
  settings: FlashcardSettings
  progress: Map<string, Progress>
  cards: Card[]
  nextDue: number | null
  startedAt: number
}

export default function FlashcardSession(props: Props) {
  const { words, options, progress, modeSettings, sessionSize, onAbort } = props
  const { t } = useTranslation('mode.flashcard')
  const { t: tc } = useTranslation()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  // 出題対象を決める（FR-FC-01・02）。単語はセッション開始時点のもので固定する。
  // 期限が来たカードを先に、残りを新規カードで埋めて「一回の出題数」まで出す（版 1.41）
  useEffect(() => {
    let cancelled = false
    void (async () => {
      // 進捗はこのモードの全件を1回だけ読み、出題対象の単語の分を取り出す。
      // 単語ごとに読む（getMany）より速い（1万語で確かめた。NFR-01）
      const [settings, rows] = await Promise.all([loadSettings(modeSettings), progress.list()])
      const ids = new Set(words.map((w) => w.id))
      const map = new Map<string, Progress>()
      for (const row of rows) if (ids.has(row.wordId)) map.set(row.wordId, row)
      const now = Date.now()
      const plan = planQueue({
        words,
        progress: map,
        now,
        limit: sessionSize ?? DEFAULT_SESSION_SIZE,
        direction: options.direction,
      })
      if (!cancelled) {
        setLoaded({
          settings,
          progress: map,
          cards: plan.cards,
          nextDue: plan.nextDue,
          startedAt: now,
        })
      }
    })().catch((error: unknown) => {
      console.error('暗記カードの読み込みに失敗しました', error)
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

  // 出題対象が0件のとき（FR-FC-03）。期限が来たカードも未学習の単語も無い
  if (loaded.cards.length === 0) return <EmptyState loaded={loaded} onBack={onAbort} />

  return <Study {...props} loaded={loaded} />
}

function EmptyState(props: { loaded: Loaded; onBack(): void }) {
  const { t, i18n } = useTranslation('mode.flashcard')
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

/** タグの編集中の状態（FR-FC-15） */
interface TagEditing {
  /** 入力候補 */
  allTags: string[]
  busy: boolean
  failed: boolean
}

function Study({
  loaded,
  progress,
  services,
  autoSpeak = false,
  onFinish,
  onAbort,
}: Props & { loaded: Loaded }) {
  const { t } = useTranslation('mode.flashcard')
  const { t: tc } = useTranslation()
  const coarse = useMediaQuery('(pointer: coarse)')
  const { settings } = loaded

  const [cards, setCards] = useState(loaded.cards)
  const [pos, setPos] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [states, setStates] = useState(() => {
    const map = new Map<string, SrsState>()
    for (const [id, p] of loaded.progress) if (isSrsState(p.state)) map.set(id, p.state)
    return map
  })
  const [counts, setCounts] = useState<Counts>(zeroCounts)
  const [studied, setStudied] = useState<ReadonlySet<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [tagEditing, setTagEditing] = useState<TagEditing | null>(null)
  /** 単語を編集中なら、タグの入力候補（FR-FC-16） */
  const [wordEditing, setWordEditing] = useState<{ allTags: string[] } | null>(null)

  const frontRef = useRef<HTMLButtonElement>(null)
  const frontId = useId()
  const backRef = useRef<HTMLDivElement>(null)

  const card = cards[pos]
  const word = card.word
  const prevState = states.get(word.id)
  // 「意味→繁体字」の表面では答えがわかってしまうため読み上げない（仕様書 8.4）
  const speakable = services.canSpeak && (flipped || !card.reverse)

  // カードが変わったら表面に、裏返したら裏面にフォーカスを移す（NFR-03）
  useEffect(() => {
    const target = flipped ? backRef.current : frontRef.current
    target?.focus({ preventScroll: true })
  }, [pos, flipped])

  const flip = () => {
    if (flipped) return
    setFlipped(true)
    if (autoSpeak && services.canSpeak) services.speak(word.hanzi)
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
      await progress.put(word.id, next.due, next.state)
    } catch (error) {
      // 保存に失敗したら次へ進まない（NFR-07）
      console.error('評価の保存に失敗しました', error)
      setSaveFailed(true)
      setBusy(false)
      return
    }
    setSaveFailed(false)
    setStates((m) => new Map(m).set(word.id, next.state))
    const nextCounts = { ...counts, [rating]: counts[rating] + 1 }
    const nextStudied = new Set(studied).add(word.id)
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
    setBusy(false)
  }

  // 中断（FR-MODE-03・FR-FC-32）。1枚以上評価していれば結果を表示する
  const abort = () => {
    if (busy) return
    if (studied.size > 0) void finish(counts, studied.size)
    else onAbort()
  }

  const speakWord = () => {
    if (speakable) services.speak(word.hanzi)
  }

  // その場でタグを編集する（FR-FC-15）。候補を読めなくても編集はできるようにする
  const openTags = async () => {
    if (!flipped || busy || tagEditing) return
    setTagEditing({ allTags: [], busy: false, failed: false })
    try {
      const allTags = await services.tags.list()
      setTagEditing((e) => e && { ...e, allTags })
    } catch (error) {
      console.error('タグの候補を読み込めませんでした', error)
    }
  }

  // その場で単語を編集する（FR-FC-16）。学習進捗とセッションの出題対象は変えない
  const openWordEdit = async () => {
    if (!flipped || busy || tagEditing || wordEditing) return
    setWordEditing({ allTags: [] })
    try {
      const allTags = await services.tags.list()
      setWordEditing((e) => e && { allTags })
    } catch (error) {
      console.error('タグの候補を読み込めませんでした', error)
    }
  }

  /** 保存した内容を、同じ単語のカード（再出題分を含む）すべてに反映する */
  const applySavedWord = (saved: Word) =>
    setCards((list) => list.map((c) => (c.word.id === saved.id ? { ...c, word: saved } : c)))

  const saveTags = async (tags: string[]) => {
    setTagEditing((e) => e && { ...e, busy: true, failed: false })
    try {
      const saved = await services.tags.setWordTags(word.id, tags)
      // 同じ単語のカード（再出題分を含む）すべてに反映する
      setCards((list) =>
        list.map((c) => (c.word.id === word.id ? { ...c, word: { ...c.word, tags: saved } } : c)),
      )
      setTagEditing(null)
    } catch (error) {
      // 保存に失敗したらダイアログ内で知らせる（NFR-07）
      console.error('タグの保存に失敗しました', error)
      setTagEditing((e) => e && { ...e, busy: false, failed: true })
    }
  }

  const swipe = useSwipe({
    enabled: flipped && !busy,
    onSwipeLeft: () => void rate('again'),
    onSwipeRight: () => void rate('good'),
  })

  // キーボード操作（FR-FC-31）
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    // タグの編集中はダイアログの操作を優先する
    if (tagEditing || wordEditing) return
    const target = e.target instanceof HTMLElement ? e.target : null
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
    if (e.key === 'Escape') {
      e.preventDefault()
      abort()
    } else if (e.key === ' ') {
      if (flipped) {
        // 裏面ではフォーカス中のボタンの操作を妨げない
        if (!target?.closest('button, a')) e.preventDefault()
        return
      }
      // 表面の読み上げボタンにフォーカスがあるときは、そのボタンの操作にする（FR-FC-17）
      if (target?.closest('[data-speak]')) return
      e.preventDefault()
      if (!e.repeat) flip()
    } else if (/^[1-9]$/.test(e.key) && Number(e.key) <= RATINGS.length) {
      if (!flipped || e.repeat) return
      e.preventDefault()
      void rate(RATINGS[Number(e.key) - 1])
    } else if (e.key === 's' || e.key === 'S') {
      if (e.repeat) return
      e.preventDefault()
      speakWord()
    } else if (e.key === 't' || e.key === 'T') {
      if (!flipped || e.repeat) return
      e.preventDefault()
      void openTags()
    } else if (e.key === 'e' || e.key === 'E') {
      if (!flipped || e.repeat) return
      e.preventDefault()
      void openWordEdit()
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

      {!flipped ? (
        <div key={`front-${pos}`} className={`${styles.card} ${styles.front}`}>
          {/* カード全体を押すと裏返す（FR-FC-30）。読み上げボタンを中に入れられないよう、
              カードを覆うボタンと、その上に重ねた読み上げボタンに分ける（FR-FC-17） */}
          <button
            ref={frontRef}
            type="button"
            className={styles.flip}
            aria-labelledby={`${frontId}-q ${frontId}-hint`}
            onClick={flip}
          />
          {card.reverse ? (
            <span id={`${frontId}-q`} className={styles.frontMeaning}>
              {word.meaning}
            </span>
          ) : (
            <span id={`${frontId}-q`} className={styles.frontHanzi} lang="zh-TW">
              {word.hanzi}
            </span>
          )}
          {/* 答えを見る前に音を聞ける。「意味→繁体字」では答えが分かるので置かない（FR-FC-17・8.4） */}
          {!card.reverse && services.canSpeak && (
            <span className={styles.frontSpeak}>
              <SpeakButton label={t('speakWord')} onClick={() => services.speak(word.hanzi)} />
            </span>
          )}
          <span id={`${frontId}-hint`} className={styles.hint}>
            {coarse ? t('flipHintTouch') : t('flipHintKey')}
          </span>
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
            card={card}
            settings={settings}
            canSpeak={services.canSpeak}
            speak={services.speak}
            onEditTags={() => void openTags()}
            onEditWord={() => void openWordEdit()}
          />
        </div>
      )}

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
          <p className={styles.hintLine}>{coarse ? t('swipeHint') : t('keyHint')}</p>
        </div>
      )}

      <WordTagsDialog
        word={tagEditing ? word : null}
        allTags={tagEditing?.allTags ?? []}
        busy={tagEditing?.busy ?? false}
        error={tagEditing?.failed ? t('tagSaveFailed') : null}
        onClose={() => setTagEditing(null)}
        onSave={(tags) => void saveTags(tags)}
      />
      <WordEditDialog
        target={wordEditing ? { kind: 'edit', word } : null}
        allTags={wordEditing?.allTags ?? []}
        save={(content, id) => services.words.update(id ?? word.id, content)}
        findDuplicate={services.words.findDuplicate}
        canOpenExisting={false}
        onClose={() => setWordEditing(null)}
        onSaved={applySavedWord}
      />
    </div>
  )
}

/** 裏面（FR-FC-11〜13） */
function Back(props: {
  card: Card
  settings: FlashcardSettings
  canSpeak: boolean
  speak(text: string): void
  onEditTags(): void
  onEditWord(): void
}) {
  const { t } = useTranslation('mode.flashcard')
  const { word } = props.card
  const { showZhuyin, showPinyin } = props.settings

  return (
    <div className={styles.backBody}>
      <div className={styles.headword}>
        <p className={styles.hanzi} lang="zh-TW">
          {word.hanzi}
        </p>
        {props.canSpeak && (
          <SpeakButton label={t('speakWord')} onClick={() => props.speak(word.hanzi)} />
        )}
      </div>
      {((showZhuyin && word.zhuyin) || (showPinyin && word.pinyin)) && (
        <div className={styles.readings}>
          {showZhuyin && word.zhuyin && (
            <p className={styles.zhuyin} lang="zh-TW">
              {word.zhuyin}
            </p>
          )}
          {showPinyin && word.pinyin && (
            <p className={styles.pinyin} lang="zh-Latn-pinyin">
              {word.pinyin}
            </p>
          )}
        </div>
      )}
      <p className={styles.meaning}>{word.meaning}</p>

      {word.examples.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('examples')}</h3>
          <ul className={styles.examples}>
            {word.examples.map((ex, i) => (
              <li key={i}>
                <div className={styles.exampleRow}>
                  <p lang="zh-TW">{ex.text}</p>
                  {props.canSpeak && (
                    <SpeakButton label={t('speakExample')} onClick={() => props.speak(ex.text)} />
                  )}
                </div>
                {ex.translation && <p className={styles.translation}>{ex.translation}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={`${styles.section} ${styles.tagSection}`}>
        <h3 className="visually-hidden">{t('tags')}</h3>
        {word.tags.length > 0 && (
          <ul className={styles.tags}>
            {word.tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        )}
        <div className={styles.editButtons}>
          {/* 単語の編集（FR-FC-16） */}
          <button type="button" className={`button ${styles.editTags}`} onClick={props.onEditWord}>
            <PencilIcon />
            {t('editWord')}
          </button>
          {/* タグの編集（FR-FC-15） */}
          <button type="button" className={`button ${styles.editTags}`} onClick={props.onEditTags}>
            <TagIcon />
            {t('editTags')}
          </button>
        </div>
      </section>
    </div>
  )
}

function SpeakButton({ label, onClick }: { label: string; onClick(): void }) {
  return (
    <button
      type="button"
      className={styles.speak}
      data-speak=""
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <SpeakerIcon />
    </button>
  )
}
