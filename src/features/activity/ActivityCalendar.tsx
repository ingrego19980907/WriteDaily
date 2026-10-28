import { useEffect, useId, useState, type KeyboardEvent } from 'react'
import { en } from '../../app/i18n/en'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { useLocalCalendarDate } from '../../hooks/useLocalCalendarDate'
import { getDailyStatistics } from '../../services/activity'
import { bookErrorCode, listBooks } from '../../services/books'
import { formatCalendarDate } from '../../utils/calendar-date'
import type { Book } from '../library/book'
import type { DailyStatisticsRange } from './daily-statistics'
import {
  activityIntensity,
  activityMonth,
  activityMonthSummary,
  adjacentActivityMonth,
  formatActivityMonth,
} from './activity-calendar'
import { ActivityDayDetails } from './ActivityDayDetails'
import { CurrentStreakSummary } from './CurrentStreakSummary'
import './activity-calendar.css'

const copy = en.activity
const numbers = new Intl.NumberFormat('en')
type Result =
  | { key: string; data: DailyStatisticsRange; error?: never }
  | { key: string; error: string; data?: never }
function failureMessage(error: unknown) {
  switch (bookErrorCode(error)) {
    case 'desktop_required':
      return copy.desktop
    case 'not_found':
      return copy.missingBook
    case 'invalid_stored_data':
      return copy.invalidData
    case 'limit_reached':
      return copy.limit
    default:
      return copy.failure
  }
}

