import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import {
  getWritingSchedule,
  saveWritingSchedule,
} from '../../services/schedule'
import { WritingScheduleProvider } from './WritingScheduleProvider'
import { WritingScheduleSettings } from './WritingScheduleSettings'
import { WritingPace } from '../library/WritingPace'
import type { WritingSchedule } from './writing-schedule'

vi.mock('../../services/schedule', () => ({
  getWritingSchedule: vi.fn(),
  saveWritingSchedule: vi.fn(),
}))
vi.mock('../../hooks/useLocalCalendarDate', () => ({
  useLocalCalendarDate: () => '2026-10-28',
}))
const saved: WritingSchedule = {
  revision: 1,
  history: [
    { effectiveFrom: '2026-10-28', weekdays: [0, 1, 2, 3, 4, 5, 6] },
    { effectiveFrom: '2026-10-29', weekdays: [1, 2, 3, 4, 5] },
  ],
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getWritingSchedule).mockResolvedValue({ revision: 0, history: [] })
  vi.mocked(saveWritingSchedule).mockResolvedValue(saved)
})
function view() {
  return render(
    <WritingScheduleProvider>
      <WritingScheduleSettings />
      <WritingPace wordCount={0} targetWordCount={100} deadline="2026-11-01" />
    </WritingScheduleProvider>,
  )
}
test('weekdays are labelled, save waits for persistence and committed schedule updates pace', async () => {
  let finish!: (data: WritingSchedule) => void
  vi.mocked(saveWritingSchedule).mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  const user = userEvent.setup()
  view()
  await waitFor(() =>
    expect(screen.getByRole('checkbox', { name: 'Sunday' })).toBeEnabled(),
  )
  expect(screen.getByText('20 words per writing day')).toBeVisible()
  await user.click(screen.getByRole('checkbox', { name: 'Sunday' }))
  await user.click(screen.getByRole('checkbox', { name: 'Saturday' }))
  await user.click(screen.getByRole('button', { name: 'Save writing days' }))
  expect(saveWritingSchedule).toHaveBeenCalledWith(
    0,
    [1, 2, 3, 4, 5],
    '2026-10-28',
  )
  expect(screen.getByRole('checkbox', { name: 'Monday' })).toBeDisabled()
  expect(screen.queryByText(/Writing days saved/)).not.toBeInTheDocument()
  expect(screen.getByText('20 words per writing day')).toBeVisible()
  await act(async () => finish(saved))
  expect(
    await screen.findByText('Writing days saved. Applies from Oct 29, 2026.'),
  ).toBeVisible()
  expect(screen.getByText('34 words per writing day')).toBeVisible()
})
test('conflicts retain selection until explicit reload and allow a later save', async () => {
  vi.mocked(saveWritingSchedule).mockRejectedValueOnce({ code: 'conflict' })
  const user = userEvent.setup()
  view()
  await waitFor(() =>
    expect(screen.getByRole('checkbox', { name: 'Sunday' })).toBeEnabled(),
  )
  await user.click(screen.getByRole('checkbox', { name: 'Sunday' }))
  await user.click(screen.getByRole('button', { name: 'Save writing days' }))
  expect(
    await screen.findByText(/The schedule changed elsewhere/),
  ).toBeVisible()
  expect(screen.getByRole('checkbox', { name: 'Sunday' })).not.toBeChecked()
  vi.mocked(getWritingSchedule).mockResolvedValue(saved)
  await user.click(screen.getByRole('button', { name: 'Reload writing days' }))
  await waitFor(() =>
    expect(screen.getByRole('checkbox', { name: 'Monday' })).toBeEnabled(),
  )
  expect(screen.getByRole('checkbox', { name: 'Saturday' })).not.toBeChecked()
})
test('load failures have no numeric pace or editable defaults; reload recovers', async () => {
  vi.mocked(getWritingSchedule).mockRejectedValueOnce({ code: 'persistence' })
  const user = userEvent.setup()
  view()
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Writing schedule could not be loaded',
  )
  expect(screen.getByRole('checkbox', { name: 'Monday' })).toBeDisabled()
  expect(screen.queryByText('20 words per writing day')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Reload writing days' }))
  expect(await screen.findByText('20 words per writing day')).toBeVisible()
})

test('the default every-day schedule can be explicitly saved without toggling a day', async () => {
  const allDays = {
    revision: 1,
    history: [
      { effectiveFrom: '2026-10-28', weekdays: [0, 1, 2, 3, 4, 5, 6] },
      { effectiveFrom: '2026-10-29', weekdays: [0, 1, 2, 3, 4, 5, 6] },
    ],
  }
  vi.mocked(saveWritingSchedule).mockResolvedValue(allDays)
  const user = userEvent.setup()
  view()
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Save writing days' }),
    ).toBeEnabled(),
  )
  await user.click(screen.getByRole('button', { name: 'Save writing days' }))
  expect(saveWritingSchedule).toHaveBeenCalledWith(
    0,
    [0, 1, 2, 3, 4, 5, 6],
    '2026-10-28',
  )
  expect(await screen.findByText(/Writing days saved/)).toBeVisible()
})

test('a late focus reload cannot undo a successfully committed schedule', async () => {
  let finishSave!: (data: WritingSchedule) => void
  let finishRead!: (data: WritingSchedule) => void
  vi.mocked(saveWritingSchedule).mockReturnValueOnce(
    new Promise((resolve) => {
      finishSave = resolve
    }),
  )
  const user = userEvent.setup()
  view()
  await waitFor(() =>
    expect(screen.getByRole('checkbox', { name: 'Sunday' })).toBeEnabled(),
  )
  await user.click(screen.getByRole('checkbox', { name: 'Sunday' }))
  await user.click(screen.getByRole('checkbox', { name: 'Saturday' }))
  await user.click(screen.getByRole('button', { name: 'Save writing days' }))
  vi.mocked(getWritingSchedule).mockReturnValueOnce(
    new Promise((resolve) => {
      finishRead = resolve
    }),
  )
  act(() => window.dispatchEvent(new Event('focus')))
  await act(async () => finishSave(saved))
  await act(async () => finishRead({ revision: 0, history: [] }))
  expect(screen.getByRole('checkbox', { name: 'Sunday' })).not.toBeChecked()
  expect(screen.getByText('34 words per writing day')).toBeVisible()
})
