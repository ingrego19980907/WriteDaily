import { useEffect, useState } from 'react'
import { en } from '../../app/i18n/en'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useLocalCalendarDate } from '../../hooks/useLocalCalendarDate'
import { getCurrentStreak } from '../../services/activity'
import { formatCalendarDate } from '../../utils/calendar-date'
import type { CurrentStreak } from './current-streak'
import { LongestStreakSummary } from './LongestStreakSummary'

const copy = en.activity
const numbers = new Intl.NumberFormat('en')
type Result =
  | { key: string; data: CurrentStreak; error?: never }
  | { key: string; error: true; data?: never }
export function CurrentStreakSummary({
  bookId = null,
  refreshVersion = 0,
  active = true,
  refreshOnFocus = true,
}: {
  bookId?: string | null
  refreshVersion?: number
  active?: boolean
  refreshOnFocus?: boolean
}) {
  const today = useLocalCalendarDate()
  const [version, setVersion] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const key = JSON.stringify([today, bookId, refreshVersion, version, active])
  useEffect(() => {
    if (!active || !today) return
    let current = true
    void getCurrentStreak({ today, bookId }).then(
      (data) => {
        if (current) setResult({ key, data })
      },
      () => {
        if (current) setResult({ key, error: true })
      },
    )
    return () => {
      current = false
    }
  }, [today, bookId, key, active])
  useEffect(() => {
    if (!active || !refreshOnFocus) return
    const refresh = () => setVersion((value) => value + 1)
    const visible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', visible)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [active, refreshOnFocus])
  const loading = active && today !== null && result?.key !== key
  const data = result?.key === key ? result.data : undefined
  const failed = !today || (result?.key === key && result.error)
  return (
    <>
      <Card
        className="space-y-3 min-w-0 break-words"
        role="group"
        aria-label={copy.currentStreak}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-writing text-writing min-w-0 break-words">
            {copy.currentStreak}
          </h2>
          <Button
            variant="ghost"
            disabled={loading || !today}
            onClick={() => setVersion((value) => value + 1)}
          >
            {copy.refreshStreak}
          </Button>
        </div>
        {loading && <p className="text-secondary">{copy.streakLoading}</p>}
        {failed && <p className="text-secondary">{copy.streakUnavailable}</p>}
        {data && (
          <>
            <p className="text-writing font-semibold">
              {!data.exact && data.days === 0
                ? copy.streakUnknown
                : data.exact
                  ? copy.streakDays(numbers.format(data.days), data.days)
                  : copy.streakAtLeast(numbers.format(data.days), data.days)}
            </p>
            {!data.exact && (
              <p className="text-secondary text-sm">{copy.streakLimited}</p>
            )}
            {data.days > 0 &&
              data.todayState !== 'reached' &&
              data.todayState !== 'unscheduled' && (
                <p className="text-secondary text-sm">{copy.streakGrace}</p>
              )}
            <p>
              {copy.streakToday(
                formatCalendarDate(data.today),
                numbers.format(data.todayCreditedWords),
              )}
            </p>
            {data.lastCompletedDate && (
              <p className="text-secondary text-sm">
                {copy.streakLast(formatCalendarDate(data.lastCompletedDate))}
              </p>
            )}
          </>
        )}
        <p className="text-secondary text-sm">
          {bookId ? copy.streakBookPolicy : copy.streakGlobalPolicy}
        </p>
      </Card>
      <LongestStreakSummary
        today={today}
        bookId={bookId}
        refreshKey={key}
        active={active}
      />
    </>
  )
}
