import { calendarDayNumber, isCalendarDate } from '../../utils/calendar-date'
import { calculateBookProgress } from './book-progress'

/** JavaScript weekday numbering: Sunday = 0, Monday = 1, Saturday = 6. */
export type WritingWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type WritingPaceState =
  | { kind: 'completed' }
  | { kind: 'unknown' }
  | { kind: 'no_target' }
  | { kind: 'target_reached'; remainingWords: 0; wordsPerDay: 0 }
  | { kind: 'no_deadline'; remainingWords: number }
  | { kind: 'overdue'; remainingWords: number }
  | { kind: 'no_writing_days'; remainingWords: number; writingDays: 0 }
  | {
      kind: 'ready'
      remainingWords: number
      writingDays: number
      wordsPerDay: number
    }

/** Pure projection from committed totals; today and the deadline are both included. */
export function calculateWritingPace({
  wordCount,
  targetWordCount,
  deadline,
  today,
  completed = false,
  writingWeekdays = [0, 1, 2, 3, 4, 5, 6],
}: {
  wordCount: unknown
  targetWordCount: unknown
  deadline: unknown
  today: unknown
  completed?: boolean
  writingWeekdays?: readonly WritingWeekday[]
}): WritingPaceState {
  if (completed) return { kind: 'completed' }
  // Missing optional metadata is distinct from malformed metadata.
  if (targetWordCount === null) return { kind: 'no_target' }
  const progress = calculateBookProgress(wordCount, targetWordCount)
  if (progress.kind !== 'determinate') return { kind: 'unknown' }
  const remainingWords = progress.remaining
  if (remainingWords === 0)
    return { kind: 'target_reached', remainingWords: 0, wordsPerDay: 0 }
  if (deadline === null) return { kind: 'no_deadline', remainingWords }
  if (!isCalendarDate(deadline) || !isCalendarDate(today))
    return { kind: 'unknown' }
  if (
    !Array.isArray(writingWeekdays) ||
    !Array.from(writingWeekdays).every(
      (day: unknown) =>
        Number.isInteger(day) && Number(day) >= 0 && Number(day) <= 6,
    )
  )
    return { kind: 'unknown' }
  const start = calendarDayNumber(today)
  const end = calendarDayNumber(deadline)
  if (end < start) return { kind: 'overdue', remainingWords }

  const weekdays = new Set(writingWeekdays)
  const calendarDays = end - start + 1
  let writingDays = Math.floor(calendarDays / 7) * weekdays.size
  // Gregorian 0001-01-01 was Monday: ordinal modulo 7 matches JS weekdays.
  for (let offset = 0; offset < calendarDays % 7; offset++) {
    if (weekdays.has(((start + offset) % 7) as WritingWeekday)) writingDays++
  }
  if (writingDays === 0)
    return { kind: 'no_writing_days', remainingWords, writingDays: 0 }
  // Integer ceiling avoids rounding down near MAX_SAFE_INTEGER.
  const wordsPerDay = Number(
    (BigInt(remainingWords) + BigInt(writingDays) - 1n) / BigInt(writingDays),
  )
  return { kind: 'ready', remainingWords, writingDays, wordsPerDay }
}
