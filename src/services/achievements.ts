import { invoke, isTauri } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import {
  isAchievementRefresh,
  isAchievementUnlockList,
  type AchievementRefresh,
  type AchievementUnlock,
} from '../features/achievements/achievement-unlocks'

export async function getAchievementUnlocks(): Promise<
  readonly AchievementUnlock[]
> {
  if (!isTauri()) throw { code: 'desktop_required' }
  const result = await invoke<unknown>('get_achievement_unlocks')
  if (!isAchievementUnlockList(result)) throw { code: 'invalid_stored_data' }
  return result
}

/** Native code owns today's date, eligibility and the commit. No client IDs/counts. */
export async function refreshAchievements(): Promise<AchievementRefresh> {
  if (!isTauri()) throw { code: 'desktop_required' }
  const result = await invoke<unknown>('refresh_achievements')
  if (!isAchievementRefresh(result)) throw { code: 'invalid_stored_data' }
  return result
}

/** Retrieval is durably claimed before returning; it is not a human-delivery acknowledgement. */
export async function claimAchievementNotifications(): Promise<
  readonly AchievementUnlock[]
> {
  if (!isTauri()) throw { code: 'desktop_required' }
  const result = await invoke<unknown>('claim_achievement_notifications')
  if (!isAchievementUnlockList(result)) throw { code: 'invalid_stored_data' }
  return result
}

/** Events are wakeups only. Always read committed notification rows from native code. */
export async function listenAchievementUnlocks(
  wake: () => void,
): Promise<() => void> {
  if (!isTauri()) return () => {}
  return listen('achievement-unlocks-changed', wake)
}
