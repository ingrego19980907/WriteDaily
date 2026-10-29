import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { useLocalCalendarDate } from '../../hooks/useLocalCalendarDate'
import {
  getAchievementUnlocks,
  refreshAchievements,
} from '../../services/achievements'
import { AchievementsPage } from './AchievementsPage'
import type {
  AchievementRefresh,
  AchievementUnlock,
} from './achievement-unlocks'

vi.mock('../../services/achievements', () => ({
  getAchievementUnlocks: vi.fn(),
  refreshAchievements: vi.fn(),
}))
vi.mock('../../hooks/useLocalCalendarDate', () => ({
  useLocalCalendarDate: vi.fn(),
}))
const first: AchievementUnlock = {
  achievementId: 'first_words',
  rulePolicyVersion: 1,
  unlockedAt: '2026-10-28T10:00:00.000Z',
}
const second: AchievementUnlock = {
  ...first,
  achievementId: 'getting_started',
  unlockedAt: '2026-10-29T10:00:00.000Z',
}
const refreshed = (
  unlocks: readonly AchievementUnlock[],
): AchievementRefresh => ({ unlocks, newlyUnlocked: [] })
function deferred<T>() {
  let resolve!: (data: T) => void
  const promise = new Promise<T>((finish) => {
    resolve = finish
  })
  return { promise, resolve }
}
async function complete() {
  await screen.findByText('Achievements updated.')
}
async function focus() {
  await act(async () => {
    window.dispatchEvent(new Event('focus'))
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(useLocalCalendarDate).mockReturnValue('2026-10-29')
  vi.mocked(getAchievementUnlocks).mockResolvedValue([])
  vi.mocked(refreshAchievements).mockResolvedValue(refreshed([]))
})

test('loads existing and reconciled native unlocks into all eight real catalog cards', async () => {
  vi.mocked(getAchievementUnlocks).mockResolvedValue([first])
  vi.mocked(refreshAchievements).mockResolvedValue({
    unlocks: [first, second],
    newlyUnlocked: [second],
  })
  render(<AchievementsPage />)
  await complete()
  expect(screen.getByText('2 / 8 unlocked')).toBeVisible()
  expect(screen.getAllByRole('article')).toHaveLength(8)
  for (const name of ['First Words', 'Getting Started']) {
    expect(
      within(screen.getByRole('article', { name })).getByText('Unlocked', {
        exact: true,
      }),
    ).toBeVisible()
  }
  expect(screen.getAllByText('Locked', { exact: true })).toHaveLength(6)
  expect(
    screen.queryByText('Your next milestone awaits'),
  ).not.toBeInTheDocument()
  expect(getAchievementUnlocks).toHaveBeenCalledTimes(1)
  expect(refreshAchievements).toHaveBeenCalledWith()
})

test('loading is not an empty library or an invented zero count', async () => {
  const pending = deferred<readonly AchievementUnlock[]>()
  vi.mocked(getAchievementUnlocks).mockReturnValue(pending.promise)
  render(<AchievementsPage />)
  expect(screen.getByRole('status')).toHaveTextContent('Loading achievements…')
  expect(screen.getByText('Unlock count unavailable.')).toBeVisible()
  expect(
    screen.getByRole('button', { name: 'Refresh achievements' }),
  ).toBeDisabled()
  expect(screen.queryByRole('article')).not.toBeInTheDocument()
  expect(
    screen.queryByText('Your next milestone awaits'),
  ).not.toBeInTheDocument()
  await act(async () => pending.resolve([]))
  await complete()
  expect(screen.getByText('0 / 8 unlocked')).toBeVisible()
  expect(screen.getByText('Your next milestone awaits')).toBeVisible()
  expect(screen.getAllByText('Locked', { exact: true })).toHaveLength(8)
})

test('new unlocks appear only after the native refresh response confirms them', async () => {
  const pending = deferred<AchievementRefresh>()
  vi.mocked(refreshAchievements).mockReturnValue(pending.promise)
  render(<AchievementsPage />)
  await screen.findByText('0 / 8 unlocked')
  expect(screen.getByRole('status')).toHaveTextContent(
    'Refreshing achievements…',
  )
  expect(
    screen.queryByText('Your next milestone awaits'),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByText('Unlocked', { exact: true }),
  ).not.toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Refresh achievements' }),
  ).toBeDisabled()
  await act(async () =>
    pending.resolve({ unlocks: [first], newlyUnlocked: [first] }),
  )
  await complete()
  expect(screen.getByText('1 / 8 unlocked')).toBeVisible()
  expect(screen.getByText(/^Unlocked /)).toHaveAttribute(
    'datetime',
    first.unlockedAt,
  )
})

