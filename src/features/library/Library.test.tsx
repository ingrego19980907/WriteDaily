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

test('the confirmed empty state shares the creation draft and restores focus to the surviving trigger after a real commit', async () => {
  const user = userEvent.setup()
  let resolve!: (book: Book) => void
  vi.mocked(listBooks).mockResolvedValue([])
  vi.mocked(createBook).mockReturnValue(
    new Promise((done) => {
      resolve = done
    }),
  )
  const onBookSaved = vi.fn()
  render(<Library onBookSaved={onBookSaved} />)
  const empty = await screen.findByRole('region', {
    name: 'Your story starts here',
  })
  expect(
    within(empty).getByText(
      'Create your first book and begin writing, one day at a time.',
    ),
  ).toBeVisible()
  const firstBook = within(empty).getByRole('button', {
    name: 'Create your first book',
  })
  const headerTrigger = screen.getByRole('button', { name: 'New Book' })
  expect(
    within(screen.getByRole('list', { name: 'Books' })).queryByRole('listitem'),
  ).not.toBeInTheDocument()
  expect(createBook).not.toHaveBeenCalled()
  await user.click(firstBook)
  expect(screen.getAllByRole('dialog')).toHaveLength(1)
  await user.type(screen.getByLabelText('Book title'), 'First pages')
  await user.keyboard('{Escape}')
  expect(firstBook).toHaveFocus()
  await user.click(headerTrigger)
  expect(screen.getByLabelText('Book title')).toHaveValue('First pages')
  await user.keyboard('{Escape}')
  expect(headerTrigger).toHaveFocus()
  await user.click(firstBook)
  await user.click(screen.getByRole('button', { name: 'Create book' }))
  expect(onBookSaved).not.toHaveBeenCalled()
  await user.keyboard('{Escape}')
  expect(screen.getByRole('dialog')).toBeVisible()
  expect(screen.getByLabelText('Book title')).toBeDisabled()
  expect(createBook).toHaveBeenCalledExactlyOnceWith({
    title: 'First pages',
    targetWordCount: null,
    dailyWordGoal: null,
    deadline: null,
  })
  await act(async () => resolve({ ...book, title: 'First pages' }))
  expect(
    screen.queryByRole('region', { name: 'Your story starts here' }),
  ).not.toBeInTheDocument()
  expect(screen.getByRole('article', { name: 'First pages' })).toBeVisible()
  expect(onBookSaved).toHaveBeenCalledExactlyOnceWith({
    ...book,
    title: 'First pages',
  })
  await vi.waitFor(() => expect(headerTrigger).toHaveFocus())
})

test('Unicode title search composes with status filters and both views retain real book actions', async () => {
  const user = userEvent.setup()
  const onOpenBook = vi.fn()
  vi.mocked(listBooks).mockResolvedValue([
    { ...book, title: 'Українська історія' },
    { ...book, id: 'two', title: 'Історія Café', completedAt: book.updatedAt },
  ])
  render(<Library onOpenBook={onOpenBook} />)
  await screen.findByRole('button', { name: 'All Books 2 books' })
  const search = screen.getByRole('searchbox', { name: 'Search books' })
  const list = screen.getByRole('list', { name: 'Books' })
  await user.type(search, 'ІСТОРІЯ')
  expect(within(list).getAllByRole('listitem')).toHaveLength(2)
  await user.click(screen.getByRole('button', { name: 'Completed 1 book' }))
  expect(within(list).getAllByRole('listitem')).toHaveLength(1)
  const card = within(list).getByRole('article')
  await user.click(screen.getByRole('button', { name: 'List view' }))
  expect(list).toHaveClass('library-list')
  expect(within(list).getByRole('article')).toBe(card)
  await user.click(within(card).getByRole('button', { name: 'Open book' }))
  expect(onOpenBook).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'two' }),
  )
  await user.clear(search)
  await user.type(search, 'missing')
  expect(screen.getByRole('heading', { name: 'No books found' })).toBeVisible()
  expect(
    screen.getByText(
      'Try another title, clear your search, or choose a different book filter.',
    ),
  ).toBeVisible()
  expect(
    screen.queryByText(
      'Create your first book and begin writing, one day at a time.',
    ),
  ).not.toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'All Books 2 books' }),
  ).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Clear search' }))
  expect(search).toHaveFocus()
  expect(search).toHaveValue('')
  expect(
    screen.queryByRole('region', { name: 'No books found' }),
  ).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Grid view' }))
  expect(list).toHaveClass('library-grid')
  expect(within(list).getAllByRole('listitem')).toHaveLength(1)
  expect(listBooks).toHaveBeenCalledTimes(1)
  expect(createBook).not.toHaveBeenCalled()
  expect(updateBook).not.toHaveBeenCalled()
  expect(deleteBook).not.toHaveBeenCalled()
})

