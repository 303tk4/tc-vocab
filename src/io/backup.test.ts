import { describe, expect, it } from 'vitest'
import { jieyun, tricky } from '../test/fixtures'
import type { Progress, SessionRecord } from '../types/word'
import {
  BACKUP_REMINDER_INTERVAL,
  backupFileName,
  BackupFileError,
  buildBackup,
  parseBackup,
  readBackupFile,
  shouldRemindBackup,
  type BackupContent,
} from './backup'

const progress: Progress[] = [
  { modeId: 'flashcard', wordId: 'jieyun', due: 5, state: { ease: 2.5 }, updatedAt: 1 },
  { modeId: 'flashcard', wordId: 'tricky', due: null, state: { ease: 2.3 }, updatedAt: 2 },
]
const sessions: SessionRecord[] = [
  { id: 1, modeId: 'flashcard', startedAt: 10, finishedAt: 20, summary: { good: 3 } },
]
const content: BackupContent = {
  words: [jieyun, tricky],
  progress,
  sessions,
  settings: [
    { key: 'app.theme', value: 'dark' },
    { key: 'mode.flashcard.dailyNew', value: 30 },
    { key: 'app.installHintHidden', value: true },
    { key: 'app.lastBackupAt', value: 5 },
  ],
}
const now = new Date('2026-11-10T05:32:00.000Z')

function backupObject(): Record<string, unknown> {
  return JSON.parse(buildBackup(content, '1.4.0', now)) as Record<string, unknown>
}

function expectError(text: string, code: string) {
  try {
    parseBackup(text)
  } catch (error) {
    expect(error).toBeInstanceOf(BackupFileError)
    expect((error as BackupFileError).code).toBe(code)
    return
  }
  throw new Error('BackupFileError が投げられなかった')
}

describe('バックアップのファイル名（FR-SET-11）', () => {
  it('tc-vocab-backup-YYYYMMDD-HHmm.json（端末の時刻）', () => {
    expect(backupFileName(new Date(2026, 10, 9, 8, 5))).toBe('tc-vocab-backup-20261109-0805.json')
  })
})

describe('バックアップの往復（FR-SET-11・12）', () => {
  it('書き出して読み込むと、単語・進捗・履歴・設定が元に戻る', () => {
    const backup = parseBackup(buildBackup(content, '1.4.0', now))
    expect(backup.exportedAt).toBe(now.getTime())
    expect(backup.appVersion).toBe('1.4.0')
    expect(backup.words).toEqual([jieyun, tricky])
    expect(backup.progress).toEqual(progress)
    expect(backup.sessions).toEqual(sessions)
  })

  it('この端末の案内に関わる設定は含めない', () => {
    const data = backupObject()
    expect(data).toMatchObject({ format: 'tc-vocab', version: 1, backup: true })
    expect(data.settings).toEqual([
      { key: 'app.theme', value: 'dark' },
      { key: 'mode.flashcard.dailyNew', value: 30 },
    ])
  })

  it('ファイルに端末の設定が含まれていても読み飛ばす', () => {
    const data = backupObject()
    data.settings = [{ key: 'app.storageNoticeShown', value: true }]
    expect(parseBackup(JSON.stringify(data)).settings).toEqual([])
  })

  it('存在しない単語の進捗は捨てる', () => {
    const data = backupObject()
    data.words = [jieyun]
    expect(parseBackup(JSON.stringify(data)).progress).toEqual([progress[0]])
  })

  it('id や日時の無い単語には付ける', () => {
    const data = backupObject()
    data.words = [{ hanzi: '茶', meaning: 'お茶' }]
    const [word] = parseBackup(JSON.stringify(data), 1234).words
    expect(word).toMatchObject({ hanzi: '茶', createdAt: 1234, updatedAt: 1234 })
    expect(word?.id).toBeTruthy()
  })
})

