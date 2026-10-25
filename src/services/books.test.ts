import { beforeEach, expect, test, vi } from 'vitest'
import { invoke, isTauri } from '@tauri-apps/api/core'
import {
  createBook,
  deleteBook,
  getBook,
  listBooks,
  updateBook,
  setCover,
  readCover,
  bookValidationIssues,
} from './books'

test('native validation issues are copied from a strict field/code allowlist', () => {
  const error = {
    code: 'validation',
    issues: [
      { field: 'title', code: 'too_long' },
      { field: 'deadline', code: 'invalid_date' },
    ],
  }
  expect(bookValidationIssues(error)).toEqual(error.issues)
  expect(bookValidationIssues(error)[0]).not.toBe(error.issues[0])
})
test.each([
  null,
  'native error',
  { code: 'persistence', issues: [{ field: 'title', code: 'required' }] },
  { code: 'validation', issues: [] },
  { code: 'validation', issues: [{ field: 'id', code: 'required' }] },
  {
    code: 'validation',
    issues: [{ field: 'title', code: '<unsafe native message>' }],
  },
  { code: 'validation', issues: [null] },
])(
  'malformed or unrelated native error %j is not treated as field validation',
  (error) => {
    expect(bookValidationIssues(error)).toEqual([])
  },
)

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: vi.fn() }))
const details = {
  title: 'Story',
  targetWordCount: 80000,
  dailyWordGoal: 500,
  deadline: '2027-01-01',
}
beforeEach(() => {
  vi.clearAllMocks()
})

test('calls the registered native command with editable metadata and returns its committed result', async () => {
  vi.mocked(isTauri).mockReturnValue(true)
  vi.mocked(invoke).mockResolvedValue({ id: 'native-id', ...details })
  await expect(createBook(details)).resolves.toEqual({
    id: 'native-id',
    ...details,
  })
  expect(invoke).toHaveBeenCalledWith('create_book', { details })
})

test('browser preview explicitly refuses persistence without a fake saved result', async () => {
  vi.mocked(isTauri).mockReturnValue(false)
  await expect(createBook(details)).rejects.toEqual({
    code: 'desktop_required',
  })
  expect(invoke).not.toHaveBeenCalled()
})

test('read and update use only typed commands and include the snapshot token', async () => {
  vi.mocked(isTauri).mockReturnValue(true)
  vi.mocked(invoke).mockResolvedValue([])
  await listBooks()
  await getBook('book-id')
  await updateBook('book-id', 'snapshot-token', details)
  expect(invoke).toHaveBeenNthCalledWith(1, 'list_books')
  expect(invoke).toHaveBeenNthCalledWith(2, 'get_book', { id: 'book-id' })
  expect(invoke).toHaveBeenNthCalledWith(3, 'update_book', {
    id: 'book-id',
    expectedUpdatedAt: 'snapshot-token',
    details,
  })
  vi.mocked(invoke).mockRejectedValueOnce({ code: 'conflict' })
  await expect(
    updateBook('book-id', 'snapshot-token', details),
  ).rejects.toEqual({ code: 'conflict' })
})

test('read and update refuse browser persistence', async () => {
  vi.mocked(isTauri).mockReturnValue(false)
  for (const operation of [
    listBooks(),
    getBook('id'),
    updateBook('id', 'token', details),
  ])
    await expect(operation).rejects.toEqual({ code: 'desktop_required' })
  expect(invoke).not.toHaveBeenCalled()
})

test('confirmed deletion sends identity and revision, propagates failure and refuses browser persistence', async () => {
  vi.mocked(isTauri).mockReturnValue(true)
  vi.mocked(invoke)
    .mockResolvedValueOnce({ cleanupPending: false })
    .mockRejectedValueOnce({ code: 'conflict' })
  await expect(deleteBook('selected', 'revision')).resolves.toEqual({
    cleanupPending: false,
  })
  expect(invoke).toHaveBeenCalledWith('delete_book', {
    id: 'selected',
    expectedUpdatedAt: 'revision',
    confirmed: true,
  })
  await expect(deleteBook('selected', 'revision')).rejects.toEqual({
    code: 'conflict',
  })
  vi.mocked(isTauri).mockReturnValue(false)
  await expect(deleteBook('selected', 'revision')).rejects.toEqual({
    code: 'desktop_required',
  })
  expect(invoke).toHaveBeenCalledTimes(2)
})

test('cover commands expose bounded image bytes and book identity rather than arbitrary filesystem paths', async () => {
  vi.mocked(isTauri).mockReturnValue(true)
  vi.mocked(invoke).mockResolvedValue({ cleanupPending: true })
  await setCover('book-id', 'revision', [1, 2, 3])
  await setCover('book-id', 'revision', null)
  await readCover('book-id', 'covers/reference.png')
  expect(invoke).toHaveBeenNthCalledWith(1, 'set_cover', {
    id: 'book-id',
    expectedUpdatedAt: 'revision',
    bytes: [1, 2, 3],
  })
  expect(invoke).toHaveBeenNthCalledWith(2, 'set_cover', {
    id: 'book-id',
    expectedUpdatedAt: 'revision',
    bytes: null,
  })
  expect(invoke).toHaveBeenNthCalledWith(3, 'read_cover', {
    id: 'book-id',
    expectedPath: 'covers/reference.png',
  })
  vi.mocked(isTauri).mockReturnValue(false)
  await expect(setCover('id', 'token', [])).rejects.toEqual({
    code: 'desktop_required',
  })
  await expect(readCover('id', 'path')).rejects.toEqual({
    code: 'desktop_required',
  })
})
