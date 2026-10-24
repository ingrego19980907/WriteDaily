import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import {
  createBook,
  deleteBook,
  listBooks,
  updateBook,
} from '../../services/books'
import type { Book } from './book'
import { Library } from './Library'

vi.mock('../../services/books', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/books')>()),
  listBooks: vi.fn(),
  createBook: vi.fn(),
  updateBook: vi.fn(),
  deleteBook: vi.fn(),
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
  vi.mocked(deleteBook).mockReset()
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

test('deletes only the confirmed identity, retains other books and restores focus after its trigger is removed', async () => {
  const user = userEvent.setup()
  vi.mocked(listBooks).mockResolvedValue([book, { ...book, id: 'two' }])
  vi.mocked(deleteBook).mockResolvedValue(undefined)
  render(<Library />)
  const actions = await screen.findAllByRole('button', { name: 'Delete book' })
  await user.click(actions[1])
  await user.click(screen.getByRole('checkbox'))
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Delete book',
    }),
  )
  expect(deleteBook).toHaveBeenCalledWith('two', book.updatedAt)
  expect(await screen.findByText('Book deleted: Same title')).toBeVisible()
  expect(
    within(screen.getByRole('list', { name: 'Books' })).getAllByRole(
      'listitem',
    ),
  ).toHaveLength(1)
  await vi.waitFor(() =>
    expect(screen.getByRole('heading', { name: /^Books$/ })).toHaveFocus(),
  )
})

test('failed deletion keeps the row and a late listing cannot resurrect a committed deletion', async () => {
  const user = userEvent.setup()
  let resolve!: (books: Book[]) => void
  vi.mocked(listBooks).mockReturnValue(
    new Promise<Book[]>((done) => {
      resolve = done
    }),
  )
  vi.mocked(createBook).mockResolvedValue(book)
  vi.mocked(deleteBook)
    .mockRejectedValueOnce({ code: 'persistence' })
    .mockResolvedValueOnce(undefined)
  render(<Library />)
  await user.click(screen.getByRole('button', { name: 'Create book' }))
  await user.type(screen.getByLabelText('Title'), book.title)
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Create book',
    }),
  )
  await user.click(await screen.findByRole('button', { name: 'Delete book' }))
  await user.click(screen.getByRole('checkbox'))
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Delete book',
    }),
  )
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not delete')
  expect(screen.queryByText('Book deleted: Same title')).not.toBeInTheDocument()
  await user.click(screen.getByRole('checkbox'))
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Delete book',
    }),
  )
  await act(async () => resolve([book]))
  expect(
    screen.queryByRole('button', { name: 'Delete book' }),
  ).not.toBeInTheDocument()
  expect(
    screen.getByText('No books yet. Create your first story.'),
  ).toBeVisible()
})

test('cancelling deletion retains the existing unsaved editing draft', async () => {
  const user = userEvent.setup()
  vi.mocked(listBooks).mockResolvedValue([book])
  render(<Library />)
  await user.click(await screen.findByRole('button', { name: 'Edit book' }))
  await user.type(screen.getByLabelText('Title'), ' draft')
  await user.keyboard('{Escape}')
  await user.click(screen.getByRole('button', { name: 'Delete book' }))
  await user.click(screen.getByRole('checkbox'))
  await user.click(screen.getByRole('button', { name: 'Cancel' }))
  await user.click(screen.getByRole('button', { name: 'Edit book' }))
  expect(screen.getByLabelText('Title')).toHaveValue('Same title draft')
  expect(deleteBook).not.toHaveBeenCalled()
})
