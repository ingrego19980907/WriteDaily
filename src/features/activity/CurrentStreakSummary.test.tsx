import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { getCurrentStreak } from '../../services/activity'
import { CurrentStreakSummary } from './CurrentStreakSummary'
import type { CurrentStreak } from './current-streak'
vi.mock('../../services/activity', () => ({ getCurrentStreak: vi.fn() }))
vi.mock('../../hooks/useLocalCalendarDate', () => ({
  useLocalCalendarDate: () => '2026-10-28',
}))
const value: CurrentStreak = {
  today: '2026-10-28',
  bookId: null,
  days: 3,
  exact: true,
  todayState: 'pending',
  todayCreditedWords: 50,
  startDate: '2026-10-25',
  lastCompletedDate: '2026-10-27',
  boundary: 'missed_day',
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getCurrentStreak).mockResolvedValue(value)
})

test('shows exact count, today credit and the open-day grace explanation', async () => {
  render(<CurrentStreakSummary />)
  expect(await screen.findByText('3 completed days')).toBeVisible()
  expect(screen.getByText(/Today has not added/)).toBeVisible()
  expect(
    screen.getByText('Today (Oct 28, 2026): 50 credited words'),
  ).toBeVisible()
})
test('lower bounds and insufficient history are explicit rather than false exact counts', async () => {
  vi.mocked(getCurrentStreak).mockResolvedValueOnce({
    ...value,
    exact: false,
    boundary: 'history_start',
  })
  const view = render(<CurrentStreakSummary />)
  expect(await screen.findByText('At least 3 completed days')).toBeVisible()
  vi.mocked(getCurrentStreak).mockResolvedValue({
    ...value,
    bookId: '00000000-0000-4000-8000-000000000001',
    days: 0,
    exact: false,
    boundary: 'unknown_day',
    startDate: null,
    lastCompletedDate: null,
  })
  view.rerender(
    <CurrentStreakSummary bookId="00000000-0000-4000-8000-000000000001" />,
  )
  expect(
    await screen.findByText('Not enough recorded history to confirm a streak.'),
  ).toBeVisible()
  expect(screen.queryByText('0 completed days')).not.toBeInTheDocument()
})
test('pending and failed requests never show a manufactured zero; retry recovers', async () => {
  let fail!: (error: unknown) => void
  vi.mocked(getCurrentStreak).mockReturnValueOnce(
    new Promise((_resolve, reject) => {
      fail = reject
    }),
  )
  const user = userEvent.setup()
  render(<CurrentStreakSummary />)
  expect(screen.getByText('Loading streak...')).toBeVisible()
  expect(screen.queryByText(/0 completed days/)).not.toBeInTheDocument()
  await act(async () => fail({ code: 'persistence' }))
  expect(
    screen.getByText('Streak could not be loaded. Try refreshing.'),
  ).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Refresh streak' }))
  expect(await screen.findByText('3 completed days')).toBeVisible()
})
test('inactive views do not read and late responses cannot replace a changed book scope', async () => {
  let finish!: (value: CurrentStreak) => void
  vi.mocked(getCurrentStreak).mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  const view = render(<CurrentStreakSummary active={false} />)
  expect(getCurrentStreak).not.toHaveBeenCalled()
  view.rerender(<CurrentStreakSummary />)
  await waitFor(() => expect(getCurrentStreak).toHaveBeenCalledTimes(1))
  vi.mocked(getCurrentStreak).mockResolvedValue({
    ...value,
    bookId: '00000000-0000-4000-8000-000000000001',
    exact: false,
    boundary: 'history_start',
  })
  view.rerender(
    <CurrentStreakSummary bookId="00000000-0000-4000-8000-000000000001" />,
  )
  await screen.findByText('At least 3 completed days')
  await act(async () => finish(value))
  expect(
    screen.queryByText('3 completed days', { exact: true }),
  ).not.toBeInTheDocument()
})
