// Test-only snapshots; production streaks are calculated by native history reads.
import type {
  CurrentStreak,
  StreakRequest,
} from '../../src/features/activity/current-streak'
import type { DailyStatisticsRange } from '../../src/features/activity/daily-statistics'
import { activityBooks } from './activity-data'

export function streakFixture(
  request: StreakRequest,
  mode = '',
): CurrentStreak {
  const base: CurrentStreak = {
    ...request,
    days: 0,
    exact: true,
    todayState: 'unknown',
    todayCreditedWords: 0,
    startDate: null,
    lastCompletedDate: null,
    boundary: 'missed_day',
  }
  if (request.today !== '2026-10-28') return base
  if (mode === 'limited' || (mode && request.bookId === activityBooks[0].id))
    return {
      ...base,
      days: 2,
      exact: false,
      todayState: 'pending',
      todayCreditedWords: 50,
      startDate: '2026-10-26',
      lastCompletedDate: '2026-10-27',
      boundary: 'unknown_day',
    }
  if (mode && request.bookId === null)
    return {
      ...base,
      days: 3,
      todayState: 'pending',
      todayCreditedWords: 50,
      startDate: '2026-10-25',
      lastCompletedDate: '2026-10-27',
    }
  if (request.bookId === activityBooks[1].id)
    return { ...base, exact: false, boundary: 'unknown_day' }
  return base
}
export function streakCalendarFixture(
  data: DailyStatisticsRange,
  mode: string,
): DailyStatisticsRange {
  if (!mode) return data
  return {
    ...data,
    days: data.days.map((day) => {
      if (
        ![
          '2026-10-24',
          '2026-10-25',
          '2026-10-26',
          '2026-10-27',
          '2026-10-28',
        ].includes(day.date)
      )
        return day
      const source =
        day.date === '2026-10-25' ? activityBooks[1].id : activityBooks[0].id
      if (
        (mode === 'limited' && day.date === '2026-10-25') ||
        (data.bookId !== null && data.bookId !== source)
      )
        return {
          ...day,
          addedWords: 0,
          deletedWords: 0,
          creditedWords: 0,
          saveCount: 0,
          active: false,
          bookGoals: [],
        }
      const words =
        day.date === '2026-10-24' ? 0 : day.date === '2026-10-28' ? 50 : 100
      return {
        ...day,
        addedWords: words,
        deletedWords: 0,
        creditedWords: words,
        saveCount: 1,
        active: words > 0,
        bookGoals: [
          {
            sourceBookId: source,
            bookId: source,
            dailyWordGoal: 100,
            scheduled: true,
            creditedWords: words,
            state: words >= 100 ? 'reached' : 'pending',
            remainingWords: Math.max(0, 100 - words),
          },
        ],
      }
    }),
  }
}
