import { beforeEach, expect, test, vi } from 'vitest'
import { invoke, isTauri } from '@tauri-apps/api/core'
import {
  applyLibraryRestore,
  cancelLibraryRestore,
  closeAfterLibraryRestore,
  getLibraryRestoreStatus,
  prepareLibraryRestore,
} from './restores'
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: vi.fn() }))
const labels = {
  title: 'Choose library backup',
  fileType: 'WriteDaily backup (ZIP)',
}
const preview = {
  token: '00000000-0000-4000-8000-000000000001',
  fileName: 'Бібліотека.zip',
  createdAt: '2026-10-29T12:00:00.000Z',
  bookCount: 2,
  chapterCount: 5,
  coverCount: 1,
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(isTauri).mockReturnValue(true)
})
test('preparation sends labels only and returns an allowlisted preview without host paths', async () => {
  vi.mocked(invoke).mockResolvedValue({
    status: 'prepared',
    preview: { ...preview, path: 'C:\\private' },
  })
  expect(
    await prepareLibraryRestore({
      ...labels,
      path: 'ignored',
    } as typeof labels),
  ).toEqual({ status: 'prepared', preview })
  expect(invoke).toHaveBeenCalledExactlyOnceWith('prepare_library_restore', {
    labels,
  })
})
test('picker cancellation is not a prepared or restored library', async () => {
  vi.mocked(invoke).mockResolvedValue({ status: 'cancelled' })
  expect(await prepareLibraryRestore(labels)).toEqual({ status: 'cancelled' })
})
test('apply uses the opaque token and explicit confirmation, never a destination path', async () => {
  vi.mocked(invoke).mockResolvedValue({ status: 'restored' })
  expect(await applyLibraryRestore(preview.token)).toEqual({
    status: 'restored',
  })
  expect(invoke).toHaveBeenCalledExactlyOnceWith('apply_library_restore', {
    token: preview.token,
    confirmed: true,
  })
})
test('cancel and close use their narrow native endpoints', async () => {
  vi.mocked(invoke).mockResolvedValue(undefined)
  await cancelLibraryRestore(preview.token)
  await closeAfterLibraryRestore()
  expect(invoke).toHaveBeenNthCalledWith(1, 'cancel_library_restore', {
    token: preview.token,
  })
  expect(invoke).toHaveBeenNthCalledWith(2, 'close_after_library_restore')
})
test.each(['ready', 'close_required', 'restored'] as const)(
  'recovery status %s is read independently of the database',
  async (status) => {
    vi.mocked(invoke).mockResolvedValue({ status })
    expect(await getLibraryRestoreStatus()).toEqual({ status })
  },
)
test('a noncommitted apply reply cannot announce restored data', async () => {
  vi.mocked(invoke).mockResolvedValue({ status: 'ready' })
  await expect(applyLibraryRestore(preview.token)).rejects.toEqual({
    code: 'invalid_response',
  })
})
test.each([
  null,
  {},
  { status: 'success' },
  { status: { toString: (): string => 'restored' } },
])('malformed recovery status %# stays unconfirmed', async (result) => {
  vi.mocked(invoke).mockResolvedValue(result)
  await expect(getLibraryRestoreStatus()).rejects.toEqual({
    code: 'invalid_response',
  })
})
test('restore has no browser fallback for any operation', async () => {
  vi.mocked(isTauri).mockReturnValue(false)
  for (const run of [
    () => prepareLibraryRestore(labels),
    () => applyLibraryRestore(preview.token),
    () => cancelLibraryRestore(preview.token),
    getLibraryRestoreStatus,
    closeAfterLibraryRestore,
  ]) {
    await expect(run()).rejects.toEqual({ code: 'desktop_required' })
  }
  expect(invoke).not.toHaveBeenCalled()
})
test.each([
  null,
  {},
  { status: 'restored' },
  { status: 'prepared' },
  { status: 'prepared', preview: { ...preview, token: '../path' } },
  {
    status: 'prepared',
    preview: { ...preview, fileName: 'C:\\private\\backup.zip' },
  },
  { status: 'prepared', preview: { ...preview, fileName: 'unsafe\n.zip' } },
  { status: 'prepared', preview: { ...preview, fileName: 'library.txt' } },
  {
    status: 'prepared',
    preview: { ...preview, createdAt: '2026-02-30T12:00:00.000Z' },
  },
  { status: 'prepared', preview: { ...preview, bookCount: -1 } },
  { status: 'prepared', preview: { ...preview, chapterCount: 1.5 } },
  { status: 'prepared', preview: { ...preview, coverCount: 3 } },
  { status: 'prepared', preview: { ...preview, bookCount: 0, coverCount: 0 } },
  {
    status: 'prepared',
    preview: { ...preview, chapterCount: Number.MAX_SAFE_INTEGER + 1 },
  },
])('malformed preview %# cannot reach restore confirmation', async (result) => {
  vi.mocked(invoke).mockResolvedValue(result)
  await expect(prepareLibraryRestore(labels)).rejects.toEqual({
    code: 'invalid_response',
  })
})
