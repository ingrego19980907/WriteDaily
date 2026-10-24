import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { AppShell } from './AppShell'

test('provides a skip link to a focusable main landmark without empty navigation', () => {
  render(
    <AppShell>
      <h1>Writing space</h1>
    </AppShell>,
  )

  const main = screen.getByRole('main')
  expect(main).toHaveAttribute('id', 'main-content')
  expect(main).toHaveAttribute('tabindex', '-1')
  expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute(
    'href',
    `#${main.id}`,
  )
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
})

test('keeps supplied navigation separate from page content', () => {
  render(
    <AppShell navigation={<nav aria-label="Sections">Section links</nav>}>
      <h1>Writing space</h1>
    </AppShell>,
  )

  const sidebar = screen.getByRole('complementary', {
    name: 'Application navigation',
  })
  expect(
    within(sidebar).getByRole('navigation', { name: 'Sections' }),
  ).toBeVisible()
  expect(
    within(screen.getByRole('main')).getByRole('heading', {
      name: 'Writing space',
    }),
  ).toBeVisible()
  expect(within(sidebar).queryByRole('heading')).not.toBeInTheDocument()
})