test('filters committed completion metadata without writing or reloading books', async () => {
  const user = userEvent.setup()
  vi.mocked(listBooks).mockResolvedValue([
    { ...book, title: 'Unfinished story', targetWordCount: 1 },
    {
      ...book,
      id: 'two',
      title: 'Finished story',
      completedAt: book.updatedAt,
    },
    { ...book, id: 'three', title: 'New story' },
  ])
  render(<Library />)
  const all = await screen.findByRole('button', { name: 'All Books 3 books' })
  expect(all).toHaveAttribute('aria-pressed', 'true')
  expect(
    screen.getByRole('button', { name: 'Archived ? (count unavailable)' }),
  ).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Completed 1 book' }))
  expect(screen.getByRole('heading', { name: 'Finished story' })).toBeVisible()
  expect(
    screen.queryByRole('heading', { name: 'Unfinished story' }),
  ).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'In Progress 2 books' }))
  expect(
    screen.queryByRole('heading', { name: 'Finished story' }),
  ).not.toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'New story' })).toBeVisible()
  await user.click(all)
  expect(
    within(screen.getByRole('list', { name: 'Books' })).getAllByRole(
      'listitem',
    ),
  ).toHaveLength(3)
  expect(listBooks).toHaveBeenCalledTimes(1)
  expect(createBook).not.toHaveBeenCalled()
  expect(updateBook).not.toHaveBeenCalled()
  expect(deleteBook).not.toHaveBeenCalled()
})

test('an empty completed filter retains counts and offers a way back to all books', async () => {
  const user = userEvent.setup()
  vi.mocked(listBooks).mockResolvedValue([book])
  render(<Library />)
  await user.click(
    await screen.findByRole('button', { name: 'Completed 0 books' }),
  )
  expect(
    screen.getByRole('heading', { name: 'No books match this filter' }),
  ).toBeVisible()
  expect(
    screen.queryByText(
      'Create your first book and begin writing, one day at a time.',
    ),
  ).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'All Books 1 book' }))
  expect(screen.getByRole('heading', { name: book.title })).toBeVisible()
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
  await screen.findAllByRole('button', { name: 'Book actions' })
  const rows = within(list).getAllByRole('listitem')
  await user.click(
    within(rows[1]).getByRole('button', { name: 'Book actions' }),
  )
  await user.click(screen.getByRole('button', { name: 'Edit book' }))
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
    screen.getByRole('button', { name: 'All Books ? (count unavailable)' }),
  ).toBeDisabled()
  expect(
    screen.queryByText(
      'Create your first book and begin writing, one day at a time.',
    ),
  ).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Retry loading books' }))
  expect(
    await screen.findByText(
      'Create your first book and begin writing, one day at a time.',
    ),
  ).toBeVisible()
})

