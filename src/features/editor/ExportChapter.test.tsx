import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { en } from '../../app/i18n/en'
import { exportChapter, type ChapterExportResult } from '../../services/exports'
import { ExportChapter } from './ExportChapter'
import type { ChapterSummary } from './chapter'

vi.mock('../../services/exports', () => ({ exportChapter: vi.fn() }))
const copy = en.chapterExport
const chapter: ChapterSummary = {
  id: 'selected',
  bookId: 'book',
  title: 'Розділ 🌿',
  position: 0,
  wordCount: 100,
  revision: 4,
  createdAt: '2026-10-29T12:00:00.000Z',
  updatedAt: '2026-10-29T12:00:00.000Z',
}
const onPending = vi.fn()
function host(disabled = false) {
  return render(
    <>
      <p id="export-help">{copy.hint}</p>
      <ExportChapter
        bookId={chapter.bookId}
        chapter={chapter}
        disabled={disabled}
        hintId="export-help"
        onPending={onPending}
      />
    </>,
  )
}
function button() {
  return screen.getByRole('button', { name: copy.label(chapter.title) })
}
beforeEach(() => {
  vi.resetAllMocks()
})

test('keyboard export waits for the native write result and keeps its source revision', async () => {
  let finish!: (value: ChapterExportResult) => void
  vi.mocked(exportChapter).mockReturnValue(
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
  expect(exportChapter).toHaveBeenCalledExactlyOnceWith('book', 'selected', 4, {
    title: copy.dialogTitle,
    fileType: copy.fileType,
  })
  expect(screen.queryByText(/Chapter exported:/)).not.toBeInTheDocument()
  await act(async () =>
    finish({ status: 'exported', fileName: 'Розділ 🌿.txt', revision: 4 }),
  )
  expect(screen.getByRole('status')).toHaveTextContent(
    copy.exported('Розділ 🌿.txt'),
  )
  expect(button()).toBeEnabled()
  await waitFor(() => expect(button()).toHaveFocus())
  expect(onPending.mock.calls).toEqual([[true], [false]])
})

test('cancellation reports no exported file and permits another attempt', async () => {
  vi.mocked(exportChapter).mockResolvedValue({ status: 'cancelled' })
  host()
  await userEvent.click(button())
  expect(screen.getByRole('status')).toHaveTextContent(copy.cancelled)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.queryByText(/Chapter exported:/)).not.toBeInTheDocument()
  expect(button()).toBeEnabled()
})

test.each([
  ['conflict', copy.conflict],
  ['not_found', copy.missing],
  ['already_exists', copy.exists],
  ['invalid_destination', copy.destination],
  ['invalid_stored_data', copy.invalid],
  ['desktop_required', copy.desktop],
  ['export_failed', copy.failure],
  ['invalid_response', copy.failure],
])(
  'error %s remains actionable and never exposes a path or false success',
  async (code, message) => {
    vi.mocked(exportChapter).mockRejectedValueOnce({
      code,
      message: 'C:\\private\\secret.sqlite3',
    })
    host()
    await userEvent.click(button())
    expect(screen.getByRole('alert')).toHaveTextContent(message)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    expect(screen.queryByText(/secret/)).not.toBeInTheDocument()
    vi.mocked(exportChapter).mockResolvedValueOnce({
      status: 'exported',
      fileName: 'new.txt',
      revision: 4,
    })
    await userEvent.click(button())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      copy.exported('new.txt'),
    )
  },
)

test('disabled rows cannot open the system dialog', async () => {
  host(true)
  fireEvent.click(button())
  expect(exportChapter).not.toHaveBeenCalled()
})

test('unmounted exports do not publish late success or call a stale parent', async () => {
  let finish!: (value: ChapterExportResult) => void
  vi.mocked(exportChapter).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  const { unmount } = host()
  await userEvent.click(button())
  unmount()
  await act(async () =>
    finish({ status: 'exported', fileName: 'saved.txt', revision: 4 }),
  )
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(onPending.mock.calls).toEqual([[true]])
})
