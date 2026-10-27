import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { getBook, updateBook } from '../../services/books'
import type { Book } from './book'
import { BookDetailsDialog } from './BookDetailsDialog'

vi.mock('../../services/books', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/books')>()),
  getBook: vi.fn(),
  updateBook: vi.fn(),
}))
const original: Book = {
  id: 'book-one',
  title: 'Original',
  targetWordCount: 50000,
  dailyWordGoal: 500,
  deadline: '2027-01-01',
  coverPath: null,
  completedAt: null,
  createdAt: '2026-10-24T10:00:00.000Z',
  updatedAt: '2026-10-24T10:00:00.000Z',
}
beforeEach(() => {
  vi.mocked(getBook).mockReset()
  vi.mocked(updateBook).mockReset()
})

test('prefills fields, validates, retains dismissed draft and submits only editable details with the loaded revision', async () => {
  const user = userEvent.setup()
  const saved = {
    ...original,
    title: 'New title',
    targetWordCount: null,
    dailyWordGoal: null,
    deadline: null,
    updatedAt: '2026-10-24T11:00:00.000Z',
  }
  vi.mocked(updateBook).mockResolvedValue(saved)
  const onSaved = vi.fn()
  render(<BookDetailsDialog book={original} onSaved={onSaved} />)
  await user.click(screen.getByRole('button', { name: 'Edit book' }))
  expect(screen.getByLabelText('Title')).toHaveValue('Original')
  expect(screen.getByLabelText('Target word count (optional)')).toHaveValue(
    '50000',
  )
  expect(screen.getByLabelText('Deadline (optional)')).toHaveValue('2027-01-01')
  await user.clear(screen.getByLabelText('Title'))
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(screen.getByLabelText('Title')).toHaveFocus()
  expect(updateBook).not.toHaveBeenCalled()
  await user.type(screen.getByLabelText('Title'), ' New title ')
  for (const label of [
    'Target word count (optional)',
    'Daily word goal (optional)',
    'Deadline (optional)',
  ])
    await user.clear(screen.getByLabelText(label))
  await user.keyboard('{Escape}')
  await user.click(screen.getByRole('button', { name: 'Edit book' }))
  expect(screen.getByLabelText('Title')).toHaveValue(' New title ')
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(updateBook).toHaveBeenCalledWith(original.id, original.updatedAt, {
    title: 'New title',
    targetWordCount: null,
    dailyWordGoal: null,
    deadline: null,
  })
  expect(onSaved).toHaveBeenCalledWith(saved)
  expect(await screen.findByRole('status')).toHaveTextContent(
    'Book updated: New title',
  )
  await user.click(screen.getByRole('button', { name: 'Edit book' }))
  expect(screen.getByLabelText('Title')).toHaveValue('New title')
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(updateBook).toHaveBeenLastCalledWith(
    original.id,
    saved.updatedAt,
    expect.any(Object),
  )
})

test('conflict blocks retries, preserves draft after failed reload and replaces it only by explicit action', async () => {
  const user = userEvent.setup()
  vi.mocked(updateBook)
    .mockRejectedValueOnce({ code: 'conflict' })
    .mockResolvedValueOnce({
      ...original,
      title: 'Latest',
      updatedAt: '2026-10-24T12:00:00.000Z',
    })
  vi.mocked(getBook)
    .mockRejectedValueOnce(new Error('disk'))
    .mockResolvedValueOnce({
      ...original,
      title: 'Latest',
      updatedAt: '2026-10-24T11:00:00.000Z',
    })
  render(<BookDetailsDialog book={original} />)
  await user.click(screen.getByRole('button', { name: 'Edit book' }))
  await user.clear(screen.getByLabelText('Title'))
  await user.type(screen.getByLabelText('Title'), 'My draft')
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'changed elsewhere',
  )
  expect(screen.getByLabelText('Title')).toHaveValue('My draft')
  expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  expect(getBook).not.toHaveBeenCalled()
  await user.click(
    screen.getByRole('button', { name: 'Replace draft with latest details' }),
  )
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load')
  expect(screen.getByLabelText('Title')).toHaveValue('My draft')
  await user.click(
    screen.getByRole('button', { name: 'Replace draft with latest details' }),
  )
  expect(screen.getByLabelText('Title')).toHaveValue('Latest')
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(updateBook).toHaveBeenLastCalledWith(
    original.id,
    '2026-10-24T11:00:00.000Z',
    expect.objectContaining({ title: 'Latest' }),
  )
})

