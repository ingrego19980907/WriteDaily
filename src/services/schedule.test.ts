import { beforeEach, expect, test, vi } from 'vitest'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { getWritingSchedule, saveWritingSchedule } from './schedule'
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: vi.fn() }))
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(isTauri).mockReturnValue(true)
})
test('validates persisted history and the exact next-day save receipt', async () => {
  vi.mocked(invoke).mockResolvedValue({ revision: 0, history: [] })
  expect(await getWritingSchedule()).toEqual({ revision: 0, history: [] })
  const saved = {
    revision: 1,
    history: [
      { effectiveFrom: '2026-10-28', weekdays: [0, 1, 2, 3, 4, 5, 6] },
      { effectiveFrom: '2026-10-29', weekdays: [1, 3, 5] },
    ],
  }
  vi.mocked(invoke).mockResolvedValue(saved)
  expect(await saveWritingSchedule(0, [5, 3, 1], '2026-10-28')).toEqual(saved)
  expect(invoke).toHaveBeenLastCalledWith('save_writing_schedule', {
    expectedRevision: 0,
    weekdays: [5, 3, 1],
    today: '2026-10-28',
  })
  for (const value of [
    null,
    { ...saved, revision: 2 },
    {
      ...saved,
      history: [{ effectiveFrom: '2026-10-30', weekdays: [1, 3, 5] }],
    },
  ]) {
    vi.mocked(invoke).mockResolvedValue(value)
    await expect(
      saveWritingSchedule(0, [1, 3, 5], '2026-10-28'),
    ).rejects.toEqual({ code: 'invalid_stored_data' })
  }
})
test('unavailable, invalid and conflicting requests never manufacture saved settings', async () => {
  vi.mocked(isTauri).mockReturnValue(false)
  await expect(getWritingSchedule()).rejects.toEqual({
    code: 'desktop_required',
  })
  vi.mocked(isTauri).mockReturnValue(true)
  await expect(saveWritingSchedule(0, [1, 1], '2026-10-28')).rejects.toEqual({
    code: 'validation',
  })
  vi.mocked(invoke).mockRejectedValue({ code: 'conflict' })
  await expect(saveWritingSchedule(0, [], '2026-10-28')).rejects.toEqual({
    code: 'conflict',
  })
})
