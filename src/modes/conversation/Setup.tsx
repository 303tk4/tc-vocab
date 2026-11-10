// 場面別会話の準備画面（仕様書 18.1 FR-CONV-01・09・22、18.2 FR-CONV-05〜07）
import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SegmentedControl } from '../../components/SegmentedControl'
import { languageName } from '../../i18n/languages'
import type { SetupProps } from '../types'
import { KIND_FILTERS, sanitizeOptions, type ConversationOptions } from './options'
import {
  availableLanguages,
  countItems,
  loadSceneIndex,
  loadTranslation,
  pickLanguage,
  sceneCounts,
  studiedItemIds,
  sortScenes,
  type PhraseTranslation,
  type SceneIndex,
} from './scenes'
import styles from './Setup.module.css'

/** 選択肢がこれより多い言語は、ボタンではなく一覧（select）で選ぶ */
const MAX_LANGUAGE_BUTTONS = 4

export default function ConversationSetup({
  options: rawOptions,
  onChange,
  onCanStartChange,
  progress,
}: SetupProps<ConversationOptions>) {
  const { t, i18n } = useTranslation('mode.conversation')
  const { t: tc } = useTranslation()
  const id = useId()
  const options = sanitizeOptions(rawOptions)
  const [index, setIndex] = useState<SceneIndex | null>(null)
  const [failed, setFailed] = useState(false)
  const [translation, setTranslation] = useState<PhraseTranslation | null>(null)
  // 進捗の記録がある項目の ID（r0001 など。FR-CONV-22）。読めなければ数を示さない
  const [studiedIds, setStudiedIds] = useState<ReadonlySet<string> | null>(null)

  useEffect(() => {
    let cancelled = false
    progress.list().then(
      (rows) => !cancelled && setStudiedIds(studiedItemIds(rows.map((r) => r.wordId))),
      (error: unknown) => console.error('学習の進捗を読み込めませんでした', error),
    )
    return () => {
      cancelled = true
    }
  }, [progress])

  useEffect(() => {
    let cancelled = false
    loadSceneIndex().then(
      (loaded) => !cancelled && setIndex(loaded),
      (error: unknown) => {
        console.error('場面の一覧を読み込めませんでした', error)
        if (!cancelled) setFailed(true)
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  const languages = index ? availableLanguages(index) : []
  // 訓練の言語（FR-CONV-06）。保存した言語 → UI 言語 → 英語の順に、用意のあるもの
  const language = index ? pickLanguage(languages, options.language, i18n.language) : null

  // 場面の名前を訓練の言語で示すため、その言語の訳を読む
  useEffect(() => {
    if (!language) return
    let cancelled = false
    loadTranslation(language).then(
      (loaded) => !cancelled && setTranslation(loaded),
      (error: unknown) => console.error('場面の名前を読み込めませんでした', error),
    )
    return () => {
      cancelled = true
    }
  }, [language])

  const count =
    index && language
      ? countItems({ index, sceneIds: options.scenes, kinds: options.kinds, language })
      : 0

  // 開始できるか（FR-MODE-01）。出せる項目が1つ以上あるとき
  useEffect(() => {
    onCanStartChange?.(count > 0)
  }, [count, onCanStartChange])

  if (failed) return <p role="alert">{t('setup.loadFailed')}</p>
  if (!index || !language) return <p className="muted">{tc('common.loading')}</p>

  const change = (patch: Partial<ConversationOptions>) => onChange({ ...options, ...patch })
  const toggleScene = (sceneId: string) =>
    change({
      scenes: options.scenes.includes(sceneId)
        ? options.scenes.filter((s) => s !== sceneId)
        : [...options.scenes, sceneId],
    })

  const languageOptions = languages.map((l) => ({ value: l, label: languageName(l), lang: l }))

  return (
    <div className="stack">
      {/* 訓練の言語は準備画面の最初に置く（FR-CONV-05） */}
      <div className={styles.field}>
        {languages.length <= MAX_LANGUAGE_BUTTONS ? (
          <SegmentedControl
            label={t('setup.language')}
            value={language}
            options={languageOptions}
            onChange={(value) => change({ language: value })}
          />
        ) : (
          <>
            <label htmlFor={`${id}-lang`} className={styles.label}>
              {t('setup.language')}
            </label>
            <select
              id={`${id}-lang`}
              className={styles.select}
              value={language}
              onChange={(e) => change({ language: e.target.value })}
            >
              {languageOptions.map((o) => (
                <option key={o.value} value={o.value} lang={o.lang}>
                  {o.label}
                </option>
              ))}
            </select>
          </>
        )}
        <p className={styles.hint}>{t('setup.languageHint')}</p>
      </div>

      <fieldset className={styles.scenes}>
        <legend className={styles.label}>{t('setup.scenes')}</legend>
        <p className={styles.hint}>{t('setup.scenesHint')}</p>
        <ul className={styles.sceneList}>
          {sortScenes(index.scenes).map((scene) => {
            const usable = scene.languages.includes(language)
            const name = usable ? translation?.scenes[scene.id] : undefined
            const counts = studiedIds && sceneCounts(scene, studiedIds)
            return (
              <li key={scene.id}>
                <label className={styles.scene} data-disabled={!usable || undefined}>
                  <input
                    type="checkbox"
                    checked={usable && options.scenes.includes(scene.id)}
                    disabled={!usable}
                    onChange={() => toggleScene(scene.id)}
                  />
                  <span className={styles.sceneText}>
                    <span className={styles.sceneName}>
                      <span lang="zh-TW">{scene.name}</span>
                      {name && (
                        <span className={styles.sceneLocal} lang={language}>
                          {name}
                        </span>
                      )}
                    </span>
                    {/* 上級向けの印（FR-CONV-09） */}
                    {scene.level >= 2 && (
                      <span className={styles.badge}>{t('setup.advanced')}</span>
                    )}
                    {/* 出題済み / 登録の数（FR-CONV-22） */}
                    {counts && (
                      <span className={styles.counts}>
                        {t('setup.sceneCounts', { studied: counts.studied, total: counts.total })}
                      </span>
                    )}
                    {/* 選んだ言語の用意が無い場面（FR-CONV-07） */}
                    {!usable && (
                      <span className={styles.onlyIn}>
                        {t('setup.onlyIn', {
                          languages: scene.languages.map(languageName).join('・'),
                        })}
                      </span>
                    )}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      </fieldset>

      <div className={styles.field}>
        <SegmentedControl
          label={t('setup.kinds')}
          value={options.kinds}
          options={KIND_FILTERS.map((k) => ({ value: k, label: t(`setup.kindOptions.${k}`) }))}
          onChange={(kinds) => change({ kinds })}
        />
      </div>

      <p className="muted" aria-live="polite">
        {count > 0 ? t('setup.targetItems', { count }) : t('setup.noItems')}
      </p>
      <p className={styles.hint}>{t('setup.changeNote')}</p>
    </div>
  )
}
