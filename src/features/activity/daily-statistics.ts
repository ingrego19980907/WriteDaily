import { calendarDayNumber, isCalendarDate } from '../../utils/calendar-date'

export const MAX_STATISTICS_DAYS = 366
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
export type StatisticsRequest = {
  readonly startDate: string
  readonly endDate: string
  readonly bookId: string | null
}
export type BookDailyGoal = {
  readonly sourceBookId: string
  readonly bookId: string | null
  readonly dailyWordGoal: number | null
  readonly scheduled: boolean
  readonly creditedWords: number
  readonly state: 'unconfigured' | 'unscheduled' | 'pending' | 'reached'
  readonly remainingWords: number | null
}
export type DailyStatistics = {
  readonly date: string
  readonly addedWords: number
  readonly deletedWords: number
  readonly creditedWords: number
  /** Distinct editor operations touching this date, including zero-credit saves. */
  readonly saveCount: number
  readonly active: boolean
  readonly writingDay?: boolean | null
  readonly bookGoals: readonly BookDailyGoal[]
}
export type DailyStatisticsRange = StatisticsRequest & {
  readonly days: readonly DailyStatistics[]
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function count(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}
export function isStatisticsRequest(
  value: unknown,
): value is StatisticsRequest {
  if (
    !record(value) ||
    !isCalendarDate(value.startDate) ||
    !isCalendarDate(value.endDate) ||
    !(
      value.bookId === null ||
      (typeof value.bookId === 'string' && uuid.test(value.bookId))
    )
  )
    return false
  const distance =
    calendarDayNumber(value.endDate) - calendarDayNumber(value.startDate)
  return distance >= 0 && distance < MAX_STATISTICS_DAYS
}
function isBookDailyGoal(value: unknown): value is BookDailyGoal {
  if (
    !record(value) ||
    typeof value.sourceBookId !== 'string' ||
    !uuid.test(value.sourceBookId) ||
    !(value.bookId === null || value.bookId === value.sourceBookId) ||
    typeof value.scheduled !== 'boolean' ||
    !count(value.creditedWords) ||
    !(
      value.dailyWordGoal === null ||
      (count(value.dailyWordGoal) && value.dailyWordGoal > 0)
    )
  )
    return false
  if (!value.scheduled)
    return value.state === 'unscheduled' && value.remainingWords === null
  if (value.dailyWordGoal === null)
    return value.state === 'unconfigured' && value.remainingWords === null
  return (
    value.remainingWords ===
      Math.max(0, value.dailyWordGoal - value.creditedWords) &&
    value.state ===
      (value.creditedWords >= value.dailyWordGoal ? 'reached' : 'pending')
  )
}

/** Reject incomplete/malformed IPC data; never recover a read failure as empty history. */
export function isDailyStatisticsRange(
  value: unknown,
): value is DailyStatisticsRange {
  if (
    !isStatisticsRequest(value) ||
    !('days' in value) ||
    !Array.isArray(value.days)
  )
    return false
  const start = calendarDayNumber(value.startDate)
  if (value.days.length !== calendarDayNumber(value.endDate) - start + 1)
    return false
  for (let index = 0; index < value.days.length; index++) {
    const day: unknown = value.days[index]
    if (
      !record(day) ||
      !isCalendarDate(day.date) ||
      calendarDayNumber(day.date) !== start + index ||
      (day.writingDay !== undefined &&
        day.writingDay !== null &&
        typeof day.writingDay !== 'boolean') ||
      !count(day.addedWords) ||
      !count(day.deletedWords) ||
      !count(day.creditedWords) ||
      day.creditedWords !== day.addedWords ||
      !count(day.saveCount) ||
      day.active !== day.creditedWords > 0 ||
      !Array.isArray(day.bookGoals)
    )
      return false
    const seen = new Set<string>()
    let total = 0
    for (const goal of day.bookGoals) {
      if (
        !isBookDailyGoal(goal) ||
        seen.has(goal.sourceBookId) ||
        (value.bookId !== null && goal.bookId !== value.bookId)
      )
        return false
      seen.add(goal.sourceBookId)
      total += goal.creditedWords
      if (!Number.isSafeInteger(total)) return false
    }
    if (
      total !== day.creditedWords ||
      (day.saveCount === 0 &&
        ((day.bookGoals.length > 0 && typeof day.writingDay !== 'boolean') ||
          day.addedWords !== 0 ||
          day.deletedWords !== 0)) ||
      (day.saveCount > 0 && day.bookGoals.length === 0)
    )
      return false
  }
  return true
}