test('initial loading is announced and never presented as an empty library', async () => {
  let resolve!: (books: Book[]) => void
  vi.mocked(listBooks).mockReturnValue(
    new Promise<Book[]>((done) => {
      resolve = done
    }),
  )
  render(<Library />)
  expect(screen.getByRole('list', { name: 'Books' })).toHaveAttribute(
    'aria-busy',
    'true',
  )
  expect(
    screen.getByRole('button', { name: 'All Books ? (count unavailable)' }),
  ).toBeDisabled()
  expect(screen.getByText('Loading books…')).toBeVisible()
  expect(
    screen.queryByText(
      'Create your first book and begin writing, one day at a time.',
    ),
  ).not.toBeInTheDocument()
  await act(async () => resolve([]))
  expect(
    screen.getByRole('button', { name: 'All Books 0 books' }),
  ).toBeEnabled()
  expect(
    screen.getByRole('heading', { name: 'Your story starts here' }),
  ).toBeVisible()
  expect(screen.getByRole('list', { name: 'Books' })).toHaveAttribute(
    'aria-busy',
    'false',
  )
})

test('desktop-only preview explains the limitation without a misleading retry or empty state', async () => {
  vi.mocked(listBooks).mockRejectedValue({ code: 'desktop_required' })
  render(<Library />)
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Open the desktop app',
  )
  expect(
    screen.getByRole('heading', { name: 'Desktop app required' }),
  ).toBeVisible()
  expect(
    screen.queryByRole('button', { name: 'Retry loading books' }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByText(
      'Create your first book and begin writing, one day at a time.',
    ),
  ).not.toBeInTheDocument()
})

test('retry stays disabled in flight and focuses the Books heading after success', async () => {
  const user = userEvent.setup()
  let resolve!: (books: Book[]) => void
  vi.mocked(listBooks)
    .mockRejectedValueOnce(new Error('disk'))
    .mockReturnValueOnce(
      new Promise<Book[]>((done) => {
        resolve = done
      }),
    )
  render(<Library />)
  await user.click(
    await screen.findByRole('button', { name: 'Retry loading books' }),
  )
  expect(screen.getByRole('button', { name: 'Retrying…' })).toBeDisabled()
  expect(
    screen.queryByText(
      'Create your first book and begin writing, one day at a time.',
    ),
  ).not.toBeInTheDocument()
  await act(async () => resolve([book]))
  expect(await screen.findByRole('article', { name: book.title })).toBeVisible()
  await vi.waitFor(() =>
    expect(screen.getByRole('heading', { name: /^Books$/ })).toHaveFocus(),
  )
})

test('a committed creation after a failed list read does not hide the unresolved loading error', async () => {
  const user = userEvent.setup()
  vi.mocked(listBooks).mockRejectedValue(new Error('list failure'))
  vi.mocked(createBook).mockResolvedValue(book)
  render(<Library />)
  await screen.findByRole('alert')
  await user.click(screen.getByRole('button', { name: 'New Book' }))
  await user.type(screen.getByLabelText('Book title'), book.title)
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Create book',
    }),
  )
  expect(await screen.findByRole('article', { name: book.title })).toBeVisible()
  expect(screen.getByRole('alert')).toHaveTextContent('Could not load')
  expect(
    screen.getByRole('button', { name: 'Retry loading books' }),
  ).toBeEnabled()
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
  await user.click(screen.getByRole('button', { name: 'New Book' }))
  await user.type(screen.getByLabelText('Book title'), 'Same title')
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
  vi.mocked(deleteBook).mockResolvedValue({ cleanupPending: true })
  render(<Library />)
  const actions = await screen.findAllByRole('button', { name: 'Book actions' })
  await user.click(actions[1])
  await user.click(screen.getByRole('button', { name: 'Delete book' }))
  await user.click(screen.getByRole('checkbox'))
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Delete book',
    }),
  )
  expect(deleteBook).toHaveBeenCalledWith('two', book.updatedAt)
  expect(await screen.findByText('Book deleted: Same title')).toBeVisible()
  expect(screen.getByText(/Some old cover files remain queued/)).toBeVisible()
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
    .mockResolvedValueOnce({ cleanupPending: false })
  render(<Library />)
  await user.click(screen.getByRole('button', { name: 'New Book' }))
  await user.type(screen.getByLabelText('Book title'), book.title)
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Create book',
    }),
  )
  await user.click(await screen.findByRole('button', { name: 'Book actions' }))
  await user.click(screen.getByRole('button', { name: 'Delete book' }))
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
    screen.getByText(
      'Create your first book and begin writing, one day at a time.',
    ),
  ).toBeVisible()
})

