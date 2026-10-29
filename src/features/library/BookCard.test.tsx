import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { readCover, setCover } from '../../services/books'
import { BookCard } from './BookCard'
import type { Book } from './book'

vi.mock('../../services/books', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/books')>()),
  readCover: vi.fn(),
  setCover: vi.fn(),
}))
const book: Book = {
  id: 'one',
  title: 'Моя історія',
  targetWordCount: 50000,
  dailyWordGoal: 500,
  deadline: null,
  coverPath: null,
  completedAt: null,
  createdAt: '2026-10-24T10:00:00.000Z',
  updatedAt: '2026-10-24T10:00:00.000Z',
}
const callbacks = { onSaved: vi.fn(), onDeleted: vi.fn() }
beforeEach(() => {
  vi.mocked(readCover).mockReset()
  vi.mocked(setCover).mockReset()
})

test('actions portal stays linked to its book and omits unsupported operations', async () => {
  const user = userEvent.setup()
  const { unmount } = render(<BookCard book={book} {...callbacks} />)
  const trigger = screen.getByRole('button', { name: 'Book actions' })
  await user.click(trigger)
  const panel = screen.getByRole('group', { name: 'Book actions' })
  expect(panel.id).toBe(trigger.getAttribute('aria-controls'))
  expect(panel.parentElement).toBe(document.body)
  expect(within(panel).getAllByRole('button')).toHaveLength(3)
  expect(
    within(panel).queryByRole('button', { name: /Duplicate|Archive/i }),
  ).not.toBeInTheDocument()
  expect(
    within(panel).getByRole('button', { name: 'Delete book' }),
  ).toHaveClass('book-card__menu-item--danger')
  const id = panel.id
  unmount()
  expect(document.getElementById(id)).toBeNull()
})

test('arrow opening and Tab boundaries keep the portalled actions keyboard accessible', async () => {
  const user = userEvent.setup()
  render(<BookCard book={book} {...callbacks} />)
  const trigger = screen.getByRole('button', { name: 'Book actions' })
  trigger.focus()
  await user.keyboard('{ArrowDown}')
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Edit book' })).toHaveFocus(),
  )
  await user.tab({ shift: true })
  expect(trigger).toHaveFocus()
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await user.keyboard('{ArrowUp}')
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Delete book' })).toHaveFocus(),
  )
  await user.tab()
  expect(screen.getByRole('heading', { name: book.title })).toHaveFocus()
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
})

test('closing an edit from the actions portal keeps its draft for reopening', async () => {
  const user = userEvent.setup()
  render(<BookCard book={book} {...callbacks} />)
  const trigger = screen.getByRole('button', { name: 'Book actions' })
  await user.click(trigger)
  await user.click(screen.getByRole('button', { name: 'Edit book' }))
  await user.clear(screen.getByLabelText('Title'))
  await user.type(screen.getByLabelText('Title'), 'Unfinished title')
  await user.keyboard('{Escape}')
  expect(trigger).toHaveFocus()
  await user.click(trigger)
  await user.click(screen.getByRole('button', { name: 'Edit book' }))
  expect(screen.getByLabelText('Title')).toHaveValue('Unfinished title')
})

test('compact Open label keeps the existing accessible action and pending guard', async () => {
  const onOpen = vi.fn()
  const { rerender } = render(
    <BookCard book={book} {...callbacks} onOpen={onOpen} />,
  )
  const open = screen.getByRole('button', { name: 'Open book' })
  expect(open).toHaveTextContent('Open')
  await userEvent.setup().click(open)
  expect(onOpen).toHaveBeenCalledWith(book)
  const title = screen.getByRole('heading', { name: book.title })
  expect(title).toHaveAttribute('title', book.title)
  expect(title).toHaveAccessibleDescription(
    'Focus or hover to read the full title.',
  )
  rerender(<BookCard book={book} {...callbacks} onOpen={onOpen} opening />)
  expect(screen.getByRole('button', { name: 'Opening…' })).toBeDisabled()
})

test('library cards retain compact progress without Writing details, daily goals or pace', () => {
  const { container } = render(
    <BookCard book={book} {...callbacks} wordCount={250} />,
  )
  expect(screen.getByText('250 / 50,000 words')).toBeVisible()
  expect(screen.queryByText('Writing details')).not.toBeInTheDocument()
  expect(container.querySelector('details')).toBeNull()
  expect(screen.queryByText('Daily goal: 500 words')).not.toBeInTheDocument()
  expect(
    screen.queryByRole('group', { name: 'Required writing pace' }),
  ).not.toBeInTheDocument()
  expect(screen.getAllByRole('progressbar')).toHaveLength(1)
})

