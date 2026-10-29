// Browser-only audit of production date/recording functions; no persistence substitute.
import '../../src/styles/global.css'
import { createRoot } from 'react-dom/client'
import { useLocalCalendarDate } from '../../src/hooks/useLocalCalendarDate'
import {
  calendarDayNumber,
  localCalendarDate,
  formatCalendarDate,
} from '../../src/utils/calendar-date'
import {
  ActivityRecorder,
  captureActivityContext,
} from '../../src/features/activity/activity-recorder'
import { calculateActivityDelta } from '../../src/features/activity/activity'
import { calculateBookDeadline } from '../../src/features/library/book-deadline'
import { calculateWritingPace } from '../../src/features/library/writing-pace'

const recorder = new ActivityRecorder(0)
const audit = {
  snapshot(instant: string) {
    const now = new Date(instant)
    const context = captureActivityContext(1, now)
    const midnight = new Date(now)
    midnight.setHours(0, 0, 0, 0)
    const next = new Date(midnight)
    next.setHours(24, 0, 0, 0)
    const tomorrow = localCalendarDate(next)!
    return {
      context,
      hour: now.getHours(),
      minute: now.getMinutes(),
      weekday: now.getDay(),
      weekendScheduled: captureActivityContext(1, now, [
        { effectiveFrom: '2024-01-01', weekdays: [0, 6] },
      ]).scheduled,
      canonicalZone: new Intl.DateTimeFormat().resolvedOptions().timeZone,
      hoursInDay: (next.getTime() - midnight.getTime()) / 3600000,
      civilDistance:
        calendarDayNumber(tomorrow) - calendarDayNumber(context.localDate),
      deadline: calculateBookDeadline(tomorrow, context.localDate),
      pace: calculateWritingPace({
        wordCount: 0,
        targetWordCount: 100,
        deadline: tomorrow,
        today: context.localDate,
      }),
      displayDate: formatCalendarDate(context.localDate),
    }
  },
  record(instant: string, words: number) {
    const now = new Date(instant)
    recorder.record(words, captureActivityContext(1, now), now)
  },
  take() {
    const operation = recorder.take()
    const credits = new Map<string, number>()
    for (const segment of operation.segments) {
      const date = segment.context.localDate
      credits.set(
        date,
        (credits.get(date) ?? 0) +
          calculateActivityDelta(segment.beforeWords, segment.afterWords)!
            .creditedWords,
      )
    }
    return {
      operation,
      credits: [...credits].sort(([a], [b]) => a.localeCompare(b)),
    }
  },
}
export type DateTimeAudit = typeof audit
Object.assign(window, { dateTimeAudit: audit })
function DateProbe() {
  const today = useLocalCalendarDate()
  return (
    <main>
      <h1>Date and timezone verification</h1>
      <output aria-label="Observed local date">{today ?? 'Unavailable'}</output>
    </main>
  )
}
createRoot(document.getElementById('root')!).render(<DateProbe />)
