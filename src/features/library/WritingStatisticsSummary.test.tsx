import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import { getDailyStatistics } from '../../services/activity'
import { WritingStatisticsSummary } from './WritingStatisticsSummary'
import type { CurrentStreakSnapshot } from '../activity/CurrentStreakSummary'
import type { DailyStatisticsRange } from '../activity/daily-statistics'
import { streak, day } from '../../../tests/fixtures/writing-statistics-data'

vi.mock('../../services/activity', () => ({ getDailyStatistics: vi.fn() }))
const props: CurrentStreakSnapshot = {
  today: streak.today,
  data: streak,
  loading: false,
  failed: false,
  refreshKey: 'first',
  active: true,
}
const range: DailyStatisticsRange = {
  startDate: day.date,
  endDate: day.date,
  bookId: null,
  days: [day],
}
const definition = (label: string) =>
  screen.getByText(label, { selector: 'dt' }).nextElementSibling!
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getDailyStatistics).mockResolvedValue(range)
})

test('shows saved words and today reached goals from the global day reader', async () => {
  render(<WritingStatisticsSummary {...props} />)
  await waitFor(() =>
    expect(definition('Words written today')).toHaveTextContent(/^50$/),
  )
  expect(definition('Daily goals completed')).toHaveTextContent(/^2 today$/)
  expect(definition('Current streak')).toHaveTextContent(/^3 days$/)
  expect(getDailyStatistics).toHaveBeenCalledWith({
    startDate: day.date,
    endDate: day.date,
    bookId: null,
  })
})

test('a failed streak read does not hide independently available daily results', async () => {
  render(<WritingStatisticsSummary {...props} data={undefined} failed />)
  expect(definition('Current streak')).toHaveTextContent('Unavailable')
  expect(definition('Current streak')).not.toHaveTextContent('0 days')
  await waitFor(() =>
    expect(definition('Words written today')).toHaveTextContent(/^50$/),
  )
  expect(definition('Daily goals completed')).toHaveTextContent(/^2 today$/)
})

test('one confirmed day uses the singular unit', () => {
  render(
    <WritingStatisticsSummary
      {...props}
      data={{ ...streak, days: 1, startDate: streak.today }}
    />,
  )
  expect(definition('Current streak')).toHaveTextContent(/^1 day$/)
})
test('loading and failed reads never show fake zeros and can refresh independently of the streak', async () => {
  let fail!: (error: unknown) => void
  vi.mocked(getDailyStatistics).mockReturnValueOnce(
    new Promise((_resolve, reject) => {
      fail = reject
    }),
  )
  const view = render(<WritingStatisticsSummary {...props} />)
  expect(definition('Words written today')).toHaveTextContent('Loading…')
  expect(definition('Daily goals completed')).not.toHaveTextContent('0')
  await act(async () => fail({ code: 'persistence' }))
  expect(definition('Words written today')).toHaveTextContent('Unavailable')
  expect(definition('Current streak')).toHaveTextContent('3 days')
  view.rerender(<WritingStatisticsSummary {...props} refreshKey="retry" />)
  await waitFor(() =>
    expect(definition('Words written today')).toHaveTextContent(/^50$/),
  )
})
test('unknown streaks and lower bounds retain their meaning while daily statistics remain readable', async () => {
  const view = render(
    <WritingStatisticsSummary {...props} data={{ ...streak, exact: false }} />,
  )
  expect(definition('Current streak')).toHaveTextContent('≥')
  expect(definition('Current streak')).toHaveTextContent('At least')
  view.rerender(
    <WritingStatisticsSummary
      {...props}
      data={{ ...streak, days: 0, exact: false }}
    />,
  )
  expect(definition('Current streak')).toHaveTextContent('Unavailable')
  expect(definition('Current streak')).not.toHaveTextContent('0 days')
  await waitFor(() =>
    expect(definition('Words written today')).toHaveTextContent(/^50$/),
  )
})
test('old-day responses cannot replace a refreshed day and inactive summaries do not read', async () => {
  let finish!: (data: DailyStatisticsRange) => void
  vi.mocked(getDailyStatistics).mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  const view = render(<WritingStatisticsSummary {...props} active={false} />)
  expect(getDailyStatistics).not.toHaveBeenCalled()
  view.rerender(<WritingStatisticsSummary {...props} />)
  vi.mocked(getDailyStatistics).mockResolvedValue({
    ...range,
    startDate: '2026-10-29',
    endDate: '2026-10-29',
    days: [
      {
        ...day,
        date: '2026-10-29',
        creditedWords: 0,
        addedWords: 0,
        deletedWords: 0,
        bookGoals: [],
        saveCount: 0,
        active: false,
      },
    ],
  })
  view.rerender(
    <WritingStatisticsSummary
      {...props}
      today="2026-10-29"
      refreshKey="tomorrow"
    />,
  )
  await waitFor(() =>
    expect(definition('Words written today')).toHaveTextContent(/^0$/),
  )
  await act(async () => finish(range))
  expect(definition('Words written today')).toHaveTextContent(/^0$/)
  expect(definition('Daily goals completed')).toHaveTextContent(/^0 today$/)
})
