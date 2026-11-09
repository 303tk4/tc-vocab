// 単語の追加・編集の入力画面（FR-WORDS-15〜18・FR-FC-16。仕様書 16.3）
import { useId, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { normalizePinyin, normalizeZhuyin, pinyinToZhuyin, zhuyinToPinyin } from '../io/reading'
import { REVIEW_READING_TAG } from '../io/reviewReading'
import {
  charLength,
  LIMITS,
  normalizeWord,
  tagError,
  type ValidationError,
  type WordField,
} from '../io/validate'
import type { Word, WordContent } from '../types/word'
import { Dialog, DialogActions } from './Dialog'
import { BackIcon, CloseIcon, PlusIcon } from './icons'
import { TagField } from './TagField'
import styles from './WordEditDialog.module.css'

export type WordEditTarget = { kind: 'add' } | { kind: 'edit'; word: Word }

interface Props {
  /** 開く内容。null のときは閉じる */
  target: WordEditTarget | null
  /** タグの入力候補（登録済みのタグ） */
  allTags: readonly string[]
  /** 保存する。id があれば編集、なければ追加。失敗したら例外を投げる */
  save(content: WordContent, id?: string): Promise<Word>
  /** 重複する登録済みの単語（仕様書 6.1） */
  findDuplicate(word: Pick<Word, 'hanzi' | 'pinyin'>, excludeId?: string): Promise<Word | undefined>
  /** 重複の確認で「既存の単語を開く」を出すか（暗記カードの学習中は出さない。FR-FC-16） */
  canOpenExisting?: boolean
  onClose(): void
  /** 保存したとき（「保存して次へ」を含む） */
  onSaved?(word: Word, kind: 'added' | 'updated'): void
}

/** 単語の追加・編集のダイアログ。閉じると入力中の内容は捨てる */
export function WordEditDialog(props: Props) {
  if (!props.target) return null
  const key = props.target.kind === 'edit' ? props.target.word.id : 'add'
  return <Editor key={key} {...props} target={props.target} />
}

interface ExampleInput {
  text: string
  translation: string
}

interface FormState {
  hanzi: string
  zhuyin: string
  pinyin: string
  meaning: string
  examples: ExampleInput[]
  tags: string[]
  /** タグの入力欄（まだ追加していないタグ） */
  tagInput: string
}

/** 入力画面の1段。「既存の単語を開く」で重ね、「← 戻る」で1段ずつ戻る（FR-WORDS-17） */
interface Frame {
  target: WordEditTarget
  initial: FormState
  form: FormState
}

type Phase =
  | { kind: 'form' }
  | { kind: 'duplicate'; existing: Word; content: WordContent; next: boolean }
  | { kind: 'discard'; then: 'close' | 'back' }

type FieldErrors = Partial<Record<WordField | 'tagInput', string>>
type ExampleErrors = Record<number, string>

/** 読みの補助の知らせ（自動で入れたこと、注音と拼音の食い違い） */
interface ReadingNote {
  filled?: 'zhuyin' | 'pinyin'
  /** 食い違いを調べたときの値。入力が変わったら出さない */
  checked?: {
    zhuyin: string
    pinyin: string
    pinyinCandidate: string | null
    zhuyinCandidate: string | null
  }
}

function toForm(word?: Word): FormState {
  return {
    hanzi: word?.hanzi ?? '',
    zhuyin: word?.zhuyin ?? '',
    pinyin: word?.pinyin ?? '',
    meaning: word?.meaning ?? '',
    examples: (word?.examples ?? []).map((e) => ({
      text: e.text,
      translation: e.translation ?? '',
    })),
    tags: word?.tags ?? [],
    tagInput: '',
  }
}

/** 入力が開いたときから変わったか（タグの入力欄に残っている文字も含む） */
function isDirty(frame: Frame): boolean {
  const comparable = (f: FormState) => JSON.stringify({ ...f, tagInput: '' })
  return frame.form.tagInput.trim() !== '' || comparable(frame.form) !== comparable(frame.initial)
}

function newFrame(target: WordEditTarget): Frame {
  const form = toForm(target.kind === 'edit' ? target.word : undefined)
  return { target, initial: form, form }
}

/** 注音と拼音が食い違うときの候補。食い違わない、または候補が無ければ null */
function readingMismatch(zhuyin: string, pinyin: string): ReadingNote['checked'] | null {
  if (zhuyin.trim() === '' || pinyin.trim() === '') return null
  const z = normalizeZhuyin(zhuyin)
  const zFromP = pinyinToZhuyin(pinyin)
  if (zFromP === z) return null
  const pFromZ = zhuyinToPinyin(z)
  const pinyinCandidate = pFromZ !== null && pFromZ !== pinyin.trim() ? pFromZ : null
  const zhuyinCandidate = zFromP !== null && zFromP !== z ? zFromP : null
  if (!pinyinCandidate && !zhuyinCandidate) return null
  return { zhuyin, pinyin, pinyinCandidate, zhuyinCandidate }
}

function Editor({
  target: initialTarget,
  allTags,
  save,
  findDuplicate,
  canOpenExisting = true,
  onClose,
  onSaved,
}: Props & { target: WordEditTarget }) {
  const { t } = useTranslation()
  const [stack, setStack] = useState<Frame[]>(() => [newFrame(initialTarget)])
  const [phase, setPhase] = useState<Phase>({ kind: 'form' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [exampleErrors, setExampleErrors] = useState<ExampleErrors>({})
  const [reading, setReading] = useState<ReadingNote>({})
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const hanziRef = useRef<HTMLInputElement>(null)

  const frame = stack[stack.length - 1]
  const { form, target } = frame
  const editing = target.kind === 'edit' ? target.word : null
  const nested = stack.length > 1

  const update = (patch: Partial<FormState>) =>
    setStack((s) => [
      ...s.slice(0, -1),
      { ...s[s.length - 1], form: { ...s[s.length - 1].form, ...patch } },
    ])

  const resetMessages = () => {
    setErrors({})
    setExampleErrors({})
    setReading({})
    setFailure(null)
  }

  // ---- 読みの入力補助（FR-WORDS-18） ----
  const checkReadings = (zhuyin: string, pinyin: string, filled?: ReadingNote['filled']) =>
    setReading({ filled, checked: readingMismatch(zhuyin, pinyin) ?? undefined })

  /**
   * 注音・拼音の入力欄を離れたとき：数字の声調を直し、片方だけが入っていれば
   * もう片方を埋め、両方あって食い違えば候補を示す
   */
  const onReadingBlur = () => {
    let zhuyin = form.zhuyin.trim() === '' ? '' : normalizeZhuyin(form.zhuyin)
    let pinyin = normalizePinyin(form.pinyin)
    let filled: ReadingNote['filled']
    if (zhuyin === '' && pinyin !== '') {
      const z = pinyinToZhuyin(pinyin)
      if (z) {
        zhuyin = z
        filled = 'zhuyin'
      }
    } else if (pinyin === '' && zhuyin !== '') {
      const p = zhuyinToPinyin(zhuyin)
      if (p) {
        pinyin = p
        filled = 'pinyin'
      }
    }
    if (pinyin !== form.pinyin || zhuyin !== form.zhuyin) update({ pinyin, zhuyin })
    checkReadings(zhuyin, pinyin, filled)
  }

  const mismatch =
    reading.checked &&
    reading.checked.zhuyin === form.zhuyin &&
    reading.checked.pinyin === form.pinyin
      ? reading.checked
      : null

  // ---- 検証と保存 ----
  const errorText = (e: ValidationError): string => {
    if (e.code === 'required') return t('wordEdit.errors.required')
    if (e.code === 'tooLong') return t('wordEdit.errors.tooLong', { max: e.max })
    if (e.code === 'tooMany') return t('wordEdit.errors.tooMany', { max: e.max })
    if (e.code === 'invalidChar') return t('tags.errors.invalidChar')
    return t('wordEdit.errors.invalid')
  }

  /** 入力を検証し、保存する内容を返す。問題があれば項目の下に示して null */
  const validate = (): WordContent | null => {
    const nextErrors: FieldErrors = {}
    const rowErrors: ExampleErrors = {}
    form.examples.forEach((ex, i) => {
      const text = ex.text.trim()
      if (text === '' && ex.translation.trim() !== '')
        rowErrors[i] = t('wordEdit.errors.exampleTextMissing')
      else if (charLength(text) > LIMITS.exampleText)
        rowErrors[i] = t('wordEdit.errors.tooLong', { max: LIMITS.exampleText })
    })
    // 入力欄に残っているタグも、保存のときに付ける
    const pending = form.tagInput.trim()
    const tags = pending === '' || form.tags.includes(pending) ? form.tags : [...form.tags, pending]
    if (pending !== '') {
      const tagErr = tags.length > LIMITS.tags ? 'tooMany' : tagError(pending)
      if (tagErr) nextErrors.tagInput = t(`tags.errors.${tagErr}`, { max: LIMITS.tags })
    }
    const result = normalizeWord({
      hanzi: form.hanzi,
      zhuyin: form.zhuyin.trim() === '' ? '' : normalizeZhuyin(form.zhuyin),
      pinyin: form.pinyin,
      meaning: form.meaning,
      examples: form.examples.map((e) => ({ text: e.text, translation: e.translation })),
      tags,
    })
    if (!result.ok) {
      for (const e of result.errors) {
        // 例文の行ごとのエラーがあれば、そちらを優先して示す
        if (e.field === 'examples' && Object.keys(rowErrors).length > 0) continue
        nextErrors[e.field] ??= errorText(e)
      }
    }
    setErrors(nextErrors)
    setExampleErrors(rowErrors)
    if (!result.ok || Object.keys(nextErrors).length > 0 || Object.keys(rowErrors).length > 0) {
      return null
    }
    const { hanzi, zhuyin, pinyin, meaning, examples } = result.word
    return { hanzi, zhuyin, pinyin, meaning, examples, tags: result.word.tags }
  }

  const doSave = async (content: WordContent, next: boolean) => {
    setBusy(true)
    setFailure(null)
    try {
      const word = await save(content, editing?.id)
      onSaved?.(word, editing ? 'updated' : 'added')
      setPhase({ kind: 'form' })
      setReading({})
      if (nested) {
        // 開いていた既存の単語を保存したら、入力中の単語に戻る
        setStack((s) => s.slice(0, -1))
        setStatus(t('wordEdit.updated', { hanzi: word.hanzi }))
      } else if (next) {
        // 続けて入力できるよう、タグだけを残して空にする
        const empty = { ...toForm(), tags: content.tags }
        setStack([{ target: { kind: 'add' }, initial: empty, form: empty }])
        setStatus(t('wordEdit.addedNext', { hanzi: word.hanzi }))
        hanziRef.current?.focus()
      } else {
        onClose()
      }
    } catch (error) {
      // 失敗したら画面内で知らせ、入力は残す（NFR-07）
      console.error('単語を保存できませんでした', error)
      setPhase({ kind: 'form' })
      setFailure(t('wordEdit.saveFailed'))
    } finally {
      setBusy(false)
    }
  }

  const submit = async (next: boolean) => {
    if (busy) return
    setStatus(null)
    const content = validate()
    if (!content) return
    // 追加するとき、および編集で繁体字か拼音を変えたときは、重複を調べる（FR-WORDS-17）
    const keyChanged =
      !editing || editing.hanzi !== content.hanzi || editing.pinyin !== content.pinyin
    if (keyChanged) {
      setBusy(true)
      let existing: Word | undefined
      try {
        existing = await findDuplicate(content, editing?.id)
      } catch (error) {
        // 調べられなくても保存はできるようにする
        console.error('重複を調べられませんでした', error)
      }
      setBusy(false)
      if (existing) {
        setPhase({ kind: 'duplicate', existing, content, next })
        return
      }
    }
    await doSave(content, next)
  }

  const openExisting = (existing: Word) => {
    setStack((s) => [...s, newFrame({ kind: 'edit', word: existing })])
    setPhase({ kind: 'form' })
    resetMessages()
    setStatus(null)
  }

  // ---- 閉じる・戻る ----
  const back = () => {
    setStack((s) => s.slice(0, -1))
    setPhase({ kind: 'form' })
    resetMessages()
    setStatus(null)
  }

  const requestClose = () => {
    if (busy) return
    if (phase.kind === 'discard') {
      setPhase({ kind: 'form' })
      return
    }
    if (stack.some(isDirty)) setPhase({ kind: 'discard', then: 'close' })
    else onClose()
  }

  const requestBack = () => {
    if (busy) return
    if (isDirty(frame)) setPhase({ kind: 'discard', then: 'back' })
    else back()
  }

  const title = editing ? t('wordEdit.editTitle', { hanzi: editing.hanzi }) : t('wordEdit.addTitle')

  return (
    <Dialog open title={title} onClose={requestClose}>
      {nested && phase.kind === 'form' && (
        <button type="button" className={styles.back} onClick={requestBack}>
          <BackIcon />
          <span>{t('wordEdit.backToDraft')}</span>
        </button>
      )}

      {phase.kind === 'duplicate' ? (
        <DuplicateView
          existing={phase.existing}
          busy={busy}
          canOpenExisting={canOpenExisting}
          onBack={() => setPhase({ kind: 'form' })}
          onOpen={() => openExisting(phase.existing)}
          onSaveAnyway={() => void doSave(phase.content, phase.next)}
        />
      ) : phase.kind === 'discard' ? (
        <>
          <p>{t('wordEdit.discardBody')}</p>
          <DialogActions>
            <button type="button" className="button" onClick={() => setPhase({ kind: 'form' })}>
              {t('wordEdit.keepEditing')}
            </button>
            <button
              type="button"
              className={`button ${styles.danger}`}
              onClick={() => {
                if (phase.then === 'back') back()
                else onClose()
              }}
            >
              {t('wordEdit.discard')}
            </button>
          </DialogActions>
        </>
      ) : (
        <>
          {status && (
            <p className={styles.status} role="status">
              {status}
            </p>
          )}
          <Fields
            form={form}
            errors={errors}
            exampleErrors={exampleErrors}
            allTags={allTags}
            hanziRef={hanziRef}
            update={update}
            onReadingBlur={onReadingBlur}
            readingNote={
              <>
                {reading.filled && (
                  <p className={styles.hint} role="status">
                    {t(
                      reading.filled === 'zhuyin'
                        ? 'wordEdit.filledZhuyin'
                        : 'wordEdit.filledPinyin',
                    )}
                  </p>
                )}
                {mismatch && (
                  <div className={styles.mismatch} role="status">
                    <p>{t('wordEdit.mismatch')}</p>
                    <div className={styles.candidates}>
                      {mismatch.pinyinCandidate && (
                        <button
                          type="button"
                          className="button"
                          onClick={() => {
                            update({ pinyin: mismatch.pinyinCandidate! })
                            setReading({})
                          }}
                        >
                          {t('wordEdit.useAsPinyin')}
                          <span lang="zh-Latn-pinyin">{mismatch.pinyinCandidate}</span>
                        </button>
                      )}
                      {mismatch.zhuyinCandidate && (
                        <button
                          type="button"
                          className="button"
                          onClick={() => {
                            update({ zhuyin: mismatch.zhuyinCandidate! })
                            setReading({})
                          }}
                        >
                          {t('wordEdit.useAsZhuyin')}
                          <span lang="zh-TW">{mismatch.zhuyinCandidate}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            }
          />
          {(failure || Object.keys(errors).length > 0 || Object.keys(exampleErrors).length > 0) && (
            <p className={styles.error} role="alert">
              {failure ?? t('wordEdit.fixErrors')}
            </p>
          )}
          <DialogActions>
            <button type="button" className="button" disabled={busy} onClick={requestClose}>
              {t('common.cancel')}
            </button>
            {!editing && (
              <button
                type="button"
                className="button"
                disabled={busy}
                onClick={() => void submit(true)}
              >
                {t('wordEdit.saveAndNext')}
              </button>
            )}
            <button
              type="button"
              className="button button--primary"
              disabled={busy || (editing !== null && !isDirty(frame))}
              onClick={() => void submit(false)}
            >
              {t('wordEdit.save')}
            </button>
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}

function Fields({
  form,
  errors,
  exampleErrors,
  allTags,
  hanziRef,
  update,
  onReadingBlur,
  readingNote,
}: {
  form: FormState
  errors: FieldErrors
  exampleErrors: ExampleErrors
  allTags: readonly string[]
  hanziRef: RefObject<HTMLInputElement | null>
  update(patch: Partial<FormState>): void
  onReadingBlur(): void
  readingNote: ReactNode
}) {
  const { t } = useTranslation()
  const id = useId()
  const hasReviewTag = form.tags.includes(REVIEW_READING_TAG)

  const setExample = (i: number, patch: Partial<ExampleInput>) =>
    update({ examples: form.examples.map((ex, j) => (j === i ? { ...ex, ...patch } : ex)) })

  const addTag = () => {
    const name = form.tagInput.trim()
    if (tagError(name) || form.tags.includes(name) || form.tags.length >= LIMITS.tags) return
    update({ tags: [...form.tags, name], tagInput: '' })
  }
  const tagInputName = form.tagInput.trim()
  const tagFull = form.tags.length >= LIMITS.tags
  const tagInputError = tagFull && tagInputName !== '' ? 'tooMany' : tagError(form.tagInput)
  const canAddTag = !tagInputError && !form.tags.includes(tagInputName)

  return (
    <div className={styles.form}>
      <Field id={`${id}-hanzi`} label={t('wordEdit.hanzi')} required error={errors.hanzi}>
        <input
          id={`${id}-hanzi`}
          ref={hanziRef}
          className={`${styles.input} ${styles.hanziInput}`}
          lang="zh-TW"
          value={form.hanzi}
          placeholder={t('wordEdit.hanziPlaceholder')}
          autoComplete="off"
          aria-required="true"
          aria-invalid={!!errors.hanzi}
          aria-describedby={errors.hanzi ? `${id}-hanzi-error` : undefined}
          onChange={(e) => update({ hanzi: e.target.value })}
        />
      </Field>

      <Field id={`${id}-meaning`} label={t('wordEdit.meaning')} required error={errors.meaning}>
        <textarea
          id={`${id}-meaning`}
          className={styles.input}
          rows={2}
          value={form.meaning}
          placeholder={t('wordEdit.meaningPlaceholder')}
          aria-required="true"
          aria-invalid={!!errors.meaning}
          aria-describedby={errors.meaning ? `${id}-meaning-error` : undefined}
          onChange={(e) => update({ meaning: e.target.value })}
        />
      </Field>

      <fieldset className={styles.group}>
        <legend>{t('wordEdit.reading')}</legend>
        <p className={styles.hint} id={`${id}-reading-hint`}>
          {t('wordEdit.readingHint')}
        </p>
        {hasReviewTag && (
          <div className={styles.review}>
            <p>{t('wordEdit.reviewTag', { tag: REVIEW_READING_TAG })}</p>
            <button
              type="button"
              className="button"
              onClick={() => update({ tags: form.tags.filter((x) => x !== REVIEW_READING_TAG) })}
            >
              {t('wordEdit.removeReviewTag', { tag: REVIEW_READING_TAG })}
            </button>
          </div>
        )}
        <div className={styles.readings}>
          <Field id={`${id}-zhuyin`} label={t('wordEdit.zhuyin')} error={errors.zhuyin}>
            <input
              id={`${id}-zhuyin`}
              className={styles.input}
              lang="zh-TW"
              value={form.zhuyin}
              placeholder={t('wordEdit.zhuyinPlaceholder')}
              autoComplete="off"
              aria-invalid={!!errors.zhuyin}
              aria-describedby={`${id}-reading-hint${errors.zhuyin ? ` ${id}-zhuyin-error` : ''}`}
              onChange={(e) => update({ zhuyin: e.target.value })}
              onBlur={onReadingBlur}
            />
          </Field>
          <Field id={`${id}-pinyin`} label={t('wordEdit.pinyin')} error={errors.pinyin}>
            <input
              id={`${id}-pinyin`}
              className={styles.input}
              lang="zh-Latn-pinyin"
              value={form.pinyin}
              placeholder={t('wordEdit.pinyinPlaceholder')}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-invalid={!!errors.pinyin}
              aria-describedby={`${id}-reading-hint${errors.pinyin ? ` ${id}-pinyin-error` : ''}`}
              onChange={(e) => update({ pinyin: e.target.value })}
              onBlur={onReadingBlur}
            />
          </Field>
        </div>
        {readingNote}
      </fieldset>

      <fieldset className={styles.group}>
        <legend>{t('wordEdit.examples', { max: LIMITS.examples })}</legend>
        {form.examples.length === 0 && <p className="muted">{t('wordEdit.noExamples')}</p>}
        <ol className={styles.examples}>
          {form.examples.map((ex, i) => {
            const n = i + 1
            const err = exampleErrors[i]
            return (
              <li key={i} className={styles.example}>
                <div className={styles.exampleHead}>
                  <span className={styles.exampleNo}>{t('wordEdit.exampleNo', { n })}</span>
                  <button
                    type="button"
                    className={styles.iconButton}
                    aria-label={t('wordEdit.removeExample', { n })}
                    title={t('wordEdit.removeExample', { n })}
                    onClick={() => update({ examples: form.examples.filter((_, j) => j !== i) })}
                  >
                    <CloseIcon />
                  </button>
                </div>
                <label className={styles.subLabel} htmlFor={`${id}-ex${i}`}>
                  {t('wordEdit.exampleText')}
                </label>
                <textarea
                  id={`${id}-ex${i}`}
                  className={styles.input}
                  lang="zh-TW"
                  rows={2}
                  value={ex.text}
                  aria-invalid={!!err}
                  aria-describedby={err ? `${id}-ex${i}-error` : undefined}
                  onChange={(e) => setExample(i, { text: e.target.value })}
                />
                <label className={styles.subLabel} htmlFor={`${id}-tr${i}`}>
                  {t('wordEdit.exampleTranslation')}
                </label>
                <textarea
                  id={`${id}-tr${i}`}
                  className={styles.input}
                  rows={2}
                  value={ex.translation}
                  onChange={(e) => setExample(i, { translation: e.target.value })}
                />
                {err && (
                  <p id={`${id}-ex${i}-error`} className={styles.fieldError}>
                    {err}
                  </p>
                )}
              </li>
            )
          })}
        </ol>
        {errors.examples && <p className={styles.fieldError}>{errors.examples}</p>}
        <button
          type="button"
          className={`button ${styles.addExample}`}
          disabled={form.examples.length >= LIMITS.examples}
          onClick={() => update({ examples: [...form.examples, { text: '', translation: '' }] })}
        >
          <PlusIcon />
          {t('wordEdit.addExample')}
        </button>
      </fieldset>

      <fieldset className={styles.group}>
        <legend>{t('wordEdit.tags')}</legend>
        {form.tags.length === 0 ? (
          <p className="muted">{t('tags.noTags')}</p>
        ) : (
          <ul className={styles.chips}>
            {form.tags.map((tag) => (
              <li key={tag} className={styles.chip}>
                <span>{tag}</span>
                <button
                  type="button"
                  className={styles.chipRemove}
                  aria-label={t('tags.removeTag', { tag })}
                  onClick={() => update({ tags: form.tags.filter((x) => x !== tag) })}
                >
                  <CloseIcon />
                </button>
              </li>
            ))}
          </ul>
        )}
        <TagField
          label={t('tags.newTag')}
          value={form.tagInput}
          onChange={(tagInput) => update({ tagInput })}
          suggestions={allTags.filter((x) => !form.tags.includes(x))}
          error={tagInputError}
          onEnter={addTag}
          action={
            <button type="button" className="button" disabled={!canAddTag} onClick={addTag}>
              {t('tags.add')}
            </button>
          }
        />
        {errors.tagInput && !tagInputError && (
          <p className={styles.fieldError}>{errors.tagInput}</p>
        )}
        {errors.tags && <p className={styles.fieldError}>{errors.tags}</p>}
      </fieldset>
    </div>
  )
}

function Field({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string
  label: string
  required?: boolean
  error?: string
  children: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div className={styles.field}>
      <label htmlFor={id}>
        {label}
        {required && <span className={styles.required}>{t('wordEdit.required')}</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className={styles.fieldError}>
          {error}
        </p>
      )}
    </div>
  )
}

/** 重複の確認（FR-WORDS-17） */
function DuplicateView({
  existing,
  busy,
  canOpenExisting,
  onBack,
  onOpen,
  onSaveAnyway,
}: {
  existing: Word
  busy: boolean
  canOpenExisting: boolean
  onBack(): void
  onOpen(): void
  onSaveAnyway(): void
}) {
  const { t } = useTranslation()
  const reading = [existing.zhuyin, existing.pinyin].filter(Boolean).join(' · ')
  return (
    <>
      <p className={styles.dupTitle} role="alert">
        {t('wordEdit.dupTitle')}
      </p>
      <p>{t('wordEdit.dupBody')}</p>
      <div className={styles.dupWord}>
        <p className={styles.dupHanzi} lang="zh-TW">
          {existing.hanzi}
        </p>
        {reading && (
          <p className={styles.dupReading} lang="zh-TW">
            {reading}
          </p>
        )}
        <p>{existing.meaning}</p>
      </div>
      <p className="muted">{t('wordEdit.dupNote')}</p>
      <DialogActions>
        <button type="button" className="button" disabled={busy} onClick={onBack}>
          {t('wordEdit.backToForm')}
        </button>
        {canOpenExisting && (
          <button type="button" className="button" disabled={busy} onClick={onOpen}>
            {t('wordEdit.openExisting')}
          </button>
        )}
        <button
          type="button"
          className="button button--primary"
          disabled={busy}
          onClick={onSaveAnyway}
        >
          {t('wordEdit.saveAnyway')}
        </button>
      </DialogActions>
    </>
  )
}
