import { en } from '../../app/i18n/en'
import { useLocalCalendarDate } from '../../hooks/useLocalCalendarDate'
import { calculateWritingPace, type WritingWeekday } from './writing-pace'

const numbers = new Intl.NumberFormat('en')

/** Planning projection from saved totals, separate from today's credited activity. */
export function WritingPace({
  wordCount,
  targetWordCount,
  deadline,
  completed = false,
  writingWeekdays,
}: {
  wordCount?: number | null
  targetWordCount: number | null
  deadline: string | null
  completed?: boolean
  writingWeekdays?: readonly WritingWeekday[]
}) {
  const today = useLocalCalendarDate()
  const state = calculateWritingPace({
    wordCount,
    targetWordCount,
    deadline,
    today,
    completed,
    writingWeekdays,
  })
  const copy = en.library
  const messages = {
    completed: copy.paceCompleted,
    unknown: copy.paceUnavailable,
    no_target: copy.paceNoTarget,
    no_deadline: copy.paceNoDeadline,
    overdue: copy.paceOverdue,
    no_writing_days: copy.paceNoWritingDays,
    target_reached: copy.paceTargetReached,
  }
  return (
    <div
      aria-label={copy.writingPace}
      role="group"
      className="space-y-1 break-words text-secondary text-sm"
    >
      <p className="font-semibold">{copy.writingPace}</p>
      {state.kind === 'ready' ? (
        <>
          <p className="text-accent-strong">
            {copy.paceSummary(
              numbers.format(state.wordsPerDay),
              state.wordsPerDay,
            )}
          </p>
          <p>
            {copy.paceDays(
              numbers.format(state.writingDays),
              state.writingDays,
            )}
          </p>
        </>
      ) : (
        <p>{messages[state.kind]}</p>
      )}
    </div>
  )
}
