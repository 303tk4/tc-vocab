import { describe, expect, it } from 'vitest'
import { makeWord } from '../test/fixtures'
import type { Progress } from '../types/word'
import { planImport, previewImport, strategiesFor } from './importer'
import type { ParsedFile } from './parsed'
import type { WordDraft } from './validate'

const NOW = 1_800_000_000_000

function draft(hanzi: string, pinyin: string, extra: Partial<WordDraft> = {}): WordDraft {
  return { hanzi, zhuyin: '', pinyin, meaning: `${hanzi}の意味`, examples: [], tags: [], ...extra }
}

function file(drafts: (WordDraft | null)[], progress: Progress[] = []): ParsedFile {
  return {
    kind: 'json',
    rows: drafts.map((word, position) =>
      word
        ? { position, word, errors: [] }
        : { position, errors: [{ code: 'required', field: 'hanzi' }] },
    ),
    progress,
  }
}

const ids = () => {
  let n = 0
  return () => `new${++n}`
}

describe('previewImport', () => {
  it('新規・重複（登録済みとファイル内）・エラーを数える', () => {
    const existing = [makeWord({ hanzi: '茶', pinyin: 'chá' })]
    const preview = previewImport(
      file([draft('茶', 'CHÁ'), draft('水', 'shuǐ'), draft('水', 'shuǐ'), null]),
      existing,
    )
    expect(preview.rows.map((r) => r.status)).toEqual(['duplicate', 'new', 'duplicate', 'error'])
    expect(preview.counts).toEqual({ new: 1, duplicate: 2, error: 1 })
  })
})

