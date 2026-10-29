import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { AppNavigation } from './AppNavigation'

test('short visible labels preserve the existing destinations and only one current page', async () => {
  const select = vi.fn()
  const user = userEvent.setup()
  const view = render(
    <AppNavigation activeSection="library" onSelect={select} />,
  )
  const nav = within(
    screen.getByRole('navigation', { name: 'Main navigation' }),
  )
  expect(
    nav.getByRole('button', { name: 'My Library', current: 'page' }),
  ).toBeVisible()
  const goals = nav.getByRole('button', { name: 'Goals & Deadlines' })
  expect(goals).toHaveTextContent(/^Goals$/)
  await user.click(goals)
  expect(select).toHaveBeenCalledWith('goals')
  view.rerender(<AppNavigation activeSection="goals" onSelect={select} />)
  expect(
    nav.getByRole('button', { name: 'Goals & Deadlines', current: 'page' }),
  ).toBeVisible()
  expect(nav.getAllByRole('button', { current: 'page' })).toHaveLength(1)
  expect(nav.getByRole('button', { name: 'Writing Editor' })).toBeEnabled()
  expect(
    nav.getByRole('button', { name: 'Activity Calendar' }),
  ).toHaveTextContent(/^Activity$/)
})

test('unavailable Statistics cannot navigate and is skipped by keyboard focus', async () => {
  const select = vi.fn()
  const user = userEvent.setup()
  render(
    <>
      <AppNavigation activeSection="library" onSelect={select} />
      <button>After navigation</button>
    </>,
  )
  const statistics = screen.getByRole('button', { name: 'Statistics' })
  expect(statistics).toBeDisabled()
  expect(statistics).toHaveAccessibleDescription(
    'Statistics is not available yet.',
  )
  await user.click(statistics)
  expect(select).not.toHaveBeenCalled()
  screen.getByRole('button', { name: 'Achievements' }).focus()
  await user.tab()
  expect(screen.getByRole('button', { name: 'After navigation' })).toHaveFocus()
})
