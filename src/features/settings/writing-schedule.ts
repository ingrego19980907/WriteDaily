import { calendarDayNumber, isCalendarDate } from '../../utils/calendar-date'

export type ScheduleEntry = {
  readonly effectiveFrom: string
  readonly weekdays: readonly number[]
}
export type WritingSchedule = {
  readonly revision: number
  readonly history: readonly ScheduleEntry[]
}
export const everyDay = [0, 1, 2, 3, 4, 5, 6] as const
export function validWeekdays(value: unknown): value is readonly number[] {
  return (
    Array.isArray(value) &&
    value.length <= 7 &&
    value.every((day) => Number.isInteger(day) && day >= 0 && day <= 6) &&
    new Set(value).size === value.length
  )
}
export function isWritingSchedule(value: unknown): value is WritingSchedule {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('revision' in value) ||
    !('history' in value)
  )
    return false
  if (
    typeof value.revision !== 'number' ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 0 ||
    !Array.isArray(value.history) ||
    (value.revision === 0) !== (value.history.length === 0)
  )
    return false
  let previous = ''
  return value.history.every((entry: unknown) => {
    if (
      typeof entry !== 'object' ||
      entry === null ||
      !('effectiveFrom' in entry) ||
      !('weekdays' in entry) ||
      !isCalendarDate(entry.effectiveFrom) ||
      entry.effectiveFrom <= previous ||
      !validWeekdays(entry.weekdays)
    )
      return false
    previous = entry.effectiveFrom
    return true
  })
}
export function weekdaysOn(
  date: string,
  history: readonly ScheduleEntry[],
): readonly number[] {
  return (
    history.findLast((entry) => entry.effectiveFrom <= date)?.weekdays ??
    everyDay
  )
}
export function scheduledOn(
  date: string,
  history: readonly ScheduleEntry[],
): boolean {
  return weekdaysOn(date, history).includes(calendarDayNumber(date) % 7)
}
/** Bounded work per history interval; no DST or millisecond date arithmetic. */
export function countWritingDays(
  start: string,
  end: string,
  history: readonly ScheduleEntry[],
): number {
  const first = calendarDayNumber(start)
  const last = calendarDayNumber(end)
  let cursor = first
  let weekdays: readonly number[] = everyDay
  let total = 0
  function count(until: number) {
    const length = until - cursor + 1
    if (length <= 0) return
    total += Math.floor(length / 7) * weekdays.length
    for (let offset = 0; offset < length % 7; offset++)
      if (weekdays.includes((cursor + offset) % 7)) total++
    cursor = until + 1
  }
  for (const entry of history) {
    const boundary = calendarDayNumber(entry.effectiveFrom)
    if (boundary > last) break
    if (boundary > cursor) count(boundary - 1)
    weekdays = entry.weekdays
  }
  count(last)
  return total
}
