import { ACHIEVEMENT_RULES, type AchievementId } from './achievement-rules'
import {
  isAchievementUnlockList,
  type AchievementUnlock,
} from './achievement-unlocks'
import type { AchievementCheck } from './evaluate-achievements'

export type AchievementCardState =
  | { readonly kind: 'unlocked'; readonly unlockedAt: string }
  | { readonly kind: 'unavailable' }
  | {
      readonly kind: 'locked'
      readonly progress: {
        readonly confirmed: number
        readonly atLeast: boolean
      } | null
      readonly awaitingConfirmation: boolean
    }

/** Saved unlocks own the badge. Eligibility/progress never manufactures an unlock. */
export function getAchievementCardState(
  id: AchievementId,
  unlocks: readonly AchievementUnlock[] | null,
  check: AchievementCheck | null,
): AchievementCardState {
  if (!isAchievementUnlockList(unlocks)) return { kind: 'unavailable' }
  const saved = unlocks.find((unlock) => unlock.achievementId === id)
  if (saved) return { kind: 'unlocked', unlockedAt: saved.unlockedAt }

  const threshold = ACHIEVEMENT_RULES[id].threshold
  const value = check?.confirmedProgress
  const valid =
    check?.id === id &&
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= threshold &&
    ((check.status === 'locked' && value < threshold) ||
      (check.status === 'eligible' && value === threshold) ||
      (check.status === 'unavailable' && value < threshold))
  return {
    kind: 'locked',
    progress:
      valid && (check.status !== 'unavailable' || value > 0)
        ? { confirmed: value, atLeast: check.status === 'unavailable' }
        : null,
    awaitingConfirmation: valid && check.status === 'eligible',
  }
}
