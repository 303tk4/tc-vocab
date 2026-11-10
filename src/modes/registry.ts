import { conversationMode } from './conversation'
import { flashcardMode } from './flashcard'
import type { AnyStudyMode } from './types'

/**
 * 登録済みの学習モード（表示順）。
 * 新しいモードは src/modes/<modeId>/ に作り、ここに追加するだけでホームに表示される（FR-PLUG-01）。
 */
export const modes: readonly AnyStudyMode[] = [flashcardMode, conversationMode]

export function getMode(id: string): AnyStudyMode | undefined {
  return modes.find((mode) => mode.id === id)
}
