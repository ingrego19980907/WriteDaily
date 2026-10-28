import { calendarDayNumber, isCalendarDate } from '../../utils/calendar-date'
import type { DailyStatistics } from './daily-statistics'

export function activityMonth(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value) || !isCalendarDate(`${value}-01`))
    return null
  const days = Array.from(
    { length: 31 },
    (_, index) => `${value}-${String(index + 1).padStart(2, '0')}`,
  ).filter(isCalendarDate)
  return {
    startDate: days[0],
    endDate: days[days.length - 1],
    days,
    leading: (calendarDayNumber(days[0]) + 6) % 7,
  }
}
export function adjacentActivityMonth(
  value: string,
  direction: -1 | 1,
): string | null {
  if (!activityMonth(value)) return null
  const [year, month] = value.split('-').map(Number)
  const index = (year - 1) * 12 + month - 1 + direction
  if (index < 0 || index >= 9999 * 12) return null
  return `${String(Math.floor(index / 12) + 1).padStart(4, '0')}-${String((index % 12) + 1).padStart(2, '0')}`
}
export function formatActivityMonth(value: string) {
  const [year, month] = value.split('-').map(Number)
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, 1)
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}
export function activityIntensity(words: number): 0 | 1 | 2 | 3 | 4 {
  return words === 0
    ? 0
    : words < 250
      ? 1
      : words < 500
        ? 2
        : words < 1000
          ? 3
          : 4
}
export function activityMonthSummary(days: readonly DailyStatistics[]) {
  let creditedWords: number | null = 0
  for (const day of days) {
    if (creditedWords !== null) {
      const sum: number = creditedWords + day.creditedWords
      creditedWords = Number.isSafeInteger(sum) ? sum : null
    }
  }
  return { creditedWords, activeDays: days.filter((day) => day.active).length }
}
