import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '../../components/Dialog'
import { SegmentedControl } from '../../components/SegmentedControl'
import { TagChips } from '../../components/TagChips'
import { listProgressForWords } from '../../db/repos/words'
import { buildCsv, countExampleLoss } from '../../io/csv'
import { downloadText, exportFileName } from '../../io/download'
import { buildJson } from '../../io/json'
import type { Word } from '../../types/word'
import { sortWords } from './search'
import styles from './WordsPage.module.css'

type Format = 'json' | 'csv'
type Target = 'all' | 'tags'

interface Props {
  open: boolean
  words: readonly Word[]
  tags: readonly string[]
  onClose(): void
  onExported(count: number): void
}

export function ExportDialog({ open, words, tags, onClose, onExported }: Props) {
  const { t } = useTranslation()
  const [format, setFormat] = useState<Format>('json')
  const [target, setTarget] = useState<Target>('all')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [includeProgress, setIncludeProgress] = useState(false)
  const [error, setError] = useState('')

  const activeTags = selectedTags.filter((tag) => tags.includes(tag))
  const targetWords =
    target === 'all' ? words : words.filter((w) => w.tags.some((tag) => activeTags.includes(tag)))
  const exampleLoss = format === 'csv' ? countExampleLoss(targetWords) : 0

  const toggleTag = (tag: string) =>
    setSelectedTags(
      activeTags.includes(tag) ? activeTags.filter((x) => x !== tag) : [...activeTags, tag],
    )

  const download = async () => {
    setError('')
    try {
      const list = sortWords(targetWords)
      if (format === 'json') {
        const progress = includeProgress
          ? await listProgressForWords(list.map((w) => w.id))
          : undefined
        downloadText(exportFileName('json'), buildJson(list, progress), 'application/json')
      } else {
        downloadText(exportFileName('csv'), buildCsv(list), 'text/csv;charset=utf-8')
      }
      onExported(list.length)
    } catch {
      setError(t('io.exportFailed'))
    }
  }

  return (
    <Dialog
      open={open}
      title={t('io.exportTitle')}
      onClose={onClose}
      actions={
        <>
          <button type="button" className="button" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="button button--primary"
            disabled={targetWords.length === 0}
            onClick={() => void download()}
          >
            {t('io.download')}
          </button>
        </>
      }
    >
      <SegmentedControl<Format>
        label={t('io.format')}
        value={format}
        options={[
          { value: 'json', label: 'JSON' },
          { value: 'csv', label: 'CSV' },
        ]}
        onChange={setFormat}
      />
      <SegmentedControl<Target>
        label={t('io.target')}
        value={target}
        options={[
          { value: 'all', label: t('io.targetAll') },
          { value: 'tags', label: t('io.targetTags') },
        ]}
        onChange={setTarget}
      />
      {target === 'tags' && (
        <TagChips
          legend={t('io.chooseTags')}
          tags={tags}
          selected={activeTags}
          onToggle={toggleTag}
        />
      )}
      {format === 'json' && (
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={includeProgress}
            onChange={(e) => setIncludeProgress(e.target.checked)}
          />
          {t('io.includeProgress')}
        </label>
      )}
      <p className={styles.strong}>{t('io.exportCount', { count: targetWords.length })}</p>
      {exampleLoss > 0 && (
        <p className={styles.warning} role="note">
          {t('io.csvExampleLoss', { count: exampleLoss })}
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </Dialog>
  )
}
