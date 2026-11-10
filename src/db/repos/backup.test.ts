import { describe, expect, it } from 'vitest'
import { buildBackup, parseBackup } from '../../io/backup'
import { jieyun, tricky } from '../../test/fixtures'
import { db } from '../schema'
import {
  countData,
  loadBackupContent,
  loadReminderInput,
  recordBackup,
  resetAllData,
  restoreBackup,
} from './backup'

async function seed() {
  await db.words.bulkPut([jieyun, tricky])
  await db.progress.put({
    modeId: 'flashcard',
    wordId: 'jieyun',
    due: 5,
    state: { ease: 2.5 },
    updatedAt: 1,
  })
  await db.sessions.add({
    modeId: 'flashcard',
    startedAt: 10,
    finishedAt: 20,
    summary: { good: 1 },
  })
  await db.settings.bulkPut([
    { key: 'app.theme', value: 'dark' },
    { key: 'app.installHintHidden', value: true },
  ])
}

describe('バックアップの保存と復元（FR-SET-11・12）', () => {
  it('保存したものを空の DB に復元すると、全データが元に戻る', async () => {
    await seed()
    const before = await loadBackupContent()
    const exportedAt = new Date('2026-11-10T00:00:00Z')
    const backup = parseBackup(buildBackup(before, '1.4.0', exportedAt))

    await resetAllData()
    expect(await countData()).toEqual({ words: 0, progress: 0, sessions: 0 })
    await db.settings.put({ key: 'app.storageNoticeShown', value: true })

    await restoreBackup(backup)
    const after = await loadBackupContent()
    expect(after.words).toEqual(before.words)
    expect(after.progress).toEqual(before.progress)
    expect(after.sessions).toEqual(before.sessions)
    // 端末の案内の設定は、この端末の値を残す。最後のバックアップはファイルの日時
    expect(Object.fromEntries(after.settings.map((s) => [s.key, s.value]))).toEqual({
      'app.theme': 'dark',
      'app.storageNoticeShown': true,
      'app.lastBackupAt': exportedAt.getTime(),
    })
  })

  it('復元は今のデータを全部置き換える', async () => {
    await seed()
    const backup = parseBackup(
      buildBackup({ words: [jieyun], progress: [], sessions: [], settings: [] }, '1.4.0'),
    )
    await restoreBackup(backup)
    expect(await countData()).toEqual({ words: 1, progress: 0, sessions: 0 })
    expect(await db.settings.get('app.theme')).toBeUndefined()
  })

  it('途中で失敗したら何も変えない（NFR-07）', async () => {
    await seed()
    const backup = parseBackup(
      buildBackup({ words: [jieyun], progress: [], sessions: [], settings: [] }, '1.4.0'),
    )
    // 同じ主キーの履歴を2つ入れて、書き込みを失敗させる
    backup.sessions = [
      { id: 1, modeId: 'x', startedAt: 1, finishedAt: 2, summary: {} },
      { id: 1, modeId: 'x', startedAt: 1, finishedAt: 2, summary: {} },
    ]
    await expect(restoreBackup(backup)).rejects.toThrow()
    expect(await countData()).toEqual({ words: 2, progress: 1, sessions: 1 })
  })

  it('保存した日時を記録する', async () => {
    await recordBackup(1234)
    expect(await db.settings.get('app.lastBackupAt')).toEqual({
      key: 'app.lastBackupAt',
      value: 1234,
    })
  })
})

describe('初期化（FR-SET-13）', () => {
  it('単語・進捗・履歴・設定をすべて消す', async () => {
    await seed()
    await resetAllData()
    expect(await countData()).toEqual({ words: 0, progress: 0, sessions: 0 })
    expect(await db.settings.count()).toBe(0)
  })
})

describe('バックアップの勧めの判定に使う値（FR-SET-14）', () => {
  it('単語の更新日時と学習の開始日時の最小と最大を読む', async () => {
    await seed()
    expect(await loadReminderInput(99)).toEqual({
      now: 99,
      oldestWordUpdatedAt: Math.min(jieyun.updatedAt, tricky.updatedAt),
      latestWordUpdatedAt: Math.max(jieyun.updatedAt, tricky.updatedAt),
      firstSessionAt: 10,
      latestSessionAt: 10,
    })
  })
})
