import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PencilIcon, TagIcon } from '../../components/icons'
import type { Word } from '../../types/word'
import styles from './WordList.module.css'

interface Props {
  words: readonly Word[]
  selected: ReadonlySet<string>
  onToggle(id: string): void
  onEditTags(word: Word): void
  /** 単語の編集を開く（FR-WORDS-16） */
  onEdit(word: Word): void
}

/** 単語の一覧。件数が多くても軽く動くよう、見えている行だけを描画する（FR-WORDS-01） */
export function WordList({ words, selected, onToggle, onEditTags, onEdit }: Props) {
  const [listEl, setListEl] = useState<HTMLUListElement | null>(null)
  // 一覧より上にある要素の高さ。ページ全体のスクロール位置との差に使う
  const scrollMargin = listEl ? listEl.getBoundingClientRect().top + window.scrollY : 0

  const virtualizer = useWindowVirtualizer({
    count: words.length,
    estimateSize: () => 104,
    overscan: 8,
    scrollMargin,
    getItemKey: (index) => words[index].id,
  })

  return (
    <ul ref={setListEl} className={styles.list} style={{ height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map((item) => {
        const word = words[item.index]
        return (
          <li
            key={item.key}
            data-index={item.index}
            ref={virtualizer.measureElement}
            className={styles.item}
            style={{ transform: `translateY(${item.start - scrollMargin}px)` }}
          >
            <WordRow
              word={word}
              checked={selected.has(word.id)}
              onToggle={() => onToggle(word.id)}
              onEditTags={() => onEditTags(word)}
              onEdit={() => onEdit(word)}
            />
          </li>
        )
      })}
    </ul>
  )
}

function WordRow(props: {
  word: Word
  checked: boolean
  onToggle(): void
  onEditTags(): void
  onEdit(): void
}) {
  const { t } = useTranslation()
  const { word } = props
  return (
    <div className={styles.row}>
      <label className={styles.select}>
        <input
          type="checkbox"
          className={styles.check}
          checked={props.checked}
          onChange={props.onToggle}
          aria-label={t('words.selectWord', { hanzi: word.hanzi })}
        />
        <span className={styles.body}>
          <span className={styles.head}>
            <span className={styles.hanzi} lang="zh-TW">
              {word.hanzi}
            </span>
            {(word.zhuyin || word.pinyin) && (
              <span className={styles.reading}>
                {/* 注音と拼音で言語の指定を分ける（NFR-04） */}
                {word.zhuyin && <span lang="zh-TW">{word.zhuyin}</span>}
                {word.zhuyin && word.pinyin && ' · '}
                {word.pinyin && <span lang="zh-Latn-pinyin">{word.pinyin}</span>}
              </span>
            )}
          </span>
          <span className={styles.meaning}>{word.meaning}</span>
          {word.tags.length > 0 && (
            <span className={styles.tags}>
              {word.tags.map((tag) => (
                <span key={tag} className={styles.tag}>
                  {tag}
                </span>
              ))}
            </span>
          )}
        </span>
      </label>
      <div className={styles.buttons}>
        <button
          type="button"
          className={styles.edit}
          aria-label={t('words.editWord', { hanzi: word.hanzi })}
          title={t('words.editWord', { hanzi: word.hanzi })}
          onClick={props.onEdit}
        >
          <PencilIcon />
        </button>
        <button
          type="button"
          className={styles.edit}
          aria-label={t('tags.editWord', { hanzi: word.hanzi })}
          title={t('tags.editWord', { hanzi: word.hanzi })}
          onClick={props.onEditTags}
        >
          <TagIcon />
        </button>
      </div>
    </div>
  )
}
