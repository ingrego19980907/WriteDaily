import { en } from '../../app/i18n/en'
import { Card } from '../../components/ui/Card'
import { formatCalendarDate } from '../../utils/calendar-date'
import type { DailyStatistics } from './daily-statistics'
import type { Book } from '../library/book'

const copy = en.activity
const numbers = new Intl.NumberFormat('en')

export function ActivityDayDetails({
  day,
  books,
  id,
}: {
  day: DailyStatistics
  books: readonly Book[]
  id: string
}) {
  return (
    <Card
      className="space-y-4 min-w-0"
      role="region"
      aria-labelledby={`${id}-heading`}
      id={id}
    >
      <h2
        id={`${id}-heading`}
        className="font-writing text-writing break-words"
      >
        {copy.dayDetails(formatCalendarDate(day.date))}
      </h2>
      {day.saveCount === 0 && <p className="text-secondary">{copy.emptyDay}</p>}
      {typeof day.writingDay === 'boolean' && (
        <p className="text-secondary">
          {day.writingDay ? copy.scheduledDay : copy.restDay}
        </p>
      )}
      <dl className="activity-metrics">
        {[
          [copy.credited, day.creditedWords],
          [copy.added, day.addedWords],
          [copy.deleted, day.deletedWords],
          [copy.saves, day.saveCount],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{numbers.format(Number(value))}</dd>
          </div>
        ))}
      </dl>
      <p className="text-secondary text-sm">{copy.savePolicy}</p>
      <h3 className="font-semibold">{copy.goals}</h3>
      {day.bookGoals.length === 0 ? (
        <p className="text-secondary">{copy.noPlans}</p>
      ) : (
        <ul className="space-y-3">
          {day.bookGoals.map((goal, index) => {
            const title =
              goal.bookId === null
                ? copy.removedBook(index + 1)
                : (books.find((book) => book.id === goal.bookId)?.title ??
                  copy.unnamedBook(index + 1))
            return (
              <li key={goal.sourceBookId} className="space-y-1 break-words">
                <h4 className="font-semibold">{title}</h4>
                {goal.dailyWordGoal !== null && (
                  <p>
                    {copy.goalProgress(
                      numbers.format(goal.creditedWords),
                      numbers.format(goal.dailyWordGoal),
                    )}
                  </p>
                )}
                <p
                  className={
                    goal.state === 'reached' ? 'text-success' : 'text-secondary'
                  }
                >
                  {goal.state === 'reached'
                    ? copy.reached
                    : goal.state === 'pending'
                      ? copy.pending(numbers.format(goal.remainingWords!))
                      : goal.state === 'unscheduled'
                        ? copy.unscheduled
                        : copy.unconfigured}
                </p>
              </li>
            )
          })}
        </ul>
      )}
      <p className="text-secondary text-sm">{copy.planPolicy}</p>
    </Card>
  )
}
