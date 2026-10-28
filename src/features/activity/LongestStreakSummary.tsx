import { useEffect, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { en } from '../../app/i18n/en'
import { getLongestStreak } from '../../services/activity'
import { formatCalendarDate } from '../../utils/calendar-date'
import type { LongestStreak } from './longest-streak'

const copy = en.activity
const numbers = new Intl.NumberFormat('en')

/** Shares the enclosing current-streak refresh, visibility and local-midnight lifecycle. */
export function LongestStreakSummary({
  today,
  bookId,
  refreshKey,
  active,
}: {
  today: string | null
  bookId: string | null
  refreshKey: string
  active: boolean
}) {
  const [result, setResult] = useState<{
    key: string
    data?: LongestStreak
    failed?: true
  } | null>(null)
  useEffect(() => {
    if (!active || !today) return
    let current = true
    void getLongestStreak({ today, bookId }).then(
      (data) => {
        if (current) setResult({ key: refreshKey, data })
      },
      () => {
        if (current) setResult({ key: refreshKey, failed: true })
      },
    )
    return () => {
      current = false
    }
  }, [today, bookId, refreshKey, active])
  const data = result?.key === refreshKey ? result.data : undefined
  const failed = !today || (result?.key === refreshKey && result.failed)
  return (
    <Card
      className="space-y-2 min-w-0 break-words"
      role="group"
      aria-label={copy.longestStreak}
    >
      <h2 className="font-writing text-writing">{copy.longestStreak}</h2>
      {active && today && result?.key !== refreshKey && (
        <p className="text-secondary">{copy.longestLoading}</p>
      )}
      {failed && <p className="text-secondary">{copy.longestUnavailable}</p>}
      {data && (
        <>
          <p className="font-semibold">
            {!data.exact && data.days === 0
              ? copy.streakUnknown
              : data.exact
                ? copy.streakDays(numbers.format(data.days), data.days)
                : copy.streakAtLeast(numbers.format(data.days), data.days)}
          </p>
          {!data.exact && (
            <p className="text-secondary text-sm">{copy.longestLimited}</p>
          )}
          {data.startDate && data.endDate && (
            <p className="text-secondary text-sm">
              {copy.longestDates(
                formatCalendarDate(data.startDate),
                formatCalendarDate(data.endDate),
              )}
            </p>
          )}
          {data.historyStartDate && (
            <p className="text-secondary text-sm">
              {copy.longestHistory(formatCalendarDate(data.historyStartDate))}
            </p>
          )}
        </>
      )}
    </Card>
  )
}
