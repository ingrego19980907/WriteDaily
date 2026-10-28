import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import {
  getDailyStatistics,
  getCurrentStreak,
  getLongestStreak,
} from '../../services/activity'
import { listBooks } from '../../services/books'
import {
  activityBooks,
  activityFixture,
} from '../../../tests/fixtures/activity-data'
import { ActivityCalendar } from './ActivityCalendar'
import type { DailyStatisticsRange } from './daily-statistics'

vi.mock('../../services/activity', () => ({
  getDailyStatistics: vi.fn(),
  getLongestStreak: vi.fn(),
  getCurrentStreak: vi.fn(),
}))
vi.mock('../../services/books', () => ({
  listBooks: vi.fn(),
  bookErrorCode: (error: { code: string }) => error.code,
}))
vi.mock('../../hooks/useLocalCalendarDate', () => ({
  useLocalCalendarDate: () => '2026-10-28',
}))
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  })
  vi.resetAllMocks()
  vi.mocked(getLongestStreak).mockRejectedValue({ code: 'persistence' })
  vi.mocked(getCurrentStreak).mockRejectedValue({ code: 'persistence' })
  vi.mocked(listBooks).mockResolvedValue(activityBooks)
  vi.mocked(getDailyStatistics).mockImplementation(async (request) =>
    activityFixture(request),
  )
})
const selected = () => screen.getByRole('region', { name: /Activity for/ })

test('loads actual totals, highlights today and shows historical goals and retained sources', async () => {
  const user = userEvent.setup()
  render(<ActivityCalendar />)
  expect(
    await screen.findByRole('group', { name: 'Month totals' }),
  ).toHaveTextContent('1,905')
  const today = screen.getByRole('button', { name: /Oct 28, 2026:/ })
  expect(today).toHaveAttribute('aria-current', 'date')
  expect(today).toHaveAttribute('aria-pressed', 'true')
  expect(selected()).toHaveTextContent('No historical goal snapshot')
  await user.click(screen.getByRole('button', { name: /Oct 3, 2026:/ }))
  expect(selected()).toHaveTextContent('250 / 500 credited words')
  expect(selected()).toHaveTextContent('250 words remaining')
  await user.click(screen.getByRole('button', { name: /Oct 12, 2026:/ }))
  expect(selected()).toHaveTextContent('Removed book 1')
  expect(selected()).toHaveTextContent('Daily goal reached')
  await user.click(screen.getByRole('button', { name: /Oct 27, 2026:/ }))
  expect(within(selected()).getByText('10')).toBeVisible()
  expect(selected()).toHaveTextContent('500 words remaining')
})

test('filters books, navigates months and returns to the local current day', async () => {
  const user = userEvent.setup()
  render(<ActivityCalendar />)
  await screen.findByRole('group', { name: 'Month totals' })
  await user.selectOptions(screen.getByLabelText('Book'), activityBooks[0].id)
  await waitFor(() =>
    expect(
      screen.getByRole('group', { name: 'Month totals' }),
    ).toHaveTextContent('850'),
  )
  await user.click(screen.getByRole('button', { name: 'Next month' }))
  expect(
    await screen.findByText('No writing activity recorded this month.'),
  ).toBeVisible()
  expect(getDailyStatistics).toHaveBeenLastCalledWith({
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    bookId: activityBooks[0].id,
  })
  await user.click(screen.getByRole('button', { name: 'Today' }))
  await screen.findByRole('button', { name: /Oct 28, 2026:/ })
  expect(screen.getByRole('button', { name: /Oct 28, 2026:/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('pending and failed reads never manufacture zero totals; refresh recovers', async () => {
  let fail!: (error: unknown) => void
  vi.mocked(getDailyStatistics).mockReturnValueOnce(
    new Promise((_resolve, reject) => {
      fail = reject
    }),
  )
  const user = userEvent.setup()
  render(<ActivityCalendar />)
  expect(screen.getByText('Loading activity...')).toBeVisible()
  expect(
    screen.queryByRole('group', { name: 'Month totals' }),
  ).not.toBeInTheDocument()
  await act(async () => fail({ code: 'persistence' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Could not load activity')
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Refresh activity' }))
  expect(
    await screen.findByRole('table', { name: 'October 2026' }),
  ).toBeVisible()
})

test('late results cannot replace a newer month and unmount ignores outstanding reads', async () => {
  let finish!: (value: DailyStatisticsRange) => void
  vi.mocked(getDailyStatistics).mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  const user = userEvent.setup()
  const view = render(<ActivityCalendar />)
  await user.click(screen.getByRole('button', { name: 'Next month' }))
  await screen.findByRole('table', { name: 'November 2026' })
  await act(async () =>
    finish(
      activityFixture({
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        bookId: null,
      }),
    ),
  )
  expect(screen.getByRole('table', { name: 'November 2026' })).toBeVisible()
  expect(
    screen.queryByRole('table', { name: 'October 2026' }),
  ).not.toBeInTheDocument()
  view.unmount()
})

test('keyboard selection has one tab stop and handles arrows, Home and End', async () => {
  render(<ActivityCalendar />)
  const today = await screen.findByRole('button', { name: /Oct 28, 2026:/ })
  today.focus()
  fireEvent.keyDown(today, { key: 'ArrowLeft' })
  const day = screen.getByRole('button', { name: /Oct 27, 2026:/ })
  expect(day).toHaveFocus()
  expect(day).toHaveAttribute('aria-pressed', 'true')
  fireEvent.keyDown(day, { key: 'Home' })
  expect(screen.getByRole('button', { name: /Oct 1, 2026:/ })).toHaveFocus()
  fireEvent.keyDown(document.activeElement!, { key: 'End' })
  expect(screen.getByRole('button', { name: /Oct 31, 2026:/ })).toHaveFocus()
  expect(
    screen
      .getAllByRole('button')
      .filter(
        (button) => button.getAttribute('data-date') && button.tabIndex === 0,
      ),
  ).toHaveLength(1)
})

test('focus refreshes committed data, while missing book names do not block statistics', async () => {
  vi.mocked(listBooks).mockRejectedValue({ code: 'persistence' })
  render(<ActivityCalendar />)
  await screen.findByRole('group', { name: 'Month totals' })
  expect(screen.getByText(/Book names could not be loaded/)).toBeVisible()
  fireEvent(window, new Event('focus'))
  await waitFor(() => expect(getDailyStatistics).toHaveBeenCalledTimes(2))
})
