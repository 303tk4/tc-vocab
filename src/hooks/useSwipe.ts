import { useRef, useState, type PointerEvent } from 'react'

interface Options {
  onSwipeLeft(): void
  onSwipeRight(): void
  /** 要素の幅に対する、評価が決まる移動量の割合（仕様書 8.4） */
  threshold?: number
  enabled?: boolean
}

interface Drag {
  pointerId: number
  startX: number
  startY: number
  width: number
  /** 横方向の操作と判定したか（縦なら画面のスクロールに任せる） */
  horizontal: boolean | null
}

/** 左右のスワイプを検出する。移動量 dx を返すので、要素を指に追従させられる */
export function useSwipe({ onSwipeLeft, onSwipeRight, threshold = 0.25, enabled = true }: Options) {
  const drag = useRef<Drag | null>(null)
  const [dx, setDx] = useState(0)

  const reset = () => {
    drag.current = null
    setDx(0)
  }

  const handlers = {
    onPointerDown(e: PointerEvent<HTMLElement>) {
      if (!enabled || !e.isPrimary || e.button !== 0) return
      // ボタン（読み上げなど）を押したときはスワイプとして扱わない
      if ((e.target as HTMLElement).closest('button, a, input')) return
      drag.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        width: e.currentTarget.getBoundingClientRect().width || 1,
        horizontal: null,
      }
    },
    onPointerMove(e: PointerEvent<HTMLElement>) {
      const d = drag.current
      if (!d || d.pointerId !== e.pointerId) return
      const moveX = e.clientX - d.startX
      const moveY = e.clientY - d.startY
      if (d.horizontal === null) {
        if (Math.abs(moveX) < 8 && Math.abs(moveY) < 8) return
        d.horizontal = Math.abs(moveX) > Math.abs(moveY)
        if (!d.horizontal) {
          reset()
          return
        }
        e.currentTarget.setPointerCapture?.(e.pointerId)
      }
      setDx(moveX)
    },
    onPointerUp(e: PointerEvent<HTMLElement>) {
      const d = drag.current
      if (!d || d.pointerId !== e.pointerId) return
      const moveX = e.clientX - d.startX
      const passed = d.horizontal === true && Math.abs(moveX) > d.width * threshold
      reset()
      if (passed) {
        if (moveX < 0) onSwipeLeft()
        else onSwipeRight()
      }
    },
    onPointerCancel() {
      reset()
    },
  }

  return { dx, dragging: dx !== 0, handlers }
}