test('names the article by its full title, shows target and unknown progress without inventing a count or percentage', async () => {
  render(<BookCard book={book} {...callbacks} />)
  const card = screen.getByRole('article', { name: book.title })
  expect(within(card).getByRole('heading', { level: 3 })).toHaveTextContent(
    book.title,
  )
  expect(within(card).getByText('No cover yet')).toBeVisible()
  expect(within(card).getByText('Target: 50,000 words')).toBeVisible()
  const progress = within(card).getByRole('progressbar', {
    name: 'Writing progress',
  })
  expect(progress).not.toHaveAttribute('aria-valuenow')
  expect(progress).toHaveAttribute('aria-valuetext', 'Word count unavailable')
  expect(progress).toHaveAccessibleDescription('Word count unavailable')
  expect(readCover).not.toHaveBeenCalled()
  expect(
    within(card).queryByRole('button', { name: 'Edit book' }),
  ).not.toBeInTheDocument()
  await userEvent
    .setup()
    .click(within(card).getByRole('button', { name: 'Book actions' }))
  expect(screen.getByRole('button', { name: 'Edit book' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Delete book' })).toBeVisible()
})

test('preserves full long titles and persisted completion without pretending completion is a word percentage', () => {
  const title = 'І'.repeat(200)
  render(
    <BookCard
      book={{
        ...book,
        title,
        targetWordCount: null,
        completedAt: book.createdAt,
      }}
      {...callbacks}
    />,
  )
  expect(screen.getByRole('article', { name: title })).toBeVisible()
  expect(screen.getByRole('heading')).toHaveTextContent(title)
  expect(screen.getByText('Completed')).toBeVisible()
  expect(screen.getByText('No word target')).toBeVisible()
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
})

test('loads one persisted preview per card and handles browser image failure with a readable fallback', async () => {
  vi.mocked(readCover).mockResolvedValue([1, 2, 3])
  render(
    <BookCard
      book={{ ...book, coverPath: 'covers/first.png' }}
      {...callbacks}
    />,
  )
  const image = await screen.findByRole('img', { name: 'Book cover' })
  expect(image).toHaveAttribute('src', 'data:image/png;base64,AQID')
  expect(readCover).toHaveBeenCalledTimes(1)
  fireEvent.error(image)
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'could not be loaded',
  )
  expect(screen.getByRole('heading')).toHaveTextContent(book.title)
})

test('a default cover is presentation only and never reads or replaces a stored image', async () => {
  const { container, rerender } = render(
    <BookCard book={book} {...callbacks} />,
  )
  const art = container.querySelector('.library-cover__art')!
  expect(art).toHaveAttribute('aria-hidden', 'true')
  expect(art).toHaveTextContent(book.title)
  expect(
    container.querySelector('.library-cover__frame--default'),
  ).toBeInTheDocument()
  expect(readCover).not.toHaveBeenCalled()
  expect(setCover).not.toHaveBeenCalled()
  vi.mocked(readCover).mockResolvedValue([4, 5, 6])
  rerender(
    <BookCard
      book={{ ...book, coverPath: 'covers/saved.png' }}
      {...callbacks}
    />,
  )
  expect(
    container.querySelector('.library-cover__frame--default'),
  ).not.toBeInTheDocument()
  expect(
    await screen.findByRole('img', { name: 'Book cover' }),
  ).toHaveAttribute('src', 'data:image/png;base64,BAUG')
  expect(readCover).toHaveBeenCalledWith(book.id, 'covers/saved.png')
  expect(setCover).not.toHaveBeenCalled()
})

test('old asynchronous cover responses cannot replace the current book cover', async () => {
  let resolve!: (bytes: number[]) => void
  vi.mocked(readCover)
    .mockReturnValueOnce(
      new Promise<number[]>((done) => {
        resolve = done
      }),
    )
    .mockResolvedValueOnce([4, 5, 6])
  const { rerender } = render(
    <BookCard
      book={{ ...book, coverPath: 'covers/first.png' }}
      {...callbacks}
    />,
  )
  rerender(
    <BookCard
      book={{ ...book, coverPath: 'covers/second.png' }}
      {...callbacks}
    />,
  )
  expect(await screen.findByRole('img')).toHaveAttribute(
    'src',
    'data:image/png;base64,BAUG',
  )
  await act(async () => resolve([1, 2, 3]))
  expect(screen.getByRole('img')).toHaveAttribute(
    'src',
    'data:image/png;base64,BAUG',
  )
})

test('card actions support keyboard traversal, Escape and outside dismissal without stealing focus', async () => {
  const user = userEvent.setup()
  render(
    <>
      <button>Outside</button>
      <BookCard book={book} {...callbacks} />
    </>,
  )
  const trigger = screen.getByRole('button', { name: 'Book actions' })
  trigger.focus()
  await user.keyboard('{Enter}')
  expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await user.tab()
  expect(screen.getByRole('button', { name: 'Edit book' })).toHaveFocus()
  await user.keyboard('{ArrowDown}')
  expect(screen.getByText('Manage cover')).toHaveFocus()
  await user.keyboard('{ArrowDown}')
  expect(screen.getByRole('button', { name: 'Delete book' })).toHaveFocus()
  await user.keyboard('{ArrowDown}')
  expect(screen.getByRole('button', { name: 'Edit book' })).toHaveFocus()
  await user.keyboard('{End}')
  expect(screen.getByRole('button', { name: 'Delete book' })).toHaveFocus()
  await user.keyboard('{Escape}')
  expect(trigger).toHaveFocus()
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await user.click(trigger)
  await user.click(screen.getByRole('button', { name: 'Outside' }))
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus()
})

test('selecting edit hides actions and closing the dialog returns to the visible dots button', async () => {
  const user = userEvent.setup()
  render(<BookCard book={book} {...callbacks} />)
  const trigger = screen.getByRole('button', { name: 'Book actions' })
  await user.click(trigger)
  await user.click(screen.getByRole('button', { name: 'Edit book' }))
  expect(screen.getByRole('dialog', { name: 'Edit book' })).toBeVisible()
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await user.keyboard('{Escape}')
  expect(trigger).toHaveFocus()
  expect(
    screen.queryByRole('button', { name: 'Edit book' }),
  ).not.toBeInTheDocument()
})

test('cover action opens a separate dialog and restores focus to dots on close', async () => {
  const user = userEvent.setup()
  render(<BookCard book={book} {...callbacks} />)
  const trigger = screen.getByRole('button', { name: 'Book actions' })
  expect(screen.queryByText('Manage cover')).not.toBeVisible()
  await user.click(trigger)
  await user.click(screen.getByText('Manage cover'))
  const input = screen.getByLabelText('Cover image', {
    exact: true,
  }) as HTMLInputElement
  const file = new File(['image'], 'cover.png', { type: 'image/png' })
  await user.upload(input, file)
  expect(screen.getByRole('dialog', { name: 'Manage cover' })).toBeVisible()
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  expect(screen.getByRole('button', { name: 'Save cover' })).toBeEnabled()
  await user.keyboard('{Escape}')
  expect(trigger).toHaveFocus()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  await user.click(trigger)
  await user.click(screen.getByRole('button', { name: 'Manage cover' }))
  expect(screen.getByLabelText('Cover image', { exact: true })).toBeVisible()
})

test('cover dialog blocks dismissal during persistence and retains the selected file after failure', async () => {
  const user = userEvent.setup()
  let reject!: (error: Error) => void
  vi.mocked(setCover).mockReturnValue(
    new Promise((_, fail) => {
      reject = fail
    }),
  )
  render(<BookCard book={book} {...callbacks} />)
  const dots = screen.getByRole('button', { name: 'Book actions' })
  await user.click(dots)
  await user.click(screen.getByRole('button', { name: 'Manage cover' }))
  const file = new File(['image'], 'cover.png', { type: 'image/png' })
  Object.defineProperty(file, 'arrayBuffer', {
    value: async () => new Uint8Array([1, 2, 3]).buffer,
  })
  const input = screen.getByLabelText('Cover image', {
    exact: true,
  }) as HTMLInputElement
  await user.upload(input, file)
  await user.click(screen.getByRole('button', { name: 'Save cover' }))
  expect(setCover).toHaveBeenCalledWith(book.id, book.updatedAt, [1, 2, 3])
  await user.keyboard('{Escape}')
  await user.click(screen.getByRole('button', { name: 'Close' }))
  expect(screen.getByRole('dialog', { name: 'Manage cover' })).toBeVisible()
  expect(input).toBeDisabled()
  await act(async () => reject(new Error('write failed')))
  expect(screen.getByRole('alert')).toBeVisible()
  expect(input.files?.[0]).toBe(file)
  expect(screen.getByRole('button', { name: 'Save cover' })).toBeEnabled()
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(dots).toHaveFocus()
})
