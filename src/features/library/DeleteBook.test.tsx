import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { deleteBook, getBook } from '../../services/books'
import type { Book } from './book'
import { DeleteBook } from './DeleteBook'

vi.mock('../../services/books', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/books')>()),
  deleteBook: vi.fn(),
  getBook: vi.fn(),
}))
const book: Book = {
  id: 'selected',
  title: 'Selected title',
  targetWordCount: null,
  dailyWordGoal: null,
  deadline: null,
  coverPath: null,
  completedAt: null,
  createdAt: '2026-10-24T10:00:00.000Z',
  updatedAt: '2026-10-24T10:00:00.000Z',
}
beforeEach(() => {
  vi.mocked(deleteBook).mockReset()
  vi.mocked(getBook).mockReset()
})
const confirmButton = () =>
  within(screen.getByRole('dialog')).getByRole('button', {
    name: 'Delete book',
  })

test('opening, Enter, cancellation and Escape do not delete; reopening requires fresh confirmation', async () => {
  const user = userEvent.setup()
  render(<DeleteBook book={book} onDeleted={vi.fn()} />)
  const trigger = screen.getByRole('button', { name: 'Delete book' })
  await user.click(trigger)
  expect(screen.getByText(book.title)).toBeVisible()
  expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  expect(confirmButton()).toBeDisabled()
  await user.keyboard('{Enter}')
  expect(deleteBook).not.toHaveBeenCalled()
  await user.click(trigger)
  await user.click(screen.getByRole('checkbox'))
  await user.keyboard('{Escape}')
  expect(trigger).toHaveFocus()
  await user.click(trigger)
  expect(screen.getByRole('checkbox')).not.toBeChecked()
  expect(confirmButton()).toBeDisabled()
  expect(deleteBook).not.toHaveBeenCalled()
})

test('pending deletion blocks duplicate calls and dismissal and reports success only after completion', async () => {
  const user = userEvent.setup()
  let resolve!: () => void
  vi.mocked(deleteBook).mockReturnValue(
    new Promise<{ cleanupPending: boolean }>((done) => {
      resolve = () => done({ cleanupPending: false })
    }),
  )
  const onDeleted = vi.fn()
  render(<DeleteBook book={book} onDeleted={onDeleted} />)
  await user.click(screen.getByRole('button', { name: 'Delete book' }))
  await user.click(screen.getByRole('checkbox'))
  await user.dblClick(confirmButton())
  await user.keyboard('{Escape}')
  await user.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.getByRole('dialog')).toBeVisible()
  expect(deleteBook).toHaveBeenCalledTimes(1)
  expect(deleteBook).toHaveBeenCalledWith(book.id, book.updatedAt)
  expect(onDeleted).not.toHaveBeenCalled()
  await act(async () => resolve())
  expect(onDeleted).toHaveBeenCalledWith(book)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('conflict retains the book, failed reload keeps confirmation blocked, successful reload requires confirmation again', async () => {
  const user = userEvent.setup()
  const latest = {
    ...book,
    title: 'Latest title',
    updatedAt: '2026-10-24T11:00:00.000Z',
  }
  vi.mocked(deleteBook)
    .mockRejectedValueOnce({ code: 'conflict' })
    .mockResolvedValueOnce({ cleanupPending: false })
  vi.mocked(getBook)
    .mockRejectedValueOnce(new Error('disk'))
    .mockResolvedValueOnce(latest)
  const onDeleted = vi.fn()
  render(<DeleteBook book={book} onDeleted={onDeleted} />)
  await user.click(screen.getByRole('button', { name: 'Delete book' }))
  await user.click(screen.getByRole('checkbox'))
  await user.click(confirmButton())
  expect(await screen.findByRole('alert')).toHaveTextContent('changed')
  expect(confirmButton()).toBeDisabled()
  expect(onDeleted).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Load latest details' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load')
  await user.click(screen.getByRole('button', { name: 'Load latest details' }))
  expect(screen.getByText('Latest title')).toBeVisible()
  expect(screen.getByRole('checkbox')).not.toBeChecked()
  expect(confirmButton()).toBeDisabled()
  await user.click(screen.getByRole('checkbox'))
  await user.click(confirmButton())
  expect(deleteBook).toHaveBeenLastCalledWith(book.id, latest.updatedAt)
  expect(onDeleted).toHaveBeenCalledWith(latest)
})

test.each(['persistence', 'not_found', 'cover_cleanup_required'])(
  '%s never removes the row or reports success',
  async (code) => {
    const user = userEvent.setup()
    vi.mocked(deleteBook).mockRejectedValue({ code })
    const onDeleted = vi.fn()
    render(<DeleteBook book={book} onDeleted={onDeleted} />)
    await user.click(screen.getByRole('button', { name: 'Delete book' }))
    await user.click(screen.getByRole('checkbox'))
    await user.click(confirmButton())
    expect(await screen.findByRole('alert')).toBeVisible()
    expect(screen.getByText(book.title)).toBeVisible()
    expect(onDeleted).not.toHaveBeenCalled()
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  },
)
