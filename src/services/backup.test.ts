import { afterEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/schema'
import { canPickSaveLocation, createBackupFile, saveBackupFile, shareBackupFile } from './backup'

const lastBackup = async () => (await db.settings.get('app.lastBackupAt'))?.value

afterEach(() => {
  delete (window as { showSaveFilePicker?: unknown }).showSaveFilePicker
  delete (navigator as { share?: unknown }).share
})

describe('バックアップファイルの保存と共有（FR-SET-11）', () => {
  it('ファイル名と作成日時を付けて作る', async () => {
    const now = new Date(2026, 10, 10, 9, 5)
    const { file, createdAt } = await createBackupFile(now)
    expect(file.name).toBe('tc-vocab-backup-20261110-0905.json')
    expect(createdAt).toBe(now.getTime())
    expect(JSON.parse(await file.text())).toMatchObject({ backup: true })
  })

  it('保存先を選べるときはその画面で書き込み、作成日時を記録する', async () => {
    const write = vi.fn(() => Promise.resolve())
    const close = vi.fn(() => Promise.resolve())
    const picker = vi.fn(() =>
      Promise.resolve({ createWritable: () => Promise.resolve({ write, close }) }),
    )
    Object.assign(window, { showSaveFilePicker: picker })
    expect(canPickSaveLocation()).toBe(true)

    const backup = await createBackupFile(new Date(1000))
    expect(await saveBackupFile(backup)).toBe('saved')
    expect(picker).toHaveBeenCalledWith(
      expect.objectContaining({ suggestedName: backup.file.name }),
    )
    expect(write).toHaveBeenCalledWith(backup.file)
    expect(close).toHaveBeenCalled()
    expect(await lastBackup()).toBe(1000)
  })

  it('保存先の選択を取りやめたら、日時を記録しない', async () => {
    Object.assign(window, {
      showSaveFilePicker: () => Promise.reject(new DOMException('cancel', 'AbortError')),
    })
    expect(await saveBackupFile(await createBackupFile())).toBe('cancelled')
    expect(await lastBackup()).toBeUndefined()
  })

  it('保存先を選ぶ画面を開けなかったときは、ダウンロードとして保存する', async () => {
    Object.assign(window, {
      showSaveFilePicker: () => Promise.reject(new DOMException('no gesture', 'SecurityError')),
    })
    const createObjectURL = vi.fn(() => 'blob:x')
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const backup = await createBackupFile(new Date(3000))
    expect(await saveBackupFile(backup)).toBe('saved')
    expect(click).toHaveBeenCalled()
    expect(await lastBackup()).toBe(3000)
    click.mockRestore()
  })

  it('共有を取りやめたら日時を記録せず、共有したら記録する', async () => {
    const share = vi.fn<() => Promise<void>>(() =>
      Promise.reject(new DOMException('cancel', 'AbortError')),
    )
    Object.assign(navigator, { share })
    const backup = await createBackupFile(new Date(2000))
    expect(await shareBackupFile(backup)).toBe('cancelled')
    expect(await lastBackup()).toBeUndefined()

    share.mockResolvedValue(undefined)
    expect(await shareBackupFile(backup)).toBe('saved')
    expect(share).toHaveBeenLastCalledWith({ files: [backup.file], title: backup.file.name })
    expect(await lastBackup()).toBe(2000)
  })
})
