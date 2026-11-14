import { useEffect, useId, useRef, useState, type FocusEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { TextSizeIcon } from '../components/icons'
import { SegmentedControl } from '../components/SegmentedControl'
import { useSettings } from '../settings/context'
import { FONT_SCALES } from '../settings/types'
import styles from './FontScaleMenu.module.css'

/**
 * 画面上部のバーの、文字の大きさのボタンとメニュー（FR-NAV-02、仕様書 4.6）。
 * 設定画面の「文字の大きさ」（FR-SET-02）と同じ設定を変える。選ぶとすぐ反映し、メニューは開いたままにする
 * （矢印キーで選び比べられるように）。外を押す・Esc・ボタンをもう一度押すと閉じる
 */
export function FontScaleMenu() {
  const { t } = useTranslation()
  const { settings, update } = useSettings()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    // 開いたら、選ばれている選択肢にフォーカスを移す
    rootRef.current?.querySelector<HTMLInputElement>('input:checked')?.focus()
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // Tab でメニューの外へ出たら閉じる
  const onBlur = (event: FocusEvent) => {
    if (event.relatedTarget && !rootRef.current?.contains(event.relatedTarget as Node)) {
      setOpen(false)
    }
  }

  return (
    <div className={styles.root} ref={rootRef} onBlur={onBlur}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.button}
        aria-label={t('settings.fontScale')}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <TextSizeIcon />
      </button>
      {open && (
        <div id={panelId} className={styles.panel}>
          <SegmentedControl
            label={t('settings.fontScale')}
            value={settings.fontScale}
            options={FONT_SCALES.map((s) => ({ value: s, label: t(`settings.fontScales.${s}`) }))}
            onChange={(fontScale) => update({ fontScale })}
          />
        </div>
      )}
    </div>
  )
}
