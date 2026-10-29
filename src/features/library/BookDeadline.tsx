import { en } from '../../app/i18n/en'
import { CalendarDays } from 'lucide-react'
import { useLocalCalendarDate } from '../../hooks/useLocalCalendarDate'
import { formatCalendarDate } from '../../utils/calendar-date'
import { calculateBookDeadline } from './book-deadline'

const numbers = new Intl.NumberFormat('en')
export function BookDeadline({
  value,
  completed = false,
  compact = false,
}: {
  value: string | null
  completed?: boolean
  compact?: boolean
}) {
  const today = useLocalCalendarDate()
  const state = calculateBookDeadline(value, today, completed)
  const copy = en.library
  const color =
    state.kind === 'overdue'
      ? 'text-error'
      : state.kind === 'today'
        ? 'text-accent-strong'
        : 'text-secondary'
  return (
    <p
      aria-label={copy.bookDeadline}
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 break-words ${color}`}
    >
      {compact ? (
        <CalendarDays
          size={16}
          strokeWidth={1.6}
          className="shrink-0"
          aria-hidden="true"
        />
      ) : (
        <svg
          width="18"
          height="18"
          className="shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M7 3v4M17 3v4M3 10h18M8 14h2M14 14h2M8 17h2" />
        </svg>
      )}
      {state.kind === 'none' ? (
        copy.noDeadline
      ) : state.kind === 'unknown' ? (
        copy.deadlineUnavailable
      ) : (
        <>
          <span>
            {copy.deadlinePrefix}{' '}
            <time dateTime={state.date}>{formatCalendarDate(state.date)}</time>
          </span>
          <span
            className={
              compact &&
              (state.kind === 'upcoming' || state.kind === 'completed')
                ? 'sr-only'
                : 'text-sm'
            }
          >
            {state.kind === 'today'
              ? copy.deadlineToday
              : state.kind === 'completed'
                ? copy.deadlineCompleted
                : state.kind === 'upcoming'
                  ? copy.deadlineRemaining(
                      numbers.format(state.days),
                      state.days,
                    )
                  : copy.deadlineOverdue(
                      numbers.format(state.days),
                      state.days,
                    )}
          </span>
        </>
      )}
    </p>
  )
}
