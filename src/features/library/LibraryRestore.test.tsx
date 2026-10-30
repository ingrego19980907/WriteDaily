import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { en } from '../../app/i18n/en'
import * as service from '../../services/restores'
import { LibraryRestore } from './LibraryRestore'
vi.mock('../../services/restores', () => ({
  prepareLibraryRestore: vi.fn(),
  cancelLibraryRestore: vi.fn(),
  applyLibraryRestore: vi.fn(),
  getLibraryRestoreStatus: vi.fn(),
  closeAfterLibraryRestore: vi.fn(),
}))
const copy = en.libraryRestore
const preview: service.RestorePreview = {
  token: '00000000-0000-4000-8000-000000000001',
  fileName: 'Бібліотека.zip',
  createdAt: '2026-10-29T12:00:00.000Z',
  bookCount: 2,
  chapterCount: 5,
  coverCount: 1,
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(service.prepareLibraryRestore).mockResolvedValue({
    status: 'prepared',
    preview,
  })
  vi.mocked(service.cancelLibraryRestore).mockResolvedValue()
  vi.mocked(service.closeAfterLibraryRestore).mockResolvedValue()
})
async function open() {
  const user = userEvent.setup()
  render(<LibraryRestore />)
  await user.click(screen.getByRole('button', { name: copy.action }))
  return user
}
async function prepared() {
  const user = await open()
  await user.click(screen.getByRole('button', { name: copy.choose }))
  return user
}

test('the preview is read-only and Cancel restores focus without applying anything', async () => {
  const user = await prepared()
  expect(screen.getByText(preview.fileName)).toBeVisible()
  expect(screen.getByRole('button', { name: copy.apply })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: copy.cancel }))
  expect(service.cancelLibraryRestore).toHaveBeenCalledWith(preview.token)
  expect(service.applyLibraryRestore).not.toHaveBeenCalled()
  await waitFor(() =>
    expect(screen.getByRole('button', { name: copy.action })).toHaveFocus(),
  )
})
test('picker cancellation never enables replacement or announces success', async () => {
  vi.mocked(service.prepareLibraryRestore).mockResolvedValue({
    status: 'cancelled',
  })
  const user = await prepared()
  expect(screen.getByRole('status')).toHaveTextContent(copy.cancelled)
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  await user.keyboard('{Escape}')
  expect(service.applyLibraryRestore).not.toHaveBeenCalled()
})
test('pending preparation cannot be dismissed or overlap another picker', async () => {
  let finish!: (result: service.RestoreSelection) => void
  vi.mocked(service.prepareLibraryRestore).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  const user = await open()
  await user.click(screen.getByRole('button', { name: copy.choose }))
  expect(screen.getByRole('button', { name: copy.cancel })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: copy.choose }))
  await user.keyboard('{Escape}')
  expect(screen.getByRole('dialog')).toBeVisible()
  expect(service.prepareLibraryRestore).toHaveBeenCalledTimes(1)
  await act(async () => finish({ status: 'prepared', preview }))
})
test('a confirmed replacement waits for persistence and then requires closing the app', async () => {
  let finish!: (result: service.RestoreStatus) => void
  vi.mocked(service.applyLibraryRestore).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  const user = await prepared()
  await user.click(screen.getByRole('checkbox', { name: copy.confirm }))
  await user.click(screen.getByRole('button', { name: copy.apply }))
  expect(service.applyLibraryRestore).toHaveBeenCalledExactlyOnceWith(
    preview.token,
  )
  expect(screen.getByRole('status')).toHaveTextContent(copy.restoring)
  expect(screen.queryByText(copy.restored)).not.toBeInTheDocument()
  await user.keyboard('{Escape}')
  expect(screen.getByRole('button', { name: copy.cancel })).toBeDisabled()
  await act(async () => finish({ status: 'restored' }))
  expect(screen.getByRole('status')).toHaveTextContent(copy.restored)
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  await waitFor(() =>
    expect(screen.getByRole('button', { name: copy.closeApp })).toHaveFocus(),
  )
  await user.keyboard('{Escape}')
  expect(screen.getByRole('dialog')).toBeVisible()
  await user.click(screen.getByRole('button', { name: copy.closeApp }))
  expect(service.closeAfterLibraryRestore).toHaveBeenCalledTimes(1)
})
test('a lost apply reply is reconciled with confirmed native restore state', async () => {
  vi.mocked(service.applyLibraryRestore).mockRejectedValue({
    code: 'transport',
  })
  vi.mocked(service.getLibraryRestoreStatus).mockResolvedValue({
    status: 'restored',
  })
  const user = await prepared()
  await user.click(screen.getByRole('checkbox'))
  await user.click(screen.getByRole('button', { name: copy.apply }))
  expect(screen.getByRole('status')).toHaveTextContent(copy.restored)
  expect(service.applyLibraryRestore).toHaveBeenCalledTimes(1)
  expect(service.getLibraryRestoreStatus).toHaveBeenCalledTimes(1)
})
test.each(['close_required', 'unreachable'])(
  'uncertain state %s offers closing rather than unsafe retries',
  async (current) => {
    vi.mocked(service.applyLibraryRestore).mockRejectedValue({
      code: 'restore_failed',
    })
    if (current === 'close_required')
      vi.mocked(service.getLibraryRestoreStatus).mockResolvedValue({
        status: 'close_required',
      })
    else
      vi.mocked(service.getLibraryRestoreStatus).mockRejectedValue({
        code: 'transport',
      })
    const user = await prepared()
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: copy.apply }))
    expect(screen.getByRole('alert')).toHaveTextContent(copy.uncertain)
    expect(screen.queryByText(copy.restored)).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: copy.choose }),
    ).not.toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeVisible()
  },
)
test.each([
  ['invalid_backup', copy.invalid],
  ['unsupported_backup', copy.unsupported],
  ['too_large', copy.tooLarge],
  ['desktop_required', copy.desktop],
])(
  'invalid selection %s cannot replace the library or leak source paths',
  async (code, message) => {
    vi.mocked(service.prepareLibraryRestore).mockRejectedValue({
      code,
      message: 'C:\\private\\source.zip',
    })
    await prepared()
    expect(screen.getByRole('alert')).toHaveTextContent(message)
    expect(screen.getByRole('alert')).not.toHaveTextContent('C:\\private')
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(service.applyLibraryRestore).not.toHaveBeenCalled()
  },
)
test('a rolled-back failure requires a fresh preview and fresh confirmation before retry', async () => {
  vi.mocked(service.applyLibraryRestore).mockRejectedValue({
    code: 'safety_backup_failed',
  })
  vi.mocked(service.getLibraryRestoreStatus).mockResolvedValue({
    status: 'ready',
  })
  const user = await prepared()
  await user.click(screen.getByRole('checkbox'))
  await user.click(screen.getByRole('button', { name: copy.apply }))
  expect(screen.getByRole('alert')).toHaveTextContent(copy.safetyFailed)
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: copy.choose }))
  expect(
    within(screen.getByRole('dialog')).getByRole('checkbox'),
  ).not.toBeChecked()
  expect(screen.getByRole('button', { name: copy.apply })).toBeDisabled()
})
