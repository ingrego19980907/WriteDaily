import { StrictMode, useState } from 'react'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { isTauri } from '@tauri-apps/api/core'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { NotificationLayerProvider } from '../../components/ui/NotificationLayerProvider'
import {
  claimAchievementNotifications,
  listenAchievementUnlocks,
} from '../../services/achievements'
import { AchievementNotifications } from './AchievementNotifications'
import type { AchievementUnlock } from './achievement-unlocks'

vi.mock('@tauri-apps/api/core', () => ({ isTauri: vi.fn() }))
vi.mock('../../services/achievements', () => ({
  claimAchievementNotifications: vi.fn(),
  listenAchievementUnlocks: vi.fn(),
}))
const first: AchievementUnlock = {
  achievementId: 'first_words',
  rulePolicyVersion: 1,
  unlockedAt: '2026-10-29T10:00:00.000Z',
}
const second: AchievementUnlock = { ...first, achievementId: 'getting_started' }
let wake = () => {}
const unlisten = vi.fn()
function deferred<T>() {
  let resolve!: (data: T) => void
  const promise = new Promise<T>((finish) => {
    resolve = finish
  })
  return { promise, resolve }
}
async function flush() {
  await act(async () => {})
}
async function earn(rows: readonly AchievementUnlock[] = [first]) {
  vi.mocked(claimAchievementNotifications).mockResolvedValueOnce(rows)
  await act(async () => wake())
}
function host() {
  return render(
    <NotificationLayerProvider>
      <input aria-label="Writing" />
      <AchievementNotifications />
    </NotificationLayerProvider>,
  )
}
function panel() {
  return screen.getByRole('group', { name: 'Achievement notification' })
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(isTauri).mockReturnValue(true)
  vi.mocked(claimAchievementNotifications).mockResolvedValue([])
  vi.mocked(listenAchievementUnlocks).mockImplementation(async (callback) => {
    wake = callback
    return unlisten
  })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

test('subscribes before claiming and cannot announce an unconfirmed response', async () => {
  const subscription = deferred<() => void>()
  const claim = deferred<readonly AchievementUnlock[]>()
  vi.mocked(listenAchievementUnlocks).mockReturnValue(subscription.promise)
  vi.mocked(claimAchievementNotifications).mockReturnValue(claim.promise)
  host()
  expect(claimAchievementNotifications).not.toHaveBeenCalled()
  await act(async () => subscription.resolve(unlisten))
  expect(claimAchievementNotifications).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('group')).not.toBeInTheDocument()
  await act(async () => claim.resolve([first]))
  expect(within(panel()).getByText('First Words')).toBeVisible()
})

test('a committed notice uses a polite live region and never steals writing focus', async () => {
  const user = userEvent.setup()
  host()
  await flush()
  const input = screen.getByRole('textbox', { name: 'Writing' })
  await user.click(input)
  await earn()
  expect(input).toHaveFocus()
  expect(within(panel()).getByText('Achievement unlocked')).toBeVisible()
  const live = document.querySelector('[aria-live="polite"]')
  expect(live).toHaveTextContent('Achievement unlocked: First Words')
  expect(live).toHaveAttribute('aria-atomic', 'true')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  await user.click(
    screen.getByRole('button', { name: 'Dismiss achievement notification' }),
  )
  expect(input).toHaveFocus()
  expect(screen.queryByRole('group')).not.toBeInTheDocument()
})

test('repeated native wakeups/IDs cannot replay a dismissed notification', async () => {
  host()
  await flush()
  await earn()
  await earn()
  fireEvent.click(
    screen.getByRole('button', { name: 'Dismiss achievement notification' }),
  )
  await earn()
  expect(screen.queryByRole('group')).not.toBeInTheDocument()
})

test('simultaneous unlocks are one ordered announcement rather than a toast flood', async () => {
  host()
  await flush()
  await earn([
    { ...first, achievementId: 'novelist' },
    first,
    { ...first, achievementId: 'storyteller' },
    second,
  ])
  expect(screen.getAllByRole('group')).toHaveLength(1)
  expect(within(panel()).getByText('4 achievements unlocked')).toBeVisible()
  expect(
    within(panel()).getByText(
      'First Words, Getting Started, Storyteller, Novelist',
    ),
  ).toBeVisible()
})

test('later batches wait until the current notice is dismissed', async () => {
  host()
  await flush()
  await earn()
  await earn([second])
  expect(within(panel()).getByText('First Words')).toBeVisible()
  fireEvent.click(
    screen.getByRole('button', { name: 'Dismiss achievement notification' }),
  )
  expect(within(panel()).getByText('Getting Started')).toBeVisible()
})

