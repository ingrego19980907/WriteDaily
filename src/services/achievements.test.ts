import { beforeEach, expect, test, vi } from 'vitest'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import {
  getAchievementUnlocks,
  refreshAchievements,
  claimAchievementNotifications,
  listenAchievementUnlocks,
} from './achievements'
import {
  isAchievementRefresh,
  isAchievementUnlockList,
} from '../features/achievements/achievement-unlocks'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: vi.fn() }))
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }))
const unlock = {
  achievementId: 'first_words',
  rulePolicyVersion: 1,
  unlockedAt: '2026-10-29T10:00:00.000Z',
}

test('notification claims require committed validated rows and events carry no eligibility proof', async () => {
  vi.mocked(invoke).mockResolvedValue([unlock])
  expect(await claimAchievementNotifications()).toEqual([unlock])
  expect(invoke).toHaveBeenCalledWith('claim_achievement_notifications')
  vi.mocked(invoke).mockResolvedValue([unlock, unlock])
  await expect(claimAchievementNotifications()).rejects.toEqual({
    code: 'invalid_stored_data',
  })
  const stop = vi.fn()
  const wake = vi.fn()
  vi.mocked(listen).mockResolvedValue(stop)
  expect(await listenAchievementUnlocks(wake)).toBe(stop)
  expect(listen).toHaveBeenCalledWith('achievement-unlocks-changed', wake)
})

test('notification claims and listeners have no browser persistence fallback', async () => {
  vi.mocked(isTauri).mockReturnValue(false)
  await expect(claimAchievementNotifications()).rejects.toEqual({
    code: 'desktop_required',
  })
  const stop = await listenAchievementUnlocks(vi.fn())
  stop()
  expect(invoke).not.toHaveBeenCalled()
  expect(listen).not.toHaveBeenCalled()
})
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(isTauri).mockReturnValue(true)
})

test('reads durable unlocks and refreshes with no caller-provided eligibility or date', async () => {
  vi.mocked(invoke)
    .mockResolvedValueOnce([unlock])
    .mockResolvedValueOnce({ unlocks: [unlock], newlyUnlocked: [unlock] })
  expect(await getAchievementUnlocks()).toEqual([unlock])
  expect(invoke).toHaveBeenNthCalledWith(1, 'get_achievement_unlocks')
  expect(await refreshAchievements()).toEqual({
    unlocks: [unlock],
    newlyUnlocked: [unlock],
  })
  expect(invoke).toHaveBeenNthCalledWith(2, 'refresh_achievements')
})

test('does not invent persistence in browser preview or recover errors as empty unlocks', async () => {
  vi.mocked(isTauri).mockReturnValue(false)
  await expect(getAchievementUnlocks()).rejects.toEqual({
    code: 'desktop_required',
  })
  await expect(refreshAchievements()).rejects.toEqual({
    code: 'desktop_required',
  })
  expect(invoke).not.toHaveBeenCalled()
  vi.mocked(isTauri).mockReturnValue(true)
  for (const code of ['persistence', 'invalid_stored_data', 'limit_reached']) {
    vi.mocked(invoke).mockRejectedValue({ code })
    await expect(getAchievementUnlocks()).rejects.toEqual({ code })
    await expect(refreshAchievements()).rejects.toEqual({ code })
  }
})

test.each([
  null,
  {},
  [null],
  [unlock, unlock],
  [{ ...unlock, achievementId: 'toString' }],
  [{ ...unlock, achievementId: 'unknown' }],
  [{ ...unlock, rulePolicyVersion: 2 }],
  [{ ...unlock, unlockedAt: '2026-10-29' }],
  [{ ...unlock, unlockedAt: '2026-02-30T10:00:00.000Z' }],
  [{ ...unlock, unlockedAt: '0000-01-01T10:00:00.000Z' }],
  [{ ...unlock, unlockedAt: '2026-10-29T24:00:00.000Z' }],
  [{ ...unlock, unlockedAt: '2026-10-29T12:00:00.000+02:00' }],
])('rejects malformed durable data (%#)', async (result) => {
  expect(isAchievementUnlockList(result)).toBe(false)
  vi.mocked(invoke).mockResolvedValue(result)
  await expect(getAchievementUnlocks()).rejects.toEqual({
    code: 'invalid_stored_data',
  })
})

test('refresh results require unique newly inserted IDs with matching durable rows', async () => {
  expect(isAchievementUnlockList([])).toBe(true)
  expect(isAchievementRefresh({ unlocks: [unlock], newlyUnlocked: [] })).toBe(
    true,
  )
  for (const result of [
    null,
    {},
    { unlocks: [], newlyUnlocked: [unlock] },
    { unlocks: [unlock], newlyUnlocked: [unlock, unlock] },
    {
      unlocks: [unlock],
      newlyUnlocked: [{ ...unlock, unlockedAt: '2026-10-29T11:00:00.000Z' }],
    },
  ]) {
    vi.mocked(invoke).mockResolvedValue(result)
    await expect(refreshAchievements()).rejects.toEqual({
      code: 'invalid_stored_data',
    })
  }
})
