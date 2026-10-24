import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import App from './App'

test('opens My Library with one current section and the product identity', () => {
  render(<App />)

  const main = within(screen.getByRole('main'))

  expect(
    main.getByRole('heading', { level: 1, name: 'My Library' }),
  ).toBeVisible()
  expect(
    main.getByText('Every great story begins with a single word.'),
  ).toBeVisible()
  expect(
    main.getByRole('heading', { level: 2, name: 'Coming soon' }),
  ).toBeVisible()
  expect(
    within(screen.getByRole('banner')).getByText('WriteDaily'),
  ).toBeVisible()
  expect(screen.getByText('A little writing, every day.')).toBeVisible()
  expect(
    screen.getByRole('button', { name: 'My Library', current: 'page' }),
  ).toBeVisible()
  expect(screen.getAllByRole('button', { current: 'page' })).toHaveLength(1)
})

test.each([
  ['My Library', 1, '{Enter}'],
  ['Writing Editor', 2, ' '],
  ['Goals & Deadlines', 3, '{Enter}'],
  ['Activity Calendar', 4, ' '],
  ['Achievements', 5, '{Enter}'],
] as const)(
  'opens %s using only the keyboard',
  async (title, tabCount, key) => {
    const user = userEvent.setup()
    render(<App />)

    await user.tab()
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveFocus()
    for (let count = 0; count < tabCount; count += 1) await user.tab()
    expect(screen.getByRole('button', { name: title })).toHaveFocus()
    await user.keyboard(key)

    const heading = within(screen.getByRole('main')).getByRole('heading', {
      level: 1,
      name: title,
    })
    expect(heading).toBeVisible()
    expect(
      screen.getByRole('button', { name: title, current: 'page' }),
    ).toBeVisible()
    expect(screen.getAllByRole('button', { current: 'page' })).toHaveLength(1)
    if (title !== 'My Library') expect(heading).toHaveFocus()
  },
)

test('returns to the library after selecting another section with the pointer', async () => {
  const user = userEvent.setup()
  render(<App />)

  await user.click(screen.getByRole('button', { name: 'Achievements' }))
  await user.click(screen.getByRole('button', { name: 'My Library' }))

  expect(screen.getByRole('heading', { name: 'My Library' })).toHaveFocus()
  expect(
    screen.getByRole('button', { name: 'Achievements' }),
  ).not.toHaveAttribute('aria-current')
})