describe('復元できないファイル（FR-SET-12）', () => {
  const withData = (patch: Record<string, unknown>) =>
    JSON.stringify({ ...backupObject(), ...patch })

  it.each([
    ['JSON でない', '{', 'invalidJson'],
    ['形式が違う', withData({ format: 'x' }), 'invalidFormat'],
    ['単語のファイル（backup が無い）', withData({ backup: undefined }), 'notBackup'],
    ['新しい版のファイル', withData({ version: 2 }), 'newerVersion'],
    ['書き出し日時が無い', withData({ exportedAt: 'x' }), 'invalidFormat'],
    ['履歴が無い', withData({ sessions: undefined }), 'invalidFormat'],
    ['進捗の形が違う', withData({ progress: [{ modeId: 1 }] }), 'invalidFormat'],
    ['履歴の形が違う', withData({ sessions: [{ modeId: 'x' }] }), 'invalidFormat'],
    ['設定の形が違う', withData({ settings: [{ value: 1 }] }), 'invalidFormat'],
    ['同じ id の単語がある', withData({ words: [jieyun, jieyun] }), 'invalidFormat'],
  ])('%s', (_label, text, code) => {
    expectError(text, code)
  })

  it('エラーのある単語が1語でもあれば、件数を示して復元しない', () => {
    try {
      parseBackup(withData({ words: [jieyun, { hanzi: '' }, { meaning: 'x' }] }))
      throw new Error('投げられなかった')
    } catch (error) {
      expect(error).toMatchObject({ code: 'invalidWords', params: { count: '2' } })
    }
  })

  it('JSON 以外のファイルや空のファイルは読まない', async () => {
    await expect(readBackupFile(new File(['a'], 'a.csv'))).rejects.toMatchObject({
      code: 'unsupportedType',
    })
    await expect(readBackupFile(new File([], 'a.json'))).rejects.toMatchObject({ code: 'empty' })
  })

  it('共有で渡した .txt のファイルからも復元できる（中身は JSON）', async () => {
    const text = buildBackup(content, '1.4.3', now)
    const backup = await readBackupFile(new File([text], 'tc-vocab-backup-20261110-1332.txt'))
    expect(backup.words).toEqual([jieyun, tricky])
  })
})

describe('バックアップの勧め（FR-SET-14）', () => {
  const day = 24 * 60 * 60 * 1000
  const t0 = 1_000 * day

  it('データが無ければ勧めない', () => {
    expect(shouldRemindBackup({ now: t0 })).toBe(false)
  })

  it('バックアップが無ければ、最も古い単語から30日たったら勧める', () => {
    const base = { oldestWordUpdatedAt: t0, latestWordUpdatedAt: t0 }
    expect(shouldRemindBackup({ ...base, now: t0 + BACKUP_REMINDER_INTERVAL - 1 })).toBe(false)
    expect(shouldRemindBackup({ ...base, now: t0 + BACKUP_REMINDER_INTERVAL })).toBe(true)
  })

  it('最初の学習の方が古ければ、そちらを基準にする', () => {
    expect(
      shouldRemindBackup({
        now: t0 + 30 * day,
        oldestWordUpdatedAt: t0 + 10 * day,
        firstSessionAt: t0,
      }),
    ).toBe(true)
  })

  it('バックアップから30日たっても、そのあとに増えていなければ勧めない', () => {
    const input = {
      now: t0 + 40 * day,
      lastBackupAt: t0,
      oldestWordUpdatedAt: t0 - day,
      latestWordUpdatedAt: t0 - day,
      firstSessionAt: t0 - day,
      latestSessionAt: t0 - day,
    }
    expect(shouldRemindBackup(input)).toBe(false)
    expect(shouldRemindBackup({ ...input, latestSessionAt: t0 + day })).toBe(true)
    expect(shouldRemindBackup({ ...input, latestWordUpdatedAt: t0 + day })).toBe(true)
    expect(
      shouldRemindBackup({ ...input, latestWordUpdatedAt: t0 + day, now: t0 + 29 * day }),
    ).toBe(false)
  })

  it('「閉じる」で止めている間は勧めない', () => {
    const input = { now: t0 + 40 * day, oldestWordUpdatedAt: t0 }
    expect(shouldRemindBackup({ ...input, snoozedUntil: t0 + 41 * day })).toBe(false)
    expect(shouldRemindBackup({ ...input, snoozedUntil: t0 + 39 * day })).toBe(true)
  })
})
