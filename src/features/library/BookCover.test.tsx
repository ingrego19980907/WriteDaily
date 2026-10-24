import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, expect, test, vi } from 'vitest'
import {
  getBook,
  readCover,
  setCover,
  type CoverResult,
} from '../../services/books'
import type { Book } from './book'
import { BookCover } from './BookCover'

vi.mock('../../services/books', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/books')>()),
  getBook: vi.fn(),
  readCover: vi.fn(),
  setCover: vi.fn(),
}))
const book: Book = {
  id: 'book',
  title: 'Story',
  targetWordCount: null,
  dailyWordGoal: null,
  deadline: null,
  coverPath: null,
  completedAt: null,
  createdAt: '2026-10-24T10:00:00.000Z',
  updatedAt: '2026-10-24T10:00:00.000Z',
}
const covered = {
  ...book,
  coverPath: 'covers/cover.png',
  updatedAt: '2026-10-24T11:00:00.000Z',
}
function file() {
  const selected = new File(['png'], 'my-cover.png', { type: 'image/png' })
  Object.defineProperty(selected, 'arrayBuffer', {
    value: async () => new Uint8Array([1, 2, 3]).buffer,
  })
  return selected
}
function Harness({ initial = book }: { initial?: Book }) {
  const [current, setCurrent] = useState(initial)
  return <BookCover book={current} onSaved={setCurrent} />
}
beforeEach(() => {
  vi.mocked(getBook).mockReset()
  vi.mocked(setCover).mockReset()
  vi.mocked(readCover).mockReset()
  vi.mocked(readCover).mockResolvedValue([1, 2, 3])
})

test('uploads selected bytes for the current revision, previews only the persisted cover and removes by null', async () => {
  const user = userEvent.setup()
  vi.mocked(setCover)
    .mockResolvedValueOnce({ book: covered, cleanupPending: false })
    .mockResolvedValueOnce({
      book: { ...covered, coverPath: null },
      cleanupPending: false,
    })
  render(<Harness />)
  expect(screen.getByRole('button', { name: 'Save cover' })).toBeDisabled()
  await user.upload(screen.getByLabelText('Cover image'), file())
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Save cover' }))
  expect(setCover).toHaveBeenCalledWith(book.id, book.updatedAt, [1, 2, 3])
  expect(
    await screen.findByRole('img', { name: 'Book cover' }),
  ).toHaveAttribute('src', 'data:image/png;base64,AQID')
  expect(readCover).toHaveBeenCalledWith(covered.id, covered.coverPath)
  await user.click(screen.getByRole('button', { name: 'Remove cover' }))
  expect(setCover).toHaveBeenLastCalledWith(book.id, covered.updatedAt, null)
  expect(await screen.findByText('Cover removed.')).toBeVisible()
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
})

test('failed upload preserves selected file and current cover for retry', async () => {
  const user = userEvent.setup()
  vi.mocked(setCover)
    .mockRejectedValueOnce({ code: 'invalid_image' })
    .mockResolvedValueOnce({ book: covered, cleanupPending: false })
  render(<Harness initial={covered} />)
  await screen.findByRole('img')
  await user.upload(screen.getByLabelText('Cover image'), file())
  await user.click(screen.getByRole('button', { name: 'Save cover' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('valid PNG')
  expect(screen.getByRole('img')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Save cover' })).toBeEnabled()
  await user.click(screen.getByRole('button', { name: 'Save cover' }))
  expect(await screen.findByText('Cover saved.')).toBeVisible()
  expect(setCover).toHaveBeenCalledTimes(2)
})

test('oversized files never reach native persistence', async () => {
  const user = userEvent.setup()
  const selected = file()
  Object.defineProperty(selected, 'size', { value: 5 * 1024 * 1024 + 1 })
  render(<Harness />)
  await user.upload(screen.getByLabelText('Cover image'), selected)
  await user.click(screen.getByRole('button', { name: 'Save cover' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('5 MiB')
  expect(setCover).not.toHaveBeenCalled()
})

test('conflict preserves selected file and retries only after loading the new revision', async () => {
  const user = userEvent.setup()
  vi.mocked(setCover)
    .mockRejectedValueOnce({ code: 'conflict' })
    .mockResolvedValueOnce({ book: covered, cleanupPending: false })
  vi.mocked(getBook).mockResolvedValue({
    ...book,
    updatedAt: covered.updatedAt,
  })
  render(<Harness />)
  await user.upload(screen.getByLabelText('Cover image'), file())
  await user.click(screen.getByRole('button', { name: 'Save cover' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('has changed')
  expect(screen.getByRole('button', { name: 'Save cover' })).toBeDisabled()
  await user.click(
    screen.getByRole('button', { name: 'Load latest book details' }),
  )
  await user.click(screen.getByRole('button', { name: 'Save cover' }))
  expect(setCover).toHaveBeenLastCalledWith(
    book.id,
    covered.updatedAt,
    [1, 2, 3],
  )
})

test('pending upload prevents duplicate writes and reports committed cleanup separately', async () => {
  const user = userEvent.setup()
  let resolve!: (result: CoverResult) => void
  vi.mocked(setCover).mockReturnValue(
    new Promise<CoverResult>((done) => {
      resolve = done
    }),
  )
  render(<Harness />)
  await user.upload(screen.getByLabelText('Cover image'), file())
  await user.dblClick(screen.getByRole('button', { name: 'Save cover' }))
  expect(setCover).toHaveBeenCalledTimes(1)
  expect(screen.getByLabelText('Cover image')).toBeDisabled()
  expect(screen.queryByText('Cover saved.')).not.toBeInTheDocument()
  await act(async () => resolve({ book: covered, cleanupPending: true }))
  expect(
    await screen.findByText(/Cover saved.*queued for cleanup/),
  ).toBeVisible()
})

test('missing or corrupt stored image reports an error while retaining metadata and removal access', async () => {
  vi.mocked(readCover).mockRejectedValue(new Error('missing file'))
  render(<Harness initial={covered} />)
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'could not be loaded',
  )
  expect(screen.getByRole('button', { name: 'Remove cover' })).toBeEnabled()
})
