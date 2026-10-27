import { calendarDayNumber, isCalendarDate } from '../../utils/calendar-date'

export type BookDeadlineState =
  | { kind: 'none' }
  | { kind: 'unknown' }
  | { kind: 'completed'; date: string }
  | { kind: 'today'; date: string; days: 0 }
  | { kind: 'upcoming' | 'overdue'; date: string; days: number }

/** A saved deadline is a civil date; word-target achievement never implies completion. */
export function calculateBookDeadline(
  deadline: unknown,
  today: unknown,
  completed = false,
): BookDeadlineState {
  if (deadline === null) return { kind: 'none' }
  if (!isCalendarDate(deadline)) return { kind: 'unknown' }
  if (completed) return { kind: 'completed', date: deadline }
  if (!isCalendarDate(today)) return { kind: 'unknown' }
  const difference = calendarDayNumber(deadline) - calendarDayNumber(today)
  if (difference === 0) return { kind: 'today', date: deadline, days: 0 }
  return {
    kind: difference > 0 ? 'upcoming' : 'overdue',
    date: deadline,
    days: Math.abs(difference),
  }
}
