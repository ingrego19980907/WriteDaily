import { beforeEach, expect, test, vi } from 'vitest'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { createBook, deleteBook, getBook, listBooks, updateBook } from './books'

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
    .mockResolvedValueOnce(undefined)
    .mockRejectedValueOnce({ code: 'conflict' })
  await expect(deleteBook('selected', 'revision')).resolves.toBeUndefined()
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
