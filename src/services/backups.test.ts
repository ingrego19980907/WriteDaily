import { beforeEach, expect, test, vi } from 'vitest'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { createLibraryBackup } from './backups'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: vi.fn() }))
const labels = { title: 'Back up library', fileType: 'WriteDaily backup (ZIP)' }
const created = {
  status: 'created',
  fileName: 'Моя бібліотека.zip',
  createdAt: '2026-10-29T12:00:00.000Z',
  bookCount: 2,
  chapterCount: 7,
  coverCount: 1,
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(isTauri).mockReturnValue(true)
})

test('backup sends only centralized dialog labels and validates confirmed source counts', async () => {
  vi.mocked(invoke).mockResolvedValue({
    ...created,
    path: 'C:\\private',
    extra: 'ignored',
  })
  expect(
    await createLibraryBackup({ ...labels, path: 'ignored' } as typeof labels),
  ).toEqual(created)
  expect(invoke).toHaveBeenCalledExactlyOnceWith('create_library_backup', {
    labels,
  })
})
test('native cancellation is distinct from a completed backup', async () => {
  vi.mocked(invoke).mockResolvedValue({ status: 'cancelled' })
  expect(await createLibraryBackup(labels)).toEqual({ status: 'cancelled' })
})
test('backup has no browser persistence or download fallback', async () => {
  vi.mocked(isTauri).mockReturnValue(false)
  await expect(createLibraryBackup(labels)).rejects.toEqual({
    code: 'desktop_required',
  })
  expect(invoke).not.toHaveBeenCalled()
})
test('native backup errors remain failures for an explicit retry', async () => {
  vi.mocked(invoke)
    .mockRejectedValueOnce({ code: 'busy' })
    .mockResolvedValue(created)
  await expect(createLibraryBackup(labels)).rejects.toEqual({ code: 'busy' })
  expect(await createLibraryBackup(labels)).toEqual(created)
})
test.each([
  null,
  undefined,
  {},
  { status: 'success' },
  { ...created, fileName: 'C:\\private\\copy.zip' },
  { ...created, fileName: '../copy.zip' },
  { ...created, fileName: 'copy.txt' },
  { ...created, fileName: '.zip' },
  { ...created, fileName: `${'x'.repeat(252)}.zip` },
  { ...created, fileName: 'bad\nname.zip' },
  { ...created, createdAt: 'yesterday' },
  { ...created, createdAt: '2026-02-30T12:00:00.000Z' },
  { ...created, createdAt: '2026-10-29T12:00:00Z' },
  { ...created, bookCount: -1 },
  { ...created, chapterCount: 2.5 },
  { ...created, coverCount: Number.MAX_SAFE_INTEGER + 1 },
  { ...created, coverCount: 3 },
  { ...created, bookCount: 0, coverCount: 0 },
])('malformed backup confirmation %# cannot claim success', async (result) => {
  vi.mocked(invoke).mockResolvedValue(result)
  await expect(createLibraryBackup(labels)).rejects.toEqual({
    code: 'invalid_response',
  })
})
