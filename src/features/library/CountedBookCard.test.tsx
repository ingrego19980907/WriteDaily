import { act, render, screen } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import { listChapters } from '../../services/chapters'
import { CountedBookCard } from './CountedBookCard'
import type { Book } from './book'
import type { ChapterSummary } from '../editor/chapter'
vi.mock('../../services/chapters', () => ({ listChapters: vi.fn() }))
const book: Book = {
  id: 'one',
  title: 'Book',
  targetWordCount: 100,
  dailyWordGoal: null,
  deadline: null,
  coverPath: null,
  completedAt: null,
  createdAt: '2026-10-27T00:00:00.000Z',
  updatedAt: '2026-10-27T00:00:00.000Z',
}
const chapters = (count: number | null): ChapterSummary[] => [
  {
    id: 'chapter',
    bookId: 'one',
    title: 'Chapter',
    position: 0,
    revision: 1,
    wordCount: count,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
  },
]
const props = { book, onSaved: vi.fn(), onDeleted: vi.fn() }
beforeEach(() => {
  vi.mocked(listChapters).mockReset()
})

test('shows only the latest scoped read after returning from the editor', async () => {
  let stale!: (value: ChapterSummary[]) => void
  vi.mocked(listChapters)
    .mockReturnValueOnce(
      new Promise((resolve) => {
        stale = resolve
      }),
    )
    .mockResolvedValueOnce(chapters(12))
  const { rerender } = render(
    <CountedBookCard {...props} active countsVersion={0} />,
  )
  expect(screen.getByText('Word count unavailable')).toBeVisible()
  rerender(<CountedBookCard {...props} active={false} countsVersion={0} />)
  rerender(<CountedBookCard {...props} active countsVersion={1} />)
  expect(
    await screen.findByText('12 / 100 words \u00b7 12% of target'),
  ).toBeVisible()
  await act(async () => stale(chapters(99)))
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '12')
  expect(listChapters).toHaveBeenCalledTimes(2)
})

test('read failures and legacy unknown counts never invent zero; a new visit retries', async () => {
  vi.mocked(listChapters)
    .mockRejectedValueOnce({ code: 'persistence' })
    .mockResolvedValueOnce(chapters(null))
    .mockResolvedValueOnce([])
  const { rerender } = render(
    <CountedBookCard {...props} active countsVersion={0} />,
  )
  await act(async () => {})
  expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow')
  rerender(<CountedBookCard {...props} active countsVersion={1} />)
  await act(async () => {})
  expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow')
  rerender(<CountedBookCard {...props} active countsVersion={2} />)
  expect(
    await screen.findByText('0 / 100 words \u00b7 0% of target'),
  ).toBeVisible()
})