test('cancelling deletion retains the existing unsaved editing draft', async () => {
  const user = userEvent.setup()
  vi.mocked(listBooks).mockResolvedValue([book])
  render(<Library />)
  await user.click(await screen.findByRole('button', { name: 'Book actions' }))
  await user.click(screen.getByRole('button', { name: 'Edit book' }))
  await user.type(screen.getByLabelText('Title'), ' draft')
  await user.keyboard('{Escape}')
  await user.click(screen.getByRole('button', { name: 'Book actions' }))
  await user.click(screen.getByRole('button', { name: 'Delete book' }))
  await user.click(screen.getByRole('checkbox'))
  await user.click(screen.getByRole('button', { name: 'Cancel' }))
  await user.click(screen.getByRole('button', { name: 'Book actions' }))
  await user.click(screen.getByRole('button', { name: 'Edit book' }))
  expect(screen.getByLabelText('Title')).toHaveValue('Same title draft')
  expect(deleteBook).not.toHaveBeenCalled()
})

test('daily goal edits publish only after commit, keep failed drafts and clear with a blank value', async () => {
  const user = userEvent.setup()
  const original = { ...book, dailyWordGoal: 500 }
  vi.mocked(listBooks).mockResolvedValue([original])
  let reject!: (error: unknown) => void
  vi.mocked(updateBook).mockReturnValueOnce(
    new Promise((_, fail) => {
      reject = fail
    }),
  )
  const onBookSaved = vi.fn()
  render(<Library onBookSaved={onBookSaved} />)
  const card = await screen.findByRole('article')
  await user.click(within(card).getByRole('button', { name: 'Book actions' }))
  await user.click(screen.getByRole('button', { name: 'Edit book' }))
  const input = screen.getByLabelText('Daily word goal (optional)')
  expect(input).toHaveAccessibleDescription(/Leave blank to remove/)
  await user.clear(input)
  await user.type(input, '1500')
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(onBookSaved).not.toHaveBeenCalled()
  await act(async () => reject({ code: 'persistence' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Could not save changes',
  )
  expect(input).toHaveValue('1500')
  expect(
    within(card).queryByText('Daily goal: 1,500 words'),
  ).not.toBeInTheDocument()
  vi.mocked(updateBook).mockResolvedValueOnce({
    ...original,
    dailyWordGoal: 1500,
    updatedAt: '2026-10-27T01:00:00.000Z',
  })
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(onBookSaved).toHaveBeenLastCalledWith(
    expect.objectContaining({ dailyWordGoal: 1500 }),
  )
  await user.click(within(card).getByRole('button', { name: 'Book actions' }))
  await user.click(screen.getByRole('button', { name: 'Edit book' }))
  expect(screen.getByLabelText('Daily word goal (optional)')).toHaveValue(
    '1500',
  )
  await user.clear(screen.getByLabelText('Daily word goal (optional)'))
  vi.mocked(updateBook).mockResolvedValueOnce({
    ...original,
    dailyWordGoal: null,
    updatedAt: '2026-10-27T02:00:00.000Z',
  })
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(onBookSaved).toHaveBeenLastCalledWith(
    expect.objectContaining({ dailyWordGoal: null }),
  )
  expect(updateBook).toHaveBeenLastCalledWith(
    book.id,
    '2026-10-27T01:00:00.000Z',
    expect.objectContaining({ dailyWordGoal: null }),
  )
})
