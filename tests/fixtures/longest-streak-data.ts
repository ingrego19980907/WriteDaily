import type { StreakRequest } from '../../src/features/activity/current-streak'
import type { LongestStreak } from '../../src/features/activity/longest-streak'
import { activityFixture } from './activity-data'
import { streakCalendarFixture } from './streak-data'

export function longestFixture(
  request: StreakRequest,
  mode: string,
): LongestStreak {
  const result: LongestStreak = {
    ...request,
    days: 0,
    exact: true,
    historyStartDate: null,
    startDate: null,
    endDate: null,
  }
  if (request.today < '2026-10-01') return result
  const range = streakCalendarFixture(
    activityFixture({
      startDate: '2026-10-01',
      endDate: request.today,
      bookId: request.bookId,
    }),
    mode,
  )
  let run = 0
  let start: string | null = null
  let best = result
  for (const day of range.days) {
    if (!best.historyStartDate) {
      if (!day.saveCount && !day.bookGoals.length) continue
      best = { ...best, historyStartDate: day.date }
    }
    if (day.bookGoals.some((goal) => goal.state === 'reached')) {
      run++
      start ??= day.date
      if (run > best.days)
        best = { ...best, days: run, startDate: start, endDate: day.date }
    } else if (
      day.date !== request.today &&
      !(
        request.bookId &&
        day.bookGoals.length &&
        day.bookGoals.every((goal) => !goal.scheduled)
      )
    ) {
      if (!day.bookGoals.some((goal) => goal.state === 'pending'))
        best = { ...best, exact: false }
      run = 0
      start = null
    }
  }
  return best
}
