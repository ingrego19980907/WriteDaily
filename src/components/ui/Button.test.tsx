import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { Button } from './Button'

test('supports pointer, Enter and Space activation', async () => {
  const user = userEvent.setup()
  const onClick = vi.fn()
  render(<Button onClick={onClick}>Save</Button>)

  await user.tab()
  expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus()
  await user.keyboard('{Enter}')
  await user.keyboard(' ')
  await user.click(screen.getByRole('button', { name: 'Save' }))
  expect(onClick).toHaveBeenCalledTimes(3)
})

test('disabled buttons cannot activate and are skipped by Tab', async () => {
  const user = userEvent.setup()
  const onClick = vi.fn()
  render(
    <>
      <Button disabled onClick={onClick}>
        Unavailable
      </Button>
      <Button variant="secondary">Available</Button>
    </>,
  )

  expect(screen.getByRole('button', { name: 'Unavailable' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Unavailable' }))
  await user.tab()
  expect(screen.getByRole('button', { name: 'Available' })).toHaveFocus()
  expect(onClick).not.toHaveBeenCalled()
})

test('only submits a form when explicitly given type submit', async () => {
  const user = userEvent.setup()
  const onSubmit = vi.fn((event: React.SyntheticEvent) =>
    event.preventDefault(),
  )
  render(
    <form onSubmit={onSubmit}>
      <Button>Cancel</Button>
      <Button type="submit">Save</Button>
    </form>,
  )

  await user.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(onSubmit).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Save' }))
  expect(onSubmit).toHaveBeenCalledTimes(1)
})

test('forwards a ref and accessible native attributes', () => {
  const ref = createRef<HTMLButtonElement>()
  render(
    <Button ref={ref} variant="ghost" aria-label="Close" aria-pressed={false}>
      ×
    </Button>,
  )

  expect(ref.current).toBe(screen.getByRole('button', { name: 'Close' }))
  expect(ref.current).toHaveAttribute('aria-pressed', 'false')
})
