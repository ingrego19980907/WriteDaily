import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { deleteBook, getBook, listBooks } from '../services/books'
import type { Book } from '../features/library/book'
import App from './App'

vi.mock('../services/books', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/books')>()),
  listBooks: vi.fn(),
  getBook: vi.fn(),
  deleteBook: vi.fn(),
}))
const first: Book = {
  id: 'one',
  title: 'Same title',
  targetWordCount: 1000,
  dailyWordGoal: null,
  deadline: null,
  coverPath: null,
  completedAt: null,
  createdAt: '2026-10-25T10:00:00.000Z',
  updatedAt: '2026-10-25T10:00:00.000Z',
}
const second = { ...first, id: 'two', targetWordCount: 2000 }
beforeEach(() => {
  vi.mocked(getBook).mockReset()
  vi.mocked(deleteBook).mockReset()
  vi.mocked(listBooks).mockResolvedValue([first, second])
})

test('opens the selected identity with keyboard input even with duplicate titles, using fresh persisted metadata', async () => {
  const user = userEvent.setup()
  vi.mocked(getBook).mockResolvedValue({ ...second, title: 'Fresh title' })
  render(<App />)
  const buttons = await screen.findAllByRole('button', { name: 'Open book' })
  buttons[1].focus()
  await user.keyboard('{Enter}')
  expect(getBook).toHaveBeenCalledWith('two')
  const context = await screen.findByRole('region', { name: 'Fresh title' })
  expect(within(context).getByText('Target: 2,000 words')).toBeVisible()
  expect(
    screen.getByRole('heading', { level: 1, name: 'Writing Editor' }),
  ).toHaveFocus()
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Back to library' }))
  expect(screen.getAllByRole('article', { name: 'Same title' })).toHaveLength(2)
  expect(
    screen.getByRole('heading', { level: 1, name: 'My Library' }),
  ).toHaveFocus()
})

test.each(['persistence', 'not_found'])(
  'failed open (%s) keeps library data and allows retry',
  async (code) => {
    const user = userEvent.setup()
    vi.mocked(getBook)
      .mockRejectedValueOnce({ code })
      .mockResolvedValueOnce(first)
    render(<App />)
    const buttons = await screen.findAllByRole('button', { name: 'Open book' })
    await user.click(buttons[0])
    expect(await screen.findByRole('alert')).toHaveTextContent(
      code === 'not_found' ? 'no longer available' : 'Could not open',
    )
    expect(
      screen.getByRole('heading', { level: 1, name: 'My Library' }),
    ).toBeVisible()
    expect(screen.getAllByRole('article')).toHaveLength(2)
    await user.click(buttons[0])
    expect(
      await screen.findByRole('region', { name: first.title }),
    ).toBeVisible()
  },
)

test('an older response cannot replace the last book selected', async () => {
  const user = userEvent.setup()
  let resolve!: (book: Book) => void
  vi.mocked(getBook)
    .mockReturnValueOnce(
      new Promise<Book>((done) => {
        resolve = done
      }),
    )
    .mockResolvedValueOnce(second)
  render(<App />)
  const buttons = await screen.findAllByRole('button', { name: 'Open book' })
  await user.click(buttons[0])
  expect(screen.getByRole('button', { name: 'Opening…' })).toBeDisabled()
  await user.click(buttons[1])
  expect(
    await screen.findByRole('region', { name: first.title }),
  ).toHaveTextContent('Target: 2,000 words')
  await act(async () => resolve(first))
  expect(screen.getByRole('region', { name: first.title })).toHaveTextContent(
    'Target: 2,000 words',
  )
})

test('navigation away invalidates a pending open response', async () => {
  const user = userEvent.setup()
  let resolve!: (book: Book) => void
  vi.mocked(getBook).mockReturnValue(
    new Promise<Book>((done) => {
      resolve = done
    }),
  )
  render(<App />)
  const buttons = await screen.findAllByRole('button', { name: 'Open book' })
  await user.click(buttons[0])
  await user.click(screen.getByRole('button', { name: 'Achievements' }))
  await act(async () => resolve(first))
  expect(
    screen.getByRole('heading', { level: 1, name: 'Achievements' }),
  ).toHaveFocus()
  expect(
    screen.queryByRole('region', { name: first.title }),
  ).not.toBeInTheDocument()
})

test('confirmed deletion clears the previously selected editor context', async () => {
  const user = userEvent.setup()
  vi.mocked(getBook).mockResolvedValue(first)
  vi.mocked(deleteBook).mockResolvedValue({ cleanupPending: false })
  render(<App />)
  await user.click(
    (await screen.findAllByRole('button', { name: 'Open book' }))[0],
  )
  await user.click(
    await screen.findByRole('button', { name: 'Back to library' }),
  )
  await user.click(screen.getAllByRole('button', { name: 'Book actions' })[0])
  await user.click(screen.getByRole('button', { name: 'Delete book' }))
  await user.click(screen.getByRole('checkbox'))
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Delete book',
    }),
  )
  await user.click(screen.getByRole('button', { name: 'Writing Editor' }))
  expect(
    screen.queryByRole('region', { name: first.title }),
  ).not.toBeInTheDocument()
  expect(
    screen.getByRole('heading', { name: 'Choose a book to edit' }),
  ).toBeVisible()
  expect(screen.queryByText('Coming soon')).not.toBeInTheDocument()
})

test('a late open response cannot select a book deleted during loading', async () => {
  const user = userEvent.setup()
  let resolve!: (book: Book) => void
  vi.mocked(getBook).mockReturnValue(
    new Promise<Book>((done) => {
      resolve = done
    }),
  )
  vi.mocked(deleteBook).mockResolvedValue({ cleanupPending: false })
  render(<App />)
  await user.click(
    (await screen.findAllByRole('button', { name: 'Open book' }))[0],
  )
  await user.click(screen.getAllByRole('button', { name: 'Book actions' })[0])
  await user.click(screen.getByRole('button', { name: 'Delete book' }))
  await user.click(screen.getByRole('checkbox'))
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Delete book',
    }),
  )
  await act(async () => resolve(first))
  expect(
    screen.getByRole('heading', { level: 1, name: 'My Library' }),
  ).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Writing Editor' }))
  expect(
    screen.queryByRole('region', { name: first.title }),
  ).not.toBeInTheDocument()
})
