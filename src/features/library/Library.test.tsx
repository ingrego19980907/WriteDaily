import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { createBook, listBooks, updateBook } from '../../services/books'
import type { Book } from './book'
import { Library } from './Library'

vi.mock('../../services/books', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/books')>()),
  listBooks: vi.fn(),
  createBook: vi.fn(),
  updateBook: vi.fn(),
}))
const book: Book = {
  id: 'one',
  title: 'Same title',
  targetWordCount: null,
  dailyWordGoal: null,
  deadline: null,
  coverPath: null,
  completedAt: null,
  createdAt: '2026-10-24T10:00:00.000Z',
  updatedAt: '2026-10-24T10:00:00.000Z',
}
beforeEach(() => {
  vi.mocked(listBooks).mockReset()
  vi.mocked(createBook).mockReset()
  vi.mocked(updateBook).mockReset()
})

test('loads existing books and edits the selected identity even with duplicate titles', async () => {
  const user = userEvent.setup()
  vi.mocked(listBooks).mockResolvedValue([book, { ...book, id: 'two' }])
  vi.mocked(updateBook).mockResolvedValue({
    ...book,
    id: 'two',
    title: 'Changed',
  })
  render(<Library />)
  const list = await screen.findByRole('list', { name: 'Books' })
  await screen.findAllByRole('button', { name: 'Edit book' })
  const rows = within(list).getAllByRole('listitem')
  await user.click(within(rows[1]).getByRole('button', { name: 'Edit book' }))
  await user.clear(screen.getByLabelText('Title'))
  await user.type(screen.getByLabelText('Title'), 'Changed')
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(updateBook).toHaveBeenCalledWith(
    'two',
    book.updatedAt,
    expect.objectContaining({ title: 'Changed' }),
  )
  expect(within(rows[0]).getByRole('heading')).toHaveTextContent('Same title')
  expect(within(rows[1]).getByRole('heading')).toHaveTextContent('Changed')
})

test('failed loading shows retry and does not claim an empty library', async () => {
  const user = userEvent.setup()
  vi.mocked(listBooks)
    .mockRejectedValueOnce(new Error('disk'))
    .mockResolvedValueOnce([])
  render(<Library />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load')
  expect(
    screen.queryByText('No books yet. Create your first story.'),
  ).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Retry loading books' }))
  expect(
    await screen.findByText('No books yet. Create your first story.'),
  ).toBeVisible()
})

test('a late initial listing cannot erase a newly committed book', async () => {
  const user = userEvent.setup()
  let resolve!: (books: Book[]) => void
  vi.mocked(listBooks).mockReturnValue(
    new Promise<Book[]>((done) => {
      resolve = done
    }),
  )
  vi.mocked(createBook).mockResolvedValue(book)
  render(<Library />)
  await user.click(screen.getByRole('button', { name: 'Create book' }))
  await user.type(screen.getByLabelText('Title'), 'Same title')
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Create book',
    }),
  )
  expect(
    await screen.findByRole('heading', { name: 'Same title' }),
  ).toBeVisible()
  await act(async () =>
    resolve([{ ...book, id: 'existing', title: 'Existing book' }]),
  )
  expect(screen.getByRole('heading', { name: 'Same title' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Existing book' })).toBeVisible()
})
