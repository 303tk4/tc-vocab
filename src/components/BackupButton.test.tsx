import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../i18n'
import {
  canPickSaveLocation,
  canShareBackup,
  saveBackupFile,
  shareBackupFile,
} from '../services/backup'
import { BackupButton } from './BackupButton'

vi.mock('../services/backup', () => ({
  canShareBackup: vi.fn(() => true),
  canPickSaveLocation: vi.fn(() => false),
  createBackupFile: vi.fn(() =>
    Promise.resolve({ file: new File(['{}'], 'tc-vocab-backup.json'), createdAt: 1 }),
  ),
  saveBackupFile: vi.fn(() => Promise.resolve('saved')),
  shareBackupFile: vi.fn(() => Promise.resolve('saved')),
}))

describe('バックアップファイルを作成する（FR-SET-11、仕様書 10.4）', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ja')
    vi.mocked(canShareBackup).mockReturnValue(true)
    vi.mocked(canPickSaveLocation).mockReturnValue(false)
    vi.mocked(saveBackupFile).mockClear()
    vi.mocked(shareBackupFile).mockClear().mockResolvedValue('saved')
  })

  it('押すと保存方法を選ばせ、「ほかのアプリと共有」で共有する', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    render(<BackupButton onSaved={onSaved} />)
    await user.click(screen.getByRole('button', { name: 'バックアップファイルを作成する' }))

    const dialog = await screen.findByRole('dialog', {
      name: 'バックアップファイルの保存方法を選んでください',
    })
    expect(dialog).toHaveTextContent('ダウンロード」フォルダ')
    await user.click(screen.getByRole('button', { name: /^ほかのアプリと共有/ }))
    expect(shareBackupFile).toHaveBeenCalledOnce()
    expect(await screen.findByRole('status')).toHaveTextContent(
      'バックアップファイルを作成しました。',
    )
    expect(onSaved).toHaveBeenCalledOnce()
  })

  it('保存先を選べるブラウザでは「保存先を選んで保存」と示す', async () => {
    vi.mocked(canPickSaveLocation).mockReturnValue(true)
    const user = userEvent.setup()
    render(<BackupButton />)
    await user.click(screen.getByRole('button', { name: 'バックアップファイルを作成する' }))
    await user.click(await screen.findByRole('button', { name: '保存先を選んで保存' }))
    expect(saveBackupFile).toHaveBeenCalledOnce()
  })

  it('共有を取りやめたら、作成したとは示さない', async () => {
    vi.mocked(shareBackupFile).mockResolvedValue('cancelled')
    const user = userEvent.setup()
    const onSaved = vi.fn()
    render(<BackupButton onSaved={onSaved} />)
    await user.click(screen.getByRole('button', { name: 'バックアップファイルを作成する' }))
    await user.click(await screen.findByRole('button', { name: /^ほかのアプリと共有/ }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('「キャンセル」では何もしない', async () => {
    const user = userEvent.setup()
    render(<BackupButton />)
    await user.click(screen.getByRole('button', { name: 'バックアップファイルを作成する' }))
    await user.click(await screen.findByRole('button', { name: 'キャンセル' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(saveBackupFile).not.toHaveBeenCalled()
    expect(shareBackupFile).not.toHaveBeenCalled()
  })

  it('共有できないブラウザでは、選ばせずにすぐ保存する', async () => {
    vi.mocked(canShareBackup).mockReturnValue(false)
    const user = userEvent.setup()
    render(<BackupButton />)
    await user.click(screen.getByRole('button', { name: 'バックアップファイルを作成する' }))
    expect(saveBackupFile).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByRole('status')).toHaveTextContent(
      'バックアップファイルを作成しました。',
    )
  })
})