test('a mixed later response queues only unseen IDs without repeating announced names', async () => {
  host()
  await flush()
  await earn()
  await earn([second, first])
  expect(within(panel()).getByText('First Words')).toBeVisible()
  fireEvent.click(
    screen.getByRole('button', { name: 'Dismiss achievement notification' }),
  )
  expect(within(panel()).getByText('Getting Started')).toBeVisible()
  expect(within(panel()).queryByText('First Words')).not.toBeInTheDocument()
  expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent(
    'Achievement unlocked: Getting Started',
  )
  fireEvent.click(
    screen.getByRole('button', { name: 'Dismiss achievement notification' }),
  )
  expect(screen.queryByRole('group')).not.toBeInTheDocument()
})

test('automatic dismissal waits eight seconds and leaves focus alone', async () => {
  vi.useFakeTimers()
  host()
  await flush()
  const input = screen.getByRole('textbox', { name: 'Writing' })
  input.focus()
  await earn()
  act(() => vi.advanceTimersByTime(7_999))
  expect(panel()).toBeVisible()
  act(() => vi.advanceTimersByTime(1))
  expect(screen.queryByRole('group')).not.toBeInTheDocument()
  expect(input).toHaveFocus()
})

test('hover pauses the timer and grants a fresh reading interval on leave', async () => {
  vi.useFakeTimers()
  host()
  await flush()
  await earn()
  act(() => vi.advanceTimersByTime(4_000))
  fireEvent.pointerEnter(panel())
  act(() => vi.advanceTimersByTime(20_000))
  expect(panel()).toBeVisible()
  fireEvent.pointerLeave(panel())
  act(() => vi.advanceTimersByTime(8_000))
  expect(screen.queryByRole('group')).not.toBeInTheDocument()
})

test('keyboard focus pauses dismissal and explicit dismissal restores the prior control', async () => {
  vi.useFakeTimers()
  host()
  await flush()
  const input = screen.getByRole('textbox', { name: 'Writing' })
  input.focus()
  await earn()
  act(() =>
    screen
      .getByRole('button', { name: 'Dismiss achievement notification' })
      .focus(),
  )
  act(() => vi.advanceTimersByTime(20_000))
  expect(panel()).toBeVisible()
  fireEvent.click(
    screen.getByRole('button', { name: 'Dismiss achievement notification' }),
  )
  expect(input).toHaveFocus()
})

test('hidden documents do not claim new notices and pause an existing notice', async () => {
  vi.useFakeTimers()
  host()
  await flush()
  await earn()
  const visible = vi.spyOn(document, 'visibilityState', 'get')
  visible.mockReturnValue('hidden')
  fireEvent(document, new Event('visibilitychange'))
  const calls = vi.mocked(claimAchievementNotifications).mock.calls.length
  await act(async () => wake())
  act(() => vi.advanceTimersByTime(20_000))
  expect(claimAchievementNotifications).toHaveBeenCalledTimes(calls)
  expect(panel()).toBeVisible()
  visible.mockReturnValue('visible')
  fireEvent(document, new Event('visibilitychange'))
  await flush()
  act(() => vi.advanceTimersByTime(8_000))
  expect(screen.queryByRole('group')).not.toBeInTheDocument()
})

test('failed claims do not report success or block typing and retry on later focus', async () => {
  vi.mocked(claimAchievementNotifications).mockRejectedValueOnce({
    code: 'persistence',
  })
  host()
  await flush()
  expect(screen.queryByRole('group')).not.toBeInTheDocument()
  expect(claimAchievementNotifications).toHaveBeenCalledTimes(1)
  vi.mocked(claimAchievementNotifications).mockResolvedValueOnce([first])
  fireEvent.focus(window)
  await flush()
  expect(panel()).toBeVisible()
})

test('rapid wakeups coalesce into one follow-up claim', async () => {
  const pending = deferred<readonly AchievementUnlock[]>()
  vi.mocked(claimAchievementNotifications)
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValue([first])
  host()
  await flush()
  await act(async () => {
    wake()
    wake()
    wake()
  })
  expect(claimAchievementNotifications).toHaveBeenCalledTimes(1)
  await act(async () => pending.resolve([]))
  expect(claimAchievementNotifications).toHaveBeenCalledTimes(2)
  expect(panel()).toBeVisible()
})