test('failed update retains draft and pending write blocks dismissal and duplicate submission', async () => {
  const user = userEvent.setup()
  let reject!: (error: unknown) => void
  vi.mocked(updateBook).mockReturnValue(
    new Promise<Book>((_resolve, fail) => {
      reject = fail
    }),
  )
  const onSaved = vi.fn()
  render(<BookDetailsDialog book={original} onSaved={onSaved} />)
  await user.click(screen.getByRole('button', { name: 'Edit book' }))
  await user.type(screen.getByLabelText('Title'), ' draft')
  await user.dblClick(screen.getByRole('button', { name: 'Save changes' }))
  await user.keyboard('{Escape}')
  await user.click(screen.getByRole('button', { name: 'Close' }))
  expect(screen.getByRole('dialog')).toBeVisible()
  expect(screen.getByLabelText('Title')).toBeDisabled()
  expect(updateBook).toHaveBeenCalledTimes(1)
  await act(async () => reject({ code: 'persistence' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Could not save changes',
  )
  expect(screen.getByLabelText('Title')).toHaveValue('Original draft')
  expect(onSaved).not.toHaveBeenCalled()
  expect(screen.getByRole('status', { hidden: true })).toBeEmptyDOMElement()
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }),
  )
})

test('a removed book reports not found without discarding the draft or offering an unsafe save', async () => {
  const user = userEvent.setup()
  vi.mocked(updateBook).mockRejectedValue({ code: 'not_found' })
  render(<BookDetailsDialog book={original} />)
  await user.click(screen.getByRole('button', { name: 'Edit book' }))
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'no longer available',
  )
  expect(screen.getByLabelText('Title')).toHaveValue('Original')
  expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
})

test('total-target drafts never replace committed details before persistence succeeds', async () => {
  const user = userEvent.setup()
  let fail!: (reason: unknown) => void
  vi.mocked(updateBook).mockReturnValueOnce(
    new Promise((_, reject) => {
      fail = reject
    }),
  )
  const onSaved = vi.fn()
  render(<BookDetailsDialog book={original} onSaved={onSaved} />)
  await user.click(screen.getByRole('button', { name: 'Edit book' }))
  const input = screen.getByLabelText('Target word count (optional)')
  await user.clear(input)
  await user.type(input, '1000')
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(input).toBeDisabled()
  expect(onSaved).not.toHaveBeenCalled()
  await act(async () => fail({ code: 'persistence' }))
  expect(input).toHaveValue('1000')
  expect(onSaved).not.toHaveBeenCalled()
  const saved = {
    ...original,
    targetWordCount: 1000,
    updatedAt: '2026-10-24T12:00:00.000Z',
  }
  vi.mocked(updateBook).mockResolvedValue(saved)
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(onSaved).toHaveBeenCalledWith(saved)
  expect(updateBook).toHaveBeenLastCalledWith(
    original.id,
    original.updatedAt,
    expect.objectContaining({
      targetWordCount: 1000,
      dailyWordGoal: original.dailyWordGoal,
      deadline: original.deadline,
    }),
  )
})

test('deadline changes preserve the draft on failure and commit/removal preserve other goals', async () => {
  const user = userEvent.setup()
  let fail!: (reason: unknown) => void
  vi.mocked(updateBook).mockReturnValueOnce(
    new Promise((_, reject) => {
      fail = reject
    }),
  )
  const onSaved = vi.fn()
  render(<BookDetailsDialog book={original} onSaved={onSaved} />)
  await user.click(screen.getByRole('button', { name: 'Edit book' }))
  const input = screen.getByLabelText('Deadline (optional)')
  expect(input).toHaveAccessibleDescription(/local calendar/)
  fireEvent.change(input, { target: { value: '2024-02-29' } })
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(input).toBeDisabled()
  expect(onSaved).not.toHaveBeenCalled()
  await act(async () => fail({ code: 'persistence' }))
  expect(input).toHaveValue('2024-02-29')
  const saved = {
    ...original,
    deadline: '2024-02-29',
    updatedAt: '2026-10-24T12:00:00.000Z',
  }
  vi.mocked(updateBook).mockResolvedValue(saved)
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(onSaved).toHaveBeenCalledWith(saved)
  expect(updateBook).toHaveBeenLastCalledWith(
    original.id,
    original.updatedAt,
    expect.objectContaining({
      deadline: '2024-02-29',
      targetWordCount: original.targetWordCount,
      dailyWordGoal: original.dailyWordGoal,
    }),
  )
  await user.click(screen.getByRole('button', { name: 'Edit book' }))
  fireEvent.change(screen.getByLabelText('Deadline (optional)'), {
    target: { value: '' },
  })
  vi.mocked(updateBook).mockResolvedValue({ ...saved, deadline: null })
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(updateBook).toHaveBeenLastCalledWith(
    original.id,
    saved.updatedAt,
    expect.objectContaining({ deadline: null }),
  )
})