describe('planImport', () => {
  const existing = [makeWord({ id: 'tea', hanzi: '茶', pinyin: 'chá', tags: ['旧'] })]
  const input = file([draft('茶', 'chá', { tags: ['新'] }), draft('水', 'shuǐ'), null])

  it('スキップ：重複は取り込まず、エラー行も取り込まない', () => {
    const plan = planImport(input, existing, { strategy: 'skip', now: NOW, newId: ids() })
    expect(plan).toMatchObject({ added: 1, updated: 0, skipped: 1 })
    expect(plan.words).toEqual([
      {
        id: 'new1',
        ...draft('水', 'shuǐ'),
        createdAt: NOW,
        updatedAt: NOW,
      },
    ])
  })

  it('上書き：既存の id と作成日時を保ったまま内容を置き換える', () => {
    const plan = planImport(input, existing, { strategy: 'overwrite', now: NOW, newId: ids() })
    expect(plan).toMatchObject({ added: 1, updated: 1, skipped: 0 })
    expect(plan.words[0]).toEqual({
      ...existing[0],
      ...draft('茶', 'chá', { tags: ['新'] }),
      updatedAt: NOW,
    })
  })

  it('両方残す：重複も新しい単語として追加し、その数を数える', () => {
    const plan = planImport(input, existing, { strategy: 'keepBoth', now: NOW, newId: ids() })
    expect(plan).toMatchObject({ added: 2, updated: 0, skipped: 0, duplicatesAdded: 1 })
    expect(plan.words.map((w) => w.id)).toEqual(['new1', 'new2'])
  })

  it('ファイル内の重複は、上書きなら後の行の内容になる', () => {
    const plan = planImport(
      file([draft('水', 'shuǐ', { meaning: '1' }), draft('水', 'shuǐ', { meaning: '2' })]),
      [],
      { strategy: 'overwrite', now: NOW, newId: ids() },
    )
    expect(plan).toMatchObject({ added: 1, updated: 0 })
    expect(plan.words.map((w) => w.meaning)).toEqual(['2'])
  })

  it('共通のタグを全単語に付ける（既に付いていれば重ねない）', () => {
    const plan = planImport(
      file([draft('水', 'shuǐ', { tags: ['x'] }), draft('火', 'huǒ', { tags: ['追加'] })]),
      [],
      { strategy: 'skip', extraTag: ' 追加 ', newId: ids() },
    )
    expect(plan.words.map((w) => w.tags)).toEqual([['x', '追加'], ['追加']])
  })

  it('ファイルの id・日時を引き継ぎ、使用中の id は振り直して進捗も付け替える', () => {
    const progress: Progress[] = [
      { modeId: 'm', wordId: 'free', due: 1, state: {}, updatedAt: 1 },
      { modeId: 'm', wordId: 'tea', due: 2, state: {}, updatedAt: 2 },
      { modeId: 'm', wordId: 'unknown', due: 3, state: {}, updatedAt: 3 },
    ]
    const plan = planImport(
      file(
        [
          draft('水', 'shuǐ', { id: 'free', createdAt: 10, updatedAt: 20 }),
          draft('火', 'huǒ', { id: 'tea' }), // 既存の「茶」と id だけが同じ
        ],
        progress,
      ),
      existing,
      { strategy: 'skip', now: NOW, newId: ids() },
    )
    expect(plan.words.map((w) => [w.id, w.createdAt, w.updatedAt])).toEqual([
      ['free', 10, 20],
      ['new1', NOW, NOW],
    ])
    expect(plan.progress.map((p) => [p.wordId, p.due])).toEqual([
      ['free', 1],
      ['new1', 2],
    ])
  })

  it('スキップした単語の進捗は取り込まず、上書きした単語の進捗は既存の id に付け替える', () => {
    const progress: Progress[] = [{ modeId: 'm', wordId: 'f1', due: 1, state: {}, updatedAt: 1 }]
    const source = file([draft('茶', 'chá', { id: 'f1' })], progress)
    expect(planImport(source, existing, { strategy: 'skip' }).progress).toEqual([])
    expect(
      planImport(source, existing, { strategy: 'overwrite' }).progress.map((p) => p.wordId),
    ).toEqual(['tea'])
  })

  it('統合：既存の id・読みを残し、意味・例文・タグを両方残す（仕様書 4.5）', () => {
    const old = makeWord({
      id: 'w',
      hanzi: '水',
      zhuyin: '',
      pinyin: 'shuǐ',
      meaning: '水',
      tags: ['旧'],
      createdAt: 5,
    })
    const plan = planImport(
      file([draft('水', '', { zhuyin: 'ㄕㄨㄟˇ', meaning: 'water', tags: ['新'] })]),
      [old],
      { strategy: 'merge', now: NOW, newId: ids() },
    )
    expect(plan).toMatchObject({ added: 0, updated: 0, merged: 1, keepExistingProgress: ['w'] })
    expect(plan.words).toEqual([
      {
        ...old,
        zhuyin: 'ㄕㄨㄟˇ',
        meaning: '水 / water',
        tags: ['旧', '新'],
        updatedAt: NOW,
      },
    ])
  })

  it('統合すると上限を超える単語は、別の単語として追加する', () => {
    const old = makeWord({ hanzi: '水', pinyin: '', meaning: 'a'.repeat(300) })
    const plan = planImport(file([draft('水', '', { meaning: 'b'.repeat(300) })]), [old], {
      strategy: 'merge',
      now: NOW,
      newId: ids(),
    })
    expect(plan).toMatchObject({ added: 1, merged: 0, mergeOverflow: 1, duplicatesAdded: 1 })
  })
})

describe('拼音が空の単語の重複（仕様書 6.1）', () => {
  it('拼音を入力していない行も、繁体字が同じなら重複として扱う', () => {
    const existing = [makeWord({ hanzi: '水', pinyin: 'shuǐ' })]
    const preview = previewImport(file([draft('水', ''), draft('火', '')]), existing)
    expect(preview.counts).toEqual({ new: 1, duplicate: 1, error: 0 })
  })

  it('選べる扱い：上書きは JSON だけ', () => {
    expect(strategiesFor('csv')).toEqual(['skip', 'keepBoth', 'merge'])
    expect(strategiesFor('json')).toContain('overwrite')
  })
})
