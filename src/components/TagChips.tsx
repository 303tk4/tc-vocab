import styles from './TagChips.module.css'

interface Props {
  legend: string
  tags: readonly string[]
  selected: readonly string[]
  onToggle(tag: string): void
}

/** 複数選択できるタグのボタン列（押した状態を aria-pressed で示す） */
export function TagChips({ legend, tags, selected, onToggle }: Props) {
  return (
    <fieldset className={styles.root}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.list}>
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            className={styles.tag}
            aria-pressed={selected.includes(tag)}
            onClick={() => onToggle(tag)}
          >
            {tag}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