test('late registration is cleaned up without claiming after unmount', async () => {
  const subscription = deferred<() => void>()
  vi.mocked(listenAchievementUnlocks).mockReturnValue(subscription.promise)
  const { unmount } = host()
  unmount()
  await act(async () => subscription.resolve(unlisten))
  expect(unlisten).toHaveBeenCalledTimes(1)
  expect(claimAchievementNotifications).not.toHaveBeenCalled()
})

test('an in-flight claim cannot publish or start a queued follow-up after unmount', async () => {
  const pending = deferred<readonly AchievementUnlock[]>()
  vi.mocked(claimAchievementNotifications).mockReturnValueOnce(pending.promise)
  const { unmount } = host()
  await flush()
  await act(async () => wake())
  expect(claimAchievementNotifications).toHaveBeenCalledTimes(1)
  unmount()
  await act(async () => pending.resolve([first]))
  fireEvent.focus(window)
  await act(async () => wake())
  expect(unlisten).toHaveBeenCalledTimes(1)
  expect(claimAchievementNotifications).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('group')).not.toBeInTheDocument()
  expect(document.querySelector('[aria-live="polite"]')).toBeNull()
})

test('starting hidden leaves committed claims untouched until visible resume', async () => {
  const visible = vi.spyOn(document, 'visibilityState', 'get')
  visible.mockReturnValue('hidden')
  vi.mocked(claimAchievementNotifications).mockResolvedValueOnce([first])
  host()
  await flush()
  await act(async () => wake())
  fireEvent.focus(window)
  expect(claimAchievementNotifications).not.toHaveBeenCalled()
  expect(screen.queryByRole('group')).not.toBeInTheDocument()
  visible.mockReturnValue('visible')
  fireEvent(document, new Event('visibilitychange'))
  await flush()
  expect(claimAchievementNotifications).toHaveBeenCalledTimes(1)
  expect(within(panel()).getByText('First Words')).toBeVisible()
})

test('StrictMode cancelled registration cannot consume the first notice', async () => {
  vi.mocked(claimAchievementNotifications).mockResolvedValue([first])
  const { unmount } = render(
    <StrictMode>
      <NotificationLayerProvider>
        <AchievementNotifications />
      </NotificationLayerProvider>
    </StrictMode>,
  )
  await flush()
  expect(claimAchievementNotifications).toHaveBeenCalledTimes(1)
  expect(panel()).toBeVisible()
  unmount()
  expect(unlisten).toHaveBeenCalledTimes(2)
})

test('a failed subscription still permits focus/startup recovery through durable claims', async () => {
  vi.mocked(listenAchievementUnlocks).mockRejectedValue({ code: 'persistence' })
  vi.mocked(claimAchievementNotifications).mockResolvedValue([first])
  host()
  await flush()
  expect(panel()).toBeVisible()
})

test.each([false, true])(
  'modal notification placement stays inside the active dialog (fullscreen=%s)',
  async (fullScreen) => {
    const user = userEvent.setup()
    function EditorPreview() {
      const [open, setOpen] = useState(false)
      return (
        <Modal
          open={open}
          onOpenChange={setOpen}
          trigger={<Button>Open writing</Button>}
          title="Writing"
          closeLabel="Close"
          fullScreen={fullScreen}
        >
          <input aria-label="Chapter words" />
        </Modal>
      )
    }
    render(
      <NotificationLayerProvider>
        <EditorPreview />
        <AchievementNotifications />
      </NotificationLayerProvider>,
    )
    await flush()
    await user.click(screen.getByRole('button', { name: 'Open writing' }))
    const dialog = screen.getByRole('dialog')
    const input = within(dialog).getByRole('textbox', { name: 'Chapter words' })
    await user.click(input)
    await earn()
    expect(
      within(dialog).getByRole('group', { name: 'Achievement notification' }),
    ).toBeVisible()
    expect(
      document
        .querySelector('[aria-live="polite"]')
        ?.closest('[role="dialog"]'),
    ).toBe(dialog)
    expect(panel().closest('[aria-hidden="true"]')).toBeNull()
    expect(input).toHaveFocus()
    await user.click(
      within(dialog).getByRole('button', {
        name: 'Dismiss achievement notification',
      }),
    )
    expect(input).toHaveFocus()
  },
)

test('browser preview never subscribes, claims, or invents a notice', async () => {
  vi.mocked(isTauri).mockReturnValue(false)
  host()
  await flush()
  expect(claimAchievementNotifications).not.toHaveBeenCalled()
  expect(listenAchievementUnlocks).not.toHaveBeenCalled()
  expect(screen.queryByRole('group')).not.toBeInTheDocument()
})
