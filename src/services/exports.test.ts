import { beforeEach, expect, test, vi } from 'vitest'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { exportBook, exportChapter } from './exports'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: vi.fn() }))
const labels = { title: 'Export chapter', fileType: 'Plain text' }
const exported = { status: 'exported', fileName: 'Розділ 🌿.txt', revision: 7 }
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(isTauri).mockReturnValue(true)
})

test('exports a scoped saved revision without passing a path, document or arbitrary label fields', async () => {
  vi.mocked(invoke).mockResolvedValue(exported)
  await expect(
    exportChapter('book', 'chapter', 7, {
      ...labels,
      path: 'forged',
    } as typeof labels),
  ).resolves.toEqual(exported)
  expect(invoke).toHaveBeenCalledExactlyOnceWith('export_chapter', {
    bookId: 'book',
    id: 'chapter',
    expectedRevision: 7,
    labels,
  })
})

test('cancellation remains distinct from a completed write', async () => {
  vi.mocked(invoke).mockResolvedValue({ status: 'cancelled' })
  await expect(exportChapter('book', 'chapter', 7, labels)).resolves.toEqual({
    status: 'cancelled',
  })
})

test('browser preview never invents a file export or fallback download', async () => {
  vi.mocked(isTauri).mockReturnValue(false)
  await expect(exportChapter('book', 'chapter', 7, labels)).rejects.toEqual({
    code: 'desktop_required',
  })
  expect(invoke).not.toHaveBeenCalled()
})

test.each([
  null,
  {},
  { status: 'success' },
  { ...exported, fileName: '' },
  { ...exported, fileName: '../chapter.txt' },
  { ...exported, fileName: 'C:\\private\\chapter.txt' },
  { ...exported, fileName: 'chapter.sqlite3' },
  { ...exported, fileName: 'a\u0000.txt' },
  { ...exported, fileName: `${'a'.repeat(256)}.txt` },
  { ...exported, revision: 6 },
  { ...exported, revision: '7' },
  { ...exported, revision: 0 },
])(
  'malformed or mismatched native results cannot report a successful file (%j)',
  async (result) => {
    vi.mocked(invoke).mockResolvedValue(result)
    await expect(exportChapter('book', 'chapter', 7, labels)).rejects.toEqual({
      code: 'invalid_response',
    })
  },
)

test('native read, conflict and file failures propagate for an explicit retry', async () => {
  for (const code of [
    'conflict',
    'not_found',
    'export_failed',
    'already_exists',
  ]) {
    vi.mocked(invoke).mockRejectedValueOnce({ code })
    await expect(exportChapter('book', 'chapter', 7, labels)).rejects.toEqual({
      code,
    })
  }
})

const bookSnapshot = {
  bookUpdatedAt: '2026-10-29T12:00:00.000Z',
  chapters: [
    { id: 'second', revision: 4 },
    { id: 'first', revision: 2 },
  ],
}
const bookResult = {
  status: 'exported',
  fileName: 'Книга 🌿.txt',
  ...bookSnapshot,
}

test('book export sends only metadata and the ordered saved manifest, never bodies or paths', async () => {
  vi.mocked(invoke).mockResolvedValue(bookResult)
  await expect(
    exportBook(
      'book',
      {
        ...bookSnapshot,
        chapters: bookSnapshot.chapters.map((row) => ({
          ...row,
          content: 'do not send',
          path: 'forged',
        })),
      },
      labels,
    ),
  ).resolves.toEqual(bookResult)
  expect(invoke).toHaveBeenCalledExactlyOnceWith('export_book', {
    bookId: 'book',
    expectedBookUpdatedAt: bookSnapshot.bookUpdatedAt,
    expectedChapters: bookSnapshot.chapters,
    labels,
  })
})

test('book export freezes its requested manifest while the native picker is pending', async () => {
  let resolve!: (result: unknown) => void
  vi.mocked(invoke).mockReturnValue(
    new Promise((finish) => {
      resolve = finish
    }),
  )
  const mutable = {
    ...bookSnapshot,
    chapters: bookSnapshot.chapters.map((row) => ({ ...row })),
  }
  const pending = exportBook('book', mutable, labels)
  mutable.chapters[0].revision = 99
  mutable.chapters.reverse()
  resolve(bookResult)
  await expect(pending).resolves.toEqual(bookResult)
})

test('book cancellation and unavailable desktop remain separate from a successful export', async () => {
  vi.mocked(invoke).mockResolvedValue({ status: 'cancelled' })
  await expect(exportBook('book', bookSnapshot, labels)).resolves.toEqual({
    status: 'cancelled',
  })
  vi.mocked(isTauri).mockReturnValue(false)
  await expect(exportBook('book', bookSnapshot, labels)).rejects.toEqual({
    code: 'desktop_required',
  })
  expect(invoke).toHaveBeenCalledTimes(1)
})

test.each([
  null,
  {},
  { status: 'success' },
  exported,
  { ...bookResult, bookUpdatedAt: '2026-10-28T12:00:00.000Z' },
  { ...bookResult, chapters: [] },
  { ...bookResult, chapters: [...bookSnapshot.chapters].reverse() },
  {
    ...bookResult,
    chapters: [bookSnapshot.chapters[0], bookSnapshot.chapters[0]],
  },
  {
    ...bookResult,
    chapters: [...bookSnapshot.chapters, { id: 'extra', revision: 1 }],
  },
  {
    ...bookResult,
    chapters: [{ id: 'second', revision: 5 }, bookSnapshot.chapters[1]],
  },
  {
    ...bookResult,
    chapters: [{ id: 'second', revision: '4' }, bookSnapshot.chapters[1]],
  },
  { ...bookResult, fileName: '../book.txt' },
])(
  'book results must confirm the complete ordered snapshot (%j)',
  async (result) => {
    vi.mocked(invoke).mockResolvedValue(result)
    await expect(exportBook('book', bookSnapshot, labels)).rejects.toEqual({
      code: 'invalid_response',
    })
  },
)
