import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { en } from '../../app/i18n/en'
import { createLibraryBackup, type BackupResult } from '../../services/backups'
import { LibraryBackup } from './LibraryBackup'

vi.mock('../../services/backups', () => ({ createLibraryBackup: vi.fn() }))
const copy = en.libraryBackup
const created: BackupResult = {
  status: 'created',
  fileName: 'Library.zip',
  createdAt: '2026-10-29T12:00:00.000Z',
  bookCount: 2,
  chapterCount: 7,
  coverCount: 1,
}
beforeEach(() => vi.resetAllMocks())

test('keyboard backup explains saved content and waits for the actual native file confirmation', async () => {
  let finish!: (result: BackupResult) => void
  vi.mocked(createLibraryBackup).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  render(<LibraryBackup />)
  const button = screen.getByRole('button', { name: copy.action })
  expect(button).toHaveAccessibleDescription(copy.description)
  const user = userEvent.setup()
  await user.tab()
  await user.keyboard('{Enter}')
  expect(button).toBeDisabled()
  expect(screen.getByRole('status')).toHaveTextContent(copy.pending)
  fireEvent.click(button)
  expect(createLibraryBackup).toHaveBeenCalledExactlyOnceWith({
    title: copy.dialogTitle,
    fileType: copy.fileType,
  })
  expect(screen.queryByText(/Backup saved:/)).not.toBeInTheDocument()
  await act(async () => finish(created))
  expect(screen.getByRole('status')).toHaveTextContent(
    copy.created('Library.zip', 2, 7, 1),
  )
  await waitFor(() => expect(button).toHaveFocus())
})
test('cancellation does not claim a backup and can retry for an empty library', async () => {
  vi.mocked(createLibraryBackup)
    .mockResolvedValueOnce({ status: 'cancelled' })
    .mockResolvedValue({
      ...created,
      status: 'created',
      bookCount: 0,
      chapterCount: 0,
      coverCount: 0,
    })
  render(<LibraryBackup />)
  await userEvent.click(screen.getByRole('button', { name: copy.action }))
  expect(screen.getByRole('status')).toHaveTextContent(copy.cancelled)
  expect(screen.queryByText(/Backup saved:/)).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: copy.action }))
  expect(screen.getByRole('status')).toHaveTextContent(
    copy.created('Library.zip', 0, 0, 0),
  )
})
test.each([
  ['desktop_required', copy.desktop],
  ['invalid_source', copy.invalid],
  ['too_large', copy.tooLarge],
  ['busy', copy.busy],
  ['already_exists', copy.exists],
  ['invalid_destination', copy.destination],
  ['backup_failed', copy.failure],
  ['invalid_response', copy.failure],
])('backup failure %s is safe and retryable', async (code, message) => {
  vi.mocked(createLibraryBackup)
    .mockRejectedValueOnce({ code, message: 'C:\\private\\library.sqlite3' })
    .mockResolvedValue(created)
  render(<LibraryBackup />)
  await userEvent.click(screen.getByRole('button', { name: copy.action }))
  expect(screen.getByRole('alert')).toHaveTextContent(message)
  expect(screen.getByRole('alert')).not.toHaveTextContent('C:\\private')
  expect(screen.queryByText(/Backup saved:/)).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: copy.action }))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent(
    copy.created('Library.zip', 2, 7, 1),
  )
})
test('late backup responses cannot announce success after navigation/unmount', async () => {
  let finish!: (result: BackupResult) => void
  vi.mocked(createLibraryBackup).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  const { unmount } = render(<LibraryBackup />)
  await userEvent.click(screen.getByRole('button', { name: copy.action }))
  unmount()
  await act(async () => finish(created))
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})
