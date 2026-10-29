import type { CurrentStreak } from '../activity/current-streak'
import type { DailyStatistics } from '../activity/daily-statistics'

/** Presentation only: never turn an uncertain zero into an exact streak. */
export function presentCurrentStreak(streak: CurrentStreak | undefined) {
  if (!streak || (!streak.exact && streak.days === 0)) return null
  return { count: streak.days, atLeast: !streak.exact }
}

/** Count native goal results once per book/day; do not recalculate targets or credit. */
export function completedDailyGoals(day: DailyStatistics) {
  return day.bookGoals.filter((goal) => goal.state === 'reached').length
}
