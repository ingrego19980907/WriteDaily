import { calendarDayNumber, isCalendarDate } from '../../utils/calendar-date'
import { isStreakRequest, type StreakRequest } from './current-streak'

export type LongestStreak = StreakRequest & {
  readonly days: number
  readonly exact: boolean
  readonly historyStartDate: string | null
  readonly startDate: string | null
  readonly endDate: string | null
}

export function isLongestStreak(value: unknown): value is LongestStreak {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false
  const fields = value as Record<string, unknown>
  if (!isStreakRequest(value)) return false
  const { days, exact, historyStartDate, startDate, endDate } = fields
  if (
    typeof days !== 'number' ||
    !Number.isSafeInteger(days) ||
    days < 0 ||
    typeof exact !== 'boolean'
  )
    return false
  if (historyStartDate === null)
    return days === 0 && exact && startDate === null && endDate === null
  if (!isCalendarDate(historyStartDate) || historyStartDate > value.today)
    return false
  if (days === 0) return startDate === null && endDate === null
  return (
    isCalendarDate(startDate) &&
    isCalendarDate(endDate) &&
    historyStartDate <= startDate &&
    startDate <= endDate &&
    endDate <= value.today &&
    days <= calendarDayNumber(endDate) - calendarDayNumber(startDate) + 1
  )
}
