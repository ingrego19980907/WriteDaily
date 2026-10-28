import { beforeEach, expect, test, vi } from 'vitest'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { getDailyStatistics, getCurrentStreak } from './activity'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: vi.fn() }))
const request = { startDate: '2026-10-28', endDate: '2026-10-28', bookId: null }
const response = () => ({
  ...request,
  days: [
    {
      date: request.startDate,
      addedWords: 0,
      deletedWords: 0,
      creditedWords: 0,
      saveCount: 0,
      active: false,
      bookGoals: [],
    },
  ],
})
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(isTauri).mockReturnValue(true)
})

test('reads a bounded explicit range from native persistence with no mock fallback', async () => {
  const data = response()
  vi.mocked(invoke).mockResolvedValue(data)
  expect(await getDailyStatistics(request)).toEqual(data)
  expect(invoke).toHaveBeenCalledWith('get_daily_statistics', request)
})
test('refuses browser and invalid ranges before IPC', async () => {
  vi.mocked(isTauri).mockReturnValue(false)
  await expect(getDailyStatistics(request)).rejects.toEqual({
    code: 'desktop_required',
  })
  vi.mocked(isTauri).mockReturnValue(true)
  await expect(
    getDailyStatistics({ ...request, endDate: '2020-01-01' }),
  ).rejects.toEqual({ code: 'validation' })
  expect(invoke).not.toHaveBeenCalled()
})
test.each(['persistence', 'not_found', 'invalid_stored_data', 'limit_reached'])(
  'propagates %s without manufacturing zero history',
  async (code) => {
    vi.mocked(invoke).mockRejectedValue({ code })
    await expect(getDailyStatistics(request)).rejects.toEqual({ code })
  },
)
test('rejects malformed, incomplete and wrong-scope native results', async () => {
  for (const data of [
    null,
    {},
    { ...response(), days: [] },
    { ...response(), bookId: '123e4567-e89b-42d3-a456-426614174000' },
    { ...response(), startDate: '2026-10-27' },
  ]) {
    vi.mocked(invoke).mockResolvedValue(data)
    await expect(getDailyStatistics(request)).rejects.toEqual({
      code: 'invalid_stored_data',
    })
  }
})

test('current streak uses the whole native history scope and validates its response', async () => {
  const request = { today: '2026-10-28', bookId: null }
  const data = {
    ...request,
    days: 0,
    exact: true,
    todayState: 'unknown',
    todayCreditedWords: 0,
    startDate: null,
    lastCompletedDate: null,
    boundary: 'empty_history',
  }
  vi.mocked(invoke).mockResolvedValue(data)
  expect(await getCurrentStreak(request)).toEqual(data)
  expect(invoke).toHaveBeenCalledWith('get_current_streak', request)
  for (const result of [
    { ...data, exact: false },
    { ...data, today: '2026-10-27' },
    { ...data, bookId: '00000000-0000-4000-8000-000000000001' },
    null,
  ]) {
    vi.mocked(invoke).mockResolvedValue(result)
    await expect(getCurrentStreak(request)).rejects.toEqual({
      code: 'invalid_stored_data',
    })
  }
})
test('current streak refuses browser/invalid requests and propagates native failure', async () => {
  const request = { today: '2026-10-28', bookId: null }
  vi.mocked(isTauri).mockReturnValue(false)
  await expect(getCurrentStreak(request)).rejects.toEqual({
    code: 'desktop_required',
  })
  vi.mocked(isTauri).mockReturnValue(true)
  await expect(getCurrentStreak({ ...request, today: 'bad' })).rejects.toEqual({
    code: 'validation',
  })
  vi.mocked(invoke).mockRejectedValue({ code: 'persistence' })
  await expect(getCurrentStreak(request)).rejects.toEqual({
    code: 'persistence',
  })
})
