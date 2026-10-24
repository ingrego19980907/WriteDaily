import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import App from './App'

test('shows the WriteDaily identity in the main writing space', () => {
  render(<App />)

  const main = within(screen.getByRole('main'))

  expect(
    main.getByRole('heading', { level: 1, name: 'WriteDaily' }),
  ).toBeVisible()
  expect(main.getByText('A little writing, every day.')).toBeVisible()
})
