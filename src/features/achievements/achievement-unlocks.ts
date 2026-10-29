import { isCalendarDate } from '../../utils/calendar-date'
import { ACHIEVEMENT_RULES, type AchievementId } from './achievement-rules'

export type AchievementUnlock = {
  readonly achievementId: AchievementId
  readonly rulePolicyVersion: 1
  readonly unlockedAt: string
}
export type AchievementRefresh = {
  readonly unlocks: readonly AchievementUnlock[]
  readonly newlyUnlocked: readonly AchievementUnlock[]
}

/** Validate the committed native result; never turn a failed read into zero unlocks. */
export function isAchievementUnlockList(
  value: unknown,
): value is AchievementUnlock[] {
  if (!Array.isArray(value)) return false
  const seen = new Set<string>()
  return value.every((item: unknown) => {
    if (
      typeof item !== 'object' ||
      item === null ||
      !('achievementId' in item) ||
      typeof item.achievementId !== 'string' ||
      !Object.hasOwn(ACHIEVEMENT_RULES, item.achievementId) ||
      seen.has(item.achievementId) ||
      !('rulePolicyVersion' in item) ||
      item.rulePolicyVersion !== 1 ||
      !('unlockedAt' in item) ||
      typeof item.unlockedAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(item.unlockedAt) ||
      !isCalendarDate(item.unlockedAt.slice(0, 10)) ||
      !Number.isFinite(Date.parse(item.unlockedAt)) ||
      new Date(item.unlockedAt).toISOString() !== item.unlockedAt
    )
      return false
    seen.add(item.achievementId)
    return true
  })
}

export function isAchievementRefresh(
  value: unknown,
): value is AchievementRefresh {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('unlocks' in value) ||
    !isAchievementUnlockList(value.unlocks) ||
    !('newlyUnlocked' in value) ||
    !isAchievementUnlockList(value.newlyUnlocked)
  )
    return false
  const saved = new Map(
    value.unlocks.map((unlock) => [unlock.achievementId, unlock]),
  )
  return value.newlyUnlocked.every(
    (unlock) =>
      saved.get(unlock.achievementId)?.unlockedAt === unlock.unlockedAt,
  )
}