export function ActivityCalendar() {
  const today = useLocalCalendarDate()
  const [monthInput, setMonthInput] = useState(() => today?.slice(0, 7) ?? '')
  const [bookId, setBookId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(() => today ?? '')
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const [books, setBooks] = useState<Book[]>([])
  const [booksFailure, setBooksFailure] = useState('')
  const id = useId()
  const month = activityMonth(monthInput)
  const start = month?.startDate
  const end = month?.endDate
  const key = JSON.stringify([start, end, bookId, refreshVersion, today])

  useEffect(() => {
    if (!start || !end) return
    let active = true
    void getDailyStatistics({ startDate: start, endDate: end, bookId }).then(
      (data) => {
        if (active) setResult({ key, data })
      },
      (error: unknown) => {
        if (active) setResult({ key, error: failureMessage(error) })
      },
    )
    return () => {
      active = false
    }
  }, [key, start, end, bookId])

  useEffect(() => {
    let active = true
    void listBooks().then(
      (loaded) => {
        if (active) {
          setBooks(loaded)
          setBooksFailure('')
        }
      },
      (error: unknown) => {
        if (active && bookErrorCode(error) !== 'desktop_required')
          setBooksFailure(copy.booksFailure)
      },
    )
    return () => {
      active = false
    }
  }, [refreshVersion])

  useEffect(() => {
    const refresh = () => setRefreshVersion((version) => version + 1)
    const visible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', visible)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [])

  function chooseMonth(value: string, selected?: string) {
    setMonthInput(value)
    const next = activityMonth(value)
    if (next)
      setSelectedDate(
        selected ?? (today?.startsWith(value) ? today : next.startDate),
      )
  }
  function chooseDay(date: string) {
    setSelectedDate(date)
  }
  function keyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!month) return
    const shifts: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    }
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? month.days.length - 1
          : event.key in shifts
            ? Math.max(
                0,
                Math.min(month.days.length - 1, index + shifts[event.key]),
              )
            : null
    if (next === null) return
    event.preventDefault()
    const date = month.days[next]
    chooseDay(date)
    const button = event.currentTarget
      .closest('table')
      ?.querySelector<HTMLButtonElement>(`[data-date="${date}"]`)
    button?.focus()
    button?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }

  const loading = month !== null && result?.key !== key
  const data = result?.key === key ? result.data : undefined
  const error = result?.key === key ? result.error : undefined
  const selected =
    data?.days.find((day) => day.date === selectedDate) ?? data?.days[0]
  const summary = data ? activityMonthSummary(data.days) : null
  const previous = adjacentActivityMonth(monthInput, -1)
  const next = adjacentActivityMonth(monthInput, 1)
  const slots = month
    ? [...Array<null>(month.leading).fill(null), ...month.days]
    : []
  while (slots.length % 7) slots.push(null)

  return (
    <section className="space-y-4 min-w-0" aria-label={copy.calendar}>
      <CurrentStreakSummary
        bookId={bookId}
        refreshVersion={refreshVersion}
        refreshOnFocus={false}
      />
      <Card className="space-y-4 min-w-0">
        {!today && <p className="text-secondary">{copy.clockUnavailable}</p>}
        <div className="activity-controls">
          <Input
            label={copy.month}
            type="month"
            value={monthInput}
            min="0001-01"
            max="9999-12"
            onChange={(event) => chooseMonth(event.target.value)}
            error={!month ? copy.invalidMonth : undefined}
          />
          <div className="input-field">
            <label className="input-field__label" htmlFor={`${id}-book`}>
              {copy.book}
            </label>
            <select
              className="input"
              id={`${id}-book`}
              value={bookId ?? ''}
              onChange={(event) => setBookId(event.target.value || null)}
            >
              <option value="">{copy.allBooks}</option>
              {books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title}
                </option>
              ))}
              {bookId && !books.some((book) => book.id === bookId) && (
                <option value={bookId}>{copy.unavailableBook}</option>
              )}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            className="h-11 w-11 shrink-0 p-2"
            aria-label={copy.previousMonth}
            title={copy.previousMonth}
            disabled={!previous}
            onClick={() => previous && chooseMonth(previous)}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="m14 6-6 6 6 6" />
            </svg>
          </Button>
          <Button
            variant="ghost"
            className="h-11 w-11 shrink-0 p-2"
            aria-label={copy.nextMonth}
            title={copy.nextMonth}
            disabled={!next}
            onClick={() => next && chooseMonth(next)}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="m10 6 6 6-6 6" />
            </svg>
          </Button>
          <Button
            variant="secondary"
            disabled={!today}
            onClick={() => today && chooseMonth(today.slice(0, 7), today)}
          >
            {copy.today}
          </Button>
          <Button
            variant="secondary"
            disabled={loading || !month}
            onClick={() => setRefreshVersion((version) => version + 1)}
          >
            {copy.refresh}
          </Button>
        </div>
        {booksFailure && (
          <p className="text-secondary" role="status">
            {booksFailure}
          </p>
        )}
        {month && (
          <h2 className="font-writing text-writing break-words">
            {formatActivityMonth(monthInput)}
          </h2>
        )}
        {loading && <p role="status">{copy.loading}</p>}
        {error && (
          <p role="alert" className="text-error break-words">
            {error}
          </p>
        )}
        {data && month && (
          <>
            <div role="group" aria-label={copy.monthTotals}>
              <dl className="activity-metrics">
                <div>
                  <dt>{copy.credited}</dt>
                  <dd>
                    {summary?.creditedWords === null
                      ? copy.totalUnavailable
                      : numbers.format(summary?.creditedWords ?? 0)}
                  </dd>
                </div>
                <div>
                  <dt>{copy.activeDays}</dt>
                  <dd>{numbers.format(summary?.activeDays ?? 0)}</dd>
                </div>
              </dl>
            </div>
            {data.days.every((day) => day.saveCount === 0) && (
              <p className="text-secondary">{copy.emptyMonth}</p>
            )}
            <p id={`${id}-hint`} className="text-secondary text-sm">
              {copy.keyboardHint}
            </p>
            <div
              className="activity-calendar-scroll"
              role="region"
              aria-label={copy.calendarScroll}
              tabIndex={0}
              aria-describedby={`${id}-hint`}
            >
              <table className="activity-calendar-table">
                <caption className="sr-only">
                  {formatActivityMonth(monthInput)}
                </caption>
                <thead>
                  <tr>
                    {copy.weekdays.map((day, index) => (
                      <th key={day} scope="col">
                        <abbr title={copy.weekdayNames[index]}>{day}</abbr>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: slots.length / 7 }, (_, week) => (
                    <tr key={week}>
                      {slots
                        .slice(week * 7, week * 7 + 7)
                        .map((date, weekday) => (
                          <td key={weekday}>
                            {date &&
                              (() => {
                                const day = data.days.find(
                                  (item) => item.date === date,
                                )!
                                const level = activityIntensity(
                                  day.creditedWords,
                                )
                                const label = copy.dayLabel(
                                  formatCalendarDate(date),
                                  numbers.format(day.creditedWords),
                                  numbers.format(day.saveCount),
                                )
                                return (
                                  <button
                                    type="button"
                                    data-date={date}
                                    className="activity-calendar-day"
                                    data-level={level}
                                    aria-label={label}
                                    title={label}
                                    aria-pressed={selected?.date === date}
                                    aria-current={
                                      date === today ? 'date' : undefined
                                    }
                                    aria-controls={`${id}-details`}
                                    tabIndex={selected?.date === date ? 0 : -1}
                                    onClick={() => chooseDay(date)}
                                    onKeyDown={(event) =>
                                      keyDown(event, month.days.indexOf(date))
                                    }
                                  >
                                    <span>{Number(date.slice(8))}</span>
                                    <span
                                      className="activity-calendar-bar"
                                      style={{ width: `${level * 25}%` }}
                                      aria-hidden="true"
                                    />
                                  </button>
                                )
                              })()}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-secondary">{copy.legend}</p>
              <ul className="activity-legend">
                {copy.levels.map((label, level) => (
                  <li key={level}>
                    <span
                      className="activity-legend-swatch"
                      data-level={level}
                      aria-hidden="true"
                    >
                      <span style={{ width: `${level * 25}%` }} />
                    </span>
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
        <p className="text-secondary text-sm">{copy.policy}</p>
      </Card>
      {selected && (
        <ActivityDayDetails day={selected} books={books} id={`${id}-details`} />
      )}
    </section>
  )
}