test('failed initial read has unavailable cards and a keyboard retry, without an empty-success message', async () => {
  const user = userEvent.setup()
  vi.mocked(getAchievementUnlocks).mockRejectedValueOnce({
    code: 'persistence',
  })
  render(<AchievementsPage />)
  await screen.findByRole('alert')
  expect(screen.getByText('Unlock count unavailable.')).toBeVisible()
  expect(
    screen.getAllByText('Status unavailable', { exact: true }),
  ).toHaveLength(8)
  expect(
    screen.queryByText('Your next milestone awaits'),
  ).not.toBeInTheDocument()
  expect(refreshAchievements).not.toHaveBeenCalled()
  const retry = screen.getByRole('button', { name: 'Retry achievements' })
  retry.focus()
  await user.keyboard('{Enter}')
  await complete()
  expect(screen.getByText('Your next milestone awaits')).toBeVisible()
  expect(getAchievementUnlocks).toHaveBeenCalledTimes(2)
  expect(refreshAchievements).toHaveBeenCalledTimes(1)
})

test('refresh failure retains the successfully read snapshot and recovers without duplicates', async () => {
  const user = userEvent.setup()
  vi.mocked(getAchievementUnlocks).mockResolvedValue([first])
  vi.mocked(refreshAchievements)
    .mockRejectedValueOnce({ code: 'persistence' })
    .mockResolvedValue(refreshed([first, second]))
  render(<AchievementsPage />)
  await screen.findByRole('alert')
  expect(
    screen.getByText('Showing the last confirmed achievements.'),
  ).toBeVisible()
  expect(screen.getByText('1 / 8 unlocked')).toBeVisible()
  expect(screen.getByText('Unlocked', { exact: true })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Retry achievements' }))
  await complete()
  expect(screen.getByText('2 / 8 unlocked')).toBeVisible()
  expect(screen.getAllByRole('article')).toHaveLength(8)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('hidden page has no reads/listeners, and navigation retains its confirmed snapshot', async () => {
  vi.mocked(getAchievementUnlocks).mockResolvedValue([first])
  vi.mocked(refreshAchievements).mockResolvedValue(refreshed([first]))
  const { rerender } = render(<AchievementsPage active={false} />)
  await focus()
  expect(getAchievementUnlocks).not.toHaveBeenCalled()
  rerender(<AchievementsPage active />)
  await complete()
  rerender(<AchievementsPage active={false} />)
  await focus()
  expect(getAchievementUnlocks).toHaveBeenCalledTimes(1)
  vi.mocked(getAchievementUnlocks).mockRejectedValue({ code: 'persistence' })
  rerender(<AchievementsPage active />)
  await screen.findByRole('alert')
  expect(screen.getByText('1 / 8 unlocked')).toBeVisible()
  expect(screen.getByText('Unlocked', { exact: true })).toBeVisible()
  expect(getAchievementUnlocks).toHaveBeenCalledTimes(2)
})

test('late reads cannot overwrite a newer snapshot or launch hidden reconciliation', async () => {
  const old = deferred<readonly AchievementUnlock[]>()
  vi.mocked(getAchievementUnlocks)
    .mockReturnValueOnce(old.promise)
    .mockResolvedValue([first])
  vi.mocked(refreshAchievements).mockResolvedValue(refreshed([first]))
  render(<AchievementsPage />)
  await focus()
  await complete()
  await act(async () => old.resolve([]))
  expect(screen.getByText('1 / 8 unlocked')).toBeVisible()
  expect(refreshAchievements).toHaveBeenCalledTimes(1)
})

test('late refresh responses cannot erase a newer confirmed result', async () => {
  const old = deferred<AchievementRefresh>()
  vi.mocked(getAchievementUnlocks)
    .mockResolvedValueOnce([first])
    .mockResolvedValue([first, second])
  vi.mocked(refreshAchievements)
    .mockReturnValueOnce(old.promise)
    .mockResolvedValue(refreshed([first, second]))
  render(<AchievementsPage />)
  await screen.findByText('1 / 8 unlocked')
  await focus()
  await complete()
  await act(async () => old.resolve(refreshed([])))
  expect(screen.getByText('2 / 8 unlocked')).toBeVisible()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test.each([
  { snapshot: [] },
  { snapshot: [{ ...first, unlockedAt: '2026-10-29T10:00:00.000Z' }] },
])(
  'disappearing or rewritten permanent unlocks retain the original snapshot (%#)',
  async ({ snapshot: bad }) => {
    vi.mocked(getAchievementUnlocks)
      .mockResolvedValueOnce([first])
      .mockResolvedValue(bad)
    vi.mocked(refreshAchievements).mockResolvedValue(refreshed([first]))
    render(<AchievementsPage />)
    await complete()
    await focus()
    await screen.findByRole('alert')
    expect(
      screen.getByText(
        'Saved achievement data could not be verified. Please try again.',
      ),
    ).toBeVisible()
    expect(screen.getByText('1 / 8 unlocked')).toBeVisible()
    expect(screen.getByText(/^Unlocked /)).toHaveAttribute(
      'datetime',
      first.unlockedAt,
    )
  },
)

test('local-date changes and visible/focus events refresh only the active reader', async () => {
  const { rerender } = render(<AchievementsPage />)
  await complete()
  vi.mocked(useLocalCalendarDate).mockReturnValue('2026-10-30')
  rerender(<AchievementsPage />)
  await waitFor(() => expect(refreshAchievements).toHaveBeenCalledTimes(2))
  await act(async () => document.dispatchEvent(new Event('visibilitychange')))
  await waitFor(() => expect(refreshAchievements).toHaveBeenCalledTimes(3))
  rerender(<AchievementsPage active={false} />)
  await focus()
  expect(refreshAchievements).toHaveBeenCalledTimes(3)
})

test('unmounted pending reads cannot reconcile or alter the cached state', async () => {
  const old = deferred<readonly AchievementUnlock[]>()
  vi.mocked(getAchievementUnlocks)
    .mockReturnValueOnce(old.promise)
    .mockResolvedValue([first])
  vi.mocked(refreshAchievements).mockResolvedValue(refreshed([first]))
  const { rerender } = render(<AchievementsPage />)
  rerender(<AchievementsPage active={false} />)
  await act(async () => old.resolve([]))
  expect(refreshAchievements).not.toHaveBeenCalled()
  rerender(<AchievementsPage active />)
  await complete()
  expect(screen.getByText('1 / 8 unlocked')).toBeVisible()
})

test('browser preview explains the desktop requirement without persistence or a functional-looking retry', async () => {
  vi.mocked(getAchievementUnlocks).mockRejectedValue({
    code: 'desktop_required',
  })
  render(<AchievementsPage />)
  await screen.findByText(
    'Open the desktop app to view and refresh your saved achievements.',
  )
  expect(
    screen.getByRole('button', { name: 'Refresh achievements' }),
  ).toBeDisabled()
  expect(screen.queryByText('0 / 8 unlocked')).not.toBeInTheDocument()
  expect(refreshAchievements).not.toHaveBeenCalled()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
