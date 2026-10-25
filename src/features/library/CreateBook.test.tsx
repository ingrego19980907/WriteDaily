import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { createBook } from '../../services/books'
import { CreateBook } from './CreateBook'
import type { Book } from './book'

vi.mock('../../services/books', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/books')>()),
  createBook: vi.fn(),
}))
beforeEach(() => {
  vi.mocked(createBook).mockReset()
})

test('invalid fields show linked errors and do not call persistence', async () => {
  const user = userEvent.setup()
  render(<CreateBook />)
  await user.click(screen.getByRole('button', { name: 'Create book' }))
  await user.type(screen.getByLabelText('Daily word goal (optional)'), '-1')
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Create book',
    }),
  )
  expect(screen.getByLabelText('Title')).toHaveFocus()
  expect(screen.getByLabelText('Title')).toHaveAccessibleDescription(
    'Up to 200 characters. Enter a title.',
  )
  expect(screen.getByLabelText('Daily word goal (optional)')).toHaveAttribute(
    'aria-invalid',
    'true',
  )
  expect(createBook).not.toHaveBeenCalled()
})

test('keeps details after dismissal and failed persistence, then normalizes and resets only after success', async () => {
  const user = userEvent.setup()
  vi.mocked(createBook)
    .mockRejectedValueOnce(new Error('disk full'))
    .mockResolvedValueOnce({ title: 'Story' } as Book)
  render(<CreateBook />)
  const trigger = screen.getByRole('button', { name: 'Create book' })
  await user.click(trigger)
  await user.type(screen.getByLabelText('Title'), '  Story  ')
  await user.keyboard('{Escape}')
  await user.click(trigger)
  expect(screen.getByLabelText('Title')).toHaveValue('  Story  ')
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Create book',
    }),
  )
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not create')
  expect(screen.getByLabelText('Title')).toHaveValue('  Story  ')
  expect(screen.getByRole('status', { hidden: true })).toBeEmptyDOMElement()
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Create book',
    }),
  )
  expect(await screen.findByRole('status')).toHaveTextContent(
    'Book created: Story',
  )
  expect(createBook).toHaveBeenLastCalledWith({
    title: 'Story',
    targetWordCount: null,
    dailyWordGoal: null,
    deadline: null,
  })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  await user.click(trigger)
  expect(screen.getByLabelText('Title')).toHaveValue('')
})

test('blocks duplicate submission and dismissal while a commit is pending', async () => {
  const user = userEvent.setup()
  let resolve!: (value: Book) => void
  vi.mocked(createBook).mockReturnValue(
    new Promise<Book>((done) => {
      resolve = done
    }),
  )
  render(<CreateBook />)
  await user.click(screen.getByRole('button', { name: 'Create book' }))
  await user.type(screen.getByLabelText('Title'), 'Story')
  await user.dblClick(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Create book',
    }),
  )
  await user.keyboard('{Escape}')
  await user.click(screen.getByRole('button', { name: 'Close' }))
  expect(screen.getByRole('dialog')).toBeVisible()
  expect(screen.getByLabelText('Title')).toBeDisabled()
  expect(createBook).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('status', { hidden: true })).toBeEmptyDOMElement()
  await act(async () => resolve({ title: 'Story' } as Book))
  expect(screen.getByRole('status')).toHaveTextContent('Book created: Story')
})

test('native field validation links localized errors, focuses the field after pending ends and retains the draft', async () => {
  const user = userEvent.setup()
  vi.mocked(createBook).mockRejectedValue({
    code: 'validation',
    issues: [{ field: 'dailyWordGoal', code: 'invalid_count' }],
  })
  render(<CreateBook />)
  await user.click(screen.getByRole('button', { name: 'Create book' }))
  await user.type(screen.getByLabelText('Title'), 'Retained draft')
  await user.type(screen.getByLabelText('Daily word goal (optional)'), '500')
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Create book',
    }),
  )
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'highlighted fields',
  )
  const field = screen.getByLabelText('Daily word goal (optional)')
  expect(field).toHaveAttribute('aria-invalid', 'true')
  await vi.waitFor(() => expect(field).toHaveFocus())
  expect(screen.getByLabelText('Title')).toHaveValue('Retained draft')
  expect(field).toHaveValue('500')
})
