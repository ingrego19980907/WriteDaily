import { beforeEach, expect, test, vi } from 'vitest'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { createBook } from './books'

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
