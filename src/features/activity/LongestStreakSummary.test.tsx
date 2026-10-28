import { act, render, screen } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import { getLongestStreak } from '../../services/activity'
import { LongestStreakSummary } from './LongestStreakSummary'
import type { LongestStreak } from './longest-streak'

vi.mock('../../services/activity', () => ({ getLongestStreak: vi.fn() }))
const value: LongestStreak = {
  today: '2026-10-28',
  bookId: null,
  days: 7,
  exact: true,
  historyStartDate: '2026-10-01',
  startDate: '2026-10-10',
  endDate: '2026-10-16',
}
const props = {
  today: value.today,
  bookId: null,
  refreshKey: 'first',
  active: true,
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getLongestStreak).mockResolvedValue(value)
})
test('shows the recorded maximum and its dates independently of the current run', async () => {
  render(<LongestStreakSummary {...props} />)
  expect(await screen.findByText('7 completed days')).toBeVisible()
  expect(screen.getByText('Oct 10, 2026 – Oct 16, 2026')).toBeVisible()
  expect(screen.getByText(/recorded history since Oct 1, 2026/)).toBeVisible()
})
test('shows lower bounds and insufficient history without inventing an exact zero', async () => {
  vi.mocked(getLongestStreak).mockResolvedValueOnce({ ...value, exact: false })
  const view = render(<LongestStreakSummary {...props} />)
  expect(await screen.findByText('At least 7 completed days')).toBeVisible()
  vi.mocked(getLongestStreak).mockResolvedValue({
    ...value,
    exact: false,
    days: 0,
    startDate: null,
    endDate: null,
  })
  view.rerender(<LongestStreakSummary {...props} refreshKey="second" />)
  expect(
    await screen.findByText('Not enough recorded history to confirm a streak.'),
  ).toBeVisible()
  expect(screen.queryByText('0 completed days')).not.toBeInTheDocument()
})
test('late responses cannot replace a scope change; errors can be refreshed', async () => {
  let finish!: (data: LongestStreak) => void
  vi.mocked(getLongestStreak).mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  const view = render(<LongestStreakSummary {...props} />)
  expect(screen.getByText('Loading longest streak...')).toBeVisible()
  vi.mocked(getLongestStreak).mockRejectedValueOnce({ code: 'persistence' })
  view.rerender(
    <LongestStreakSummary
      {...props}
      bookId="00000000-0000-4000-8000-000000000001"
      refreshKey="second"
    />,
  )
  await screen.findByText('Longest streak could not be loaded. Try refreshing.')
  await act(async () => finish(value))
  expect(screen.queryByText('7 completed days')).not.toBeInTheDocument()
  view.rerender(<LongestStreakSummary {...props} refreshKey="third" />)
  expect(await screen.findByText('7 completed days')).toBeVisible()
})
test('inactive summary never reads persistence', () => {
  render(<LongestStreakSummary {...props} active={false} />)
  expect(getLongestStreak).not.toHaveBeenCalled()
})
