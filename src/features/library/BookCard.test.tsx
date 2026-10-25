import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import { readCover } from '../../services/books'
import { BookCard } from './BookCard'
import type { Book } from './book'

vi.mock('../../services/books', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/books')>()),
  readCover: vi.fn(),
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
})

test('names the article by its full title, shows target and unknown progress without inventing a count or percentage', () => {
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
  expect(within(card).getByRole('button', { name: 'Edit book' })).toBeVisible()
  expect(
    within(card).getByRole('button', { name: 'Delete book' }),
  ).toBeVisible()
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
  expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow')
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
