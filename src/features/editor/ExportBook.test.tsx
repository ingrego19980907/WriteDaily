import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { en } from '../../app/i18n/en'
import { exportBook, type BookExportResult } from '../../services/exports'
import type { ChapterSummary } from './chapter'
import { ExportBook } from './ExportBook'

vi.mock('../../services/exports', () => ({ exportBook: vi.fn() }))
const copy = en.bookExport
const book = {
  id: 'book',
  title: 'Книга 🌿',
  updatedAt: '2026-10-29T12:00:00.000Z',
}
const chapters: ChapterSummary[] = [2, 1].map((id, position) => ({
  id: String(id),
  bookId: book.id,
  title: 'Однакова назва',
  position,
  revision: id + 1,
  wordCount: 10,
  createdAt: book.updatedAt,
  updatedAt: book.updatedAt,
}))
const result: BookExportResult = {
  status: 'exported',
  fileName: 'Книга 🌿.txt',
  bookUpdatedAt: book.updatedAt,
  chapters: chapters.map(({ id, revision }) => ({ id, revision })),
}
const onPending = vi.fn()
function host(disabled = false, rows = chapters) {
  return render(
    <>
      <p id="book-export-help">{rows.length ? copy.hint : copy.emptyHint}</p>
      <ExportBook
        book={book}
        chapters={rows}
        disabled={disabled}
        hintId="book-export-help"
        onPending={onPending}
      />
    </>,
  )
}
const button = () =>
  screen.getByRole('button', { name: copy.label(book.title) })
beforeEach(() => vi.resetAllMocks())

test('keyboard book export preserves manuscript order and waits for the confirmed whole-file result', async () => {
  let finish!: (result: BookExportResult) => void
  vi.mocked(exportBook).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  const user = userEvent.setup()
  host()
  expect(button()).toHaveAccessibleDescription(copy.hint)
  await user.tab()
  await user.keyboard('{Enter}')
  expect(button()).toBeDisabled()
  expect(screen.getByRole('status')).toHaveTextContent(copy.pending)
  fireEvent.click(button())
  expect(exportBook).toHaveBeenCalledTimes(1)
  expect(exportBook).toHaveBeenCalledWith(
    book.id,
    { bookUpdatedAt: book.updatedAt, chapters },
    { title: copy.dialogTitle, fileType: copy.fileType },
  )
  expect(screen.queryByText(/Book exported:/)).not.toBeInTheDocument()
  await act(async () => finish(result))
  expect(screen.getByRole('status')).toHaveTextContent(
    copy.exported('Книга 🌿.txt'),
  )
  await waitFor(() => expect(button()).toHaveFocus())
  expect(onPending.mock.calls).toEqual([[true], [false]])
})

test('empty and disabled books explain why export cannot begin', () => {
  const { unmount } = host(false, [])
  expect(button()).toBeDisabled()
  expect(button()).toHaveAccessibleDescription(copy.emptyHint)
  fireEvent.click(button())
  expect(exportBook).not.toHaveBeenCalled()
  unmount()
  host(true)
  fireEvent.click(button())
  expect(exportBook).not.toHaveBeenCalled()
})

test('cancelling never announces a book file and permits another explicit attempt', async () => {
  vi.mocked(exportBook).mockResolvedValue({ status: 'cancelled' })
  host()
  await userEvent.click(button())
  expect(screen.getByRole('status')).toHaveTextContent(copy.cancelled)
  expect(screen.queryByText(/Book exported:/)).not.toBeInTheDocument()
  vi.mocked(exportBook).mockResolvedValue(result)
  await userEvent.click(button())
  expect(screen.getByRole('status')).toHaveTextContent(
    copy.exported('Книга 🌿.txt'),
  )
})

test.each([
  ['conflict', copy.conflict],
  ['not_found', copy.missing],
  ['empty_book', copy.empty],
  ['too_large', copy.tooLarge],
  ['already_exists', copy.exists],
  ['invalid_stored_data', copy.invalid],
  ['export_failed', copy.failure],
  ['invalid_response', copy.failure],
])(
  'book failure %s preserves the source and can retry',
  async (code, message) => {
    vi.mocked(exportBook).mockRejectedValueOnce({
      code,
      message: 'C:\\private\\library.sqlite3',
    })
    host()
    await userEvent.click(button())
    expect(screen.getByRole('alert')).toHaveTextContent(message)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    expect(screen.queryByText(/secret.sqlite/)).not.toBeInTheDocument()
    vi.mocked(exportBook).mockResolvedValue(result)
    await userEvent.click(button())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      copy.exported('Книга 🌿.txt'),
    )
  },
)

test('late book export cannot announce a hidden result after navigation', async () => {
  let finish!: (result: BookExportResult) => void
  vi.mocked(exportBook).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  const { unmount } = host()
  await userEvent.click(button())
  unmount()
  await act(async () => finish(result))
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(onPending.mock.calls).toEqual([[true]])
})
