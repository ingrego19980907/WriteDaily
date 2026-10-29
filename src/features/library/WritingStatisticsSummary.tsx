import { useEffect, useState } from 'react'
import { Flame, Pencil, Target } from 'lucide-react'
import { en } from '../../app/i18n/en'
import { Card } from '../../components/ui/Card'
import { getDailyStatistics } from '../../services/activity'
import type { CurrentStreakSnapshot } from '../activity/CurrentStreakSummary'
import type { DailyStatistics } from '../activity/daily-statistics'
import { completedDailyGoals, presentCurrentStreak } from './writing-statistics'
import './writing-statistics.css'

const copy = en.writingStatistics
const numbers = new Intl.NumberFormat('en')

/** Reuses the library's current-streak read; only today's statistics need another query. */
export function WritingStatisticsSummary({
  today,
  data,
  loading,
  failed,
  refreshKey,
  active,
}: CurrentStreakSnapshot) {
  const [result, setResult] = useState<{
    key: string
    day?: DailyStatistics
    failed?: true
  } | null>(null)
  useEffect(() => {
    if (!active || !today) return
    let current = true
    void getDailyStatistics({
      startDate: today,
      endDate: today,
      bookId: null,
    }).then(
      (range) => {
        if (current) setResult({ key: refreshKey, day: range.days[0] })
      },
      () => {
        if (current) setResult({ key: refreshKey, failed: true })
      },
    )
    return () => {
      current = false
    }
  }, [active, today, refreshKey])
  const day = result?.key === refreshKey ? result.day : undefined
  const dayLoading = active && today !== null && result?.key !== refreshKey
  const dayFailed = !today || (result?.key === refreshKey && result.failed)
  const streak = presentCurrentStreak(data)
  return (
    <Card className="writing-statistics" role="group" aria-label={copy.title}>
      <dl className="writing-statistics__grid">
        <div className="writing-statistics__metric">
          <dt>
            <span className="writing-statistics__icon writing-statistics__icon--streak">
              <Flame
                className="writing-statistics__flame"
                aria-hidden="true"
                focusable="false"
                strokeWidth={1.3}
              >
                <path
                  className="writing-statistics__flame-core"
                  d="M12 12.5c.5 1.8 3 3 3 5a3 3 0 0 1-6 0c0-1.3 1-2.2 1.5-3.5.2 1 1 1.6 1.5 1.8.4-1.1.3-2.1 0-3.3Z"
                />
              </Flame>
            </span>
            {copy.streak}
          </dt>
          <dd
            className={`writing-statistics__value${loading || !streak ? ' writing-statistics__value--message' : ''}`}
          >
            {loading ? (
              copy.loading
            ) : streak ? (
              <>
                {streak.atLeast && (
                  <>
                    <span aria-hidden="true">≥ </span>
                    <span className="sr-only">{copy.atLeast} </span>
                  </>
                )}
                {numbers.format(streak.count)}{' '}
                <span className="writing-statistics__unit">
                  {streak.count === 1 ? copy.day : copy.days}
                </span>
              </>
            ) : (
              copy.unavailable
            )}
            {!loading && (failed || !streak) && (
              <p className="writing-statistics__hint">
                {failed ? copy.failure : copy.unknown}
              </p>
            )}
            {!loading && streak?.atLeast && (
              <p className="writing-statistics__hint">{copy.partial}</p>
            )}
          </dd>
        </div>
        <div className="writing-statistics__metric">
          <dt>
            <span className="writing-statistics__icon writing-statistics__icon--words">
              <Pencil aria-hidden="true" focusable="false" strokeWidth={1.7} />
            </span>
            {copy.words}
          </dt>
          <dd
            className={`writing-statistics__value${dayLoading || !day ? ' writing-statistics__value--message' : ''}`}
            title={copy.wordsHint}
          >
            {dayLoading
              ? copy.loading
              : day
                ? numbers.format(day.creditedWords)
                : copy.unavailable}
            {dayFailed && (
              <p className="writing-statistics__hint">{copy.failure}</p>
            )}
          </dd>
        </div>
        <div className="writing-statistics__metric">
          <dt>
            <span className="writing-statistics__icon writing-statistics__icon--goals">
              <Target aria-hidden="true" focusable="false" strokeWidth={1.7} />
            </span>
            {copy.goals}
          </dt>
          <dd
            className={`writing-statistics__value${dayLoading || !day ? ' writing-statistics__value--message' : ''}`}
            title={copy.goalsHint}
          >
            {dayLoading ? (
              copy.loading
            ) : day ? (
              <>
                {numbers.format(completedDailyGoals(day))}{' '}
                <span className="writing-statistics__unit">{copy.today}</span>
              </>
            ) : (
              copy.unavailable
            )}
            {dayFailed && (
              <p className="writing-statistics__hint">{copy.failure}</p>
            )}
          </dd>
        </div>
      </dl>
    </Card>
  )
}
