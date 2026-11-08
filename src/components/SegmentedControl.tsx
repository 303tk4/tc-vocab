import { useId } from 'react'
import styles from './SegmentedControl.module.css'

interface Option<T extends string> {
  value: T
  label: string
  /** 選択肢自体の言語（例: 言語名を各言語で表示する場合） */
  lang?: string
}

interface Props<T extends string> {
  label: string
  value: T
  options: readonly Option<T>[]
  onChange(value: T): void
}

/** ラジオボタンを使った択一コントロール。キーボードの矢印キーでも操作できる */
export function SegmentedControl<T extends string>({ label, value, options, onChange }: Props<T>) {
  const name = useId()
  return (
    <fieldset className={styles.root}>
      <legend className={styles.legend}>{label}</legend>
      <div className={styles.options}>
        {options.map((option) => (
          <label key={option.value} className={styles.option} lang={option.lang}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
