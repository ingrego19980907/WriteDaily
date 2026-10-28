import { calendarDayNumber, isCalendarDate } from '../../utils/calendar-date'

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
export type StreakRequest = {
  readonly today: string
  readonly bookId: string | null
}
export type CurrentStreak = StreakRequest & {
  readonly days: number
  readonly exact: boolean
  readonly todayState: 'reached' | 'pending' | 'unscheduled' | 'unknown'
  readonly todayCreditedWords: number
  /** First/last confirmed completed dates in the current suffix, not an inferred older start. */
  readonly startDate: string | null
  readonly lastCompletedDate: string | null
  readonly boundary:
    | 'missed_day'
    | 'unknown_day'
    | 'history_start'
    | 'empty_history'
    | 'date_start'
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
export function isStreakRequest(value: unknown): value is StreakRequest {
  return (
    record(value) &&
    isCalendarDate(value.today) &&
    (value.bookId === null ||
      (typeof value.bookId === 'string' && uuid.test(value.bookId)))
  )
}
export function isCurrentStreak(value: unknown): value is CurrentStreak {
  if (!record(value)) return false
  const fields: Record<string, unknown> = value
  if (!isStreakRequest(value)) return false
  const {
    days,
    exact,
    todayState,
    todayCreditedWords,
    startDate,
    lastCompletedDate,
    boundary,
  } = fields
  if (
    typeof days !== 'number' ||
    !Number.isSafeInteger(days) ||
    days < 0 ||
    typeof exact !== 'boolean' ||
    typeof todayCreditedWords !== 'number' ||
    !Number.isSafeInteger(todayCreditedWords) ||
    todayCreditedWords < 0 ||
    typeof todayState !== 'string' ||
    !['reached', 'pending', 'unscheduled', 'unknown'].includes(todayState) ||
    typeof boundary !== 'string' ||
    ![
      'missed_day',
      'unknown_day',
      'history_start',
      'empty_history',
      'date_start',
    ].includes(boundary)
  )
    return false
  if (
    exact !== ['missed_day', 'empty_history', 'date_start'].includes(boundary)
  )
    return false
  if (days === 0) {
    if (
      startDate !== null ||
      lastCompletedDate !== null ||
      todayState === 'reached'
    )
      return false
  } else {
    if (
      !isCalendarDate(startDate) ||
      !isCalendarDate(lastCompletedDate) ||
      startDate > lastCompletedDate ||
      lastCompletedDate > value.today ||
      days >
        calendarDayNumber(lastCompletedDate) -
          calendarDayNumber(startDate) +
          1 ||
      (todayState === 'reached'
        ? lastCompletedDate !== value.today
        : lastCompletedDate === value.today)
    )
      return false
  }
  if (todayState === 'reached' && todayCreditedWords === 0) return false
  if (
    boundary === 'empty_history' &&
    (days !== 0 || todayCreditedWords !== 0 || todayState !== 'unknown')
  )
    return false
  return true
}
