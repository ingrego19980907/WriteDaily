import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { en } from '../../app/i18n/en'
import {
  createChapter,
  deleteChapter,
  getChapter,
  listChapters,
  renameChapter,
  reorderChapters,
} from '../../services/chapters'
import { createEmptyChapterContent } from './chapter-content'
import type { Chapter, ChapterSummary } from './chapter'
import type { Book } from '../library/book'
import { ChapterManager } from './ChapterManager'

vi.mock('../../services/chapters', () => ({
  createChapter: vi.fn(),
  deleteChapter: vi.fn(),
  getChapter: vi.fn(),
  listChapters: vi.fn(),
  renameChapter: vi.fn(),
  reorderChapters: vi.fn(),
}))
const copy = en.chapters
const book: Book = {
  id: 'book-one',
  title: 'A story',
  targetWordCount: null,
  dailyWordGoal: null,
  deadline: null,
  coverPath: null,
  completedAt: null,
  createdAt: '2026-10-25T10:00:00.000Z',
  updatedAt: '2026-10-25T10:00:00.000Z',
}
const first: ChapterSummary = {
  id: 'first',
  bookId: book.id,
  title: 'Same title',
  position: 0,
  revision: 1,
  wordCount: null,
  createdAt: book.createdAt,
  updatedAt: book.updatedAt,
}
const second: ChapterSummary = { ...first, id: 'second', position: 1 }
const full = (chapter: ChapterSummary): Chapter => ({
  ...chapter,
  content: createEmptyChapterContent(),
})
const mount = () => render(<ChapterManager book={book} onBack={vi.fn()} />)
const row = (index: number) =>
  within(screen.getByRole('list', { name: copy.heading })).getAllByRole(
    'listitem',
  )[index]
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(listChapters).mockResolvedValue([first, second])
})

test('loading and failure never claim an empty collection; retry enables creation after success', async () => {
  const user = userEvent.setup()
  let reject!: (error: unknown) => void
  vi.mocked(listChapters)
    .mockReturnValueOnce(
      new Promise((_, fail) => {
        reject = fail
      }),
    )
    .mockResolvedValueOnce([])
  mount()
  expect(screen.getByText(copy.loading)).toBeVisible()
  expect(screen.queryByText(copy.empty)).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: copy.create })).toBeDisabled()
  await act(async () => reject({ code: 'persistence' }))
  expect(screen.getByRole('alert')).toHaveTextContent(copy.loadFailure)
  expect(screen.queryByText(copy.empty)).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: copy.retry }))
  expect(await screen.findByText(copy.empty)).toBeVisible()
  expect(screen.getByRole('button', { name: copy.create })).toBeEnabled()
})

test('creation validates Unicode title, retains a closed draft and waits for commit before success', async () => {
  const user = userEvent.setup()
  let commit!: (chapter: Chapter) => void
  vi.mocked(createChapter).mockReturnValue(
    new Promise((resolve) => {
      commit = resolve
    }),
  )
  const created = { ...first, id: 'new', title: 'Розділ é', position: 2 }
  vi.mocked(listChapters)
    .mockResolvedValueOnce([first, second])
    .mockResolvedValueOnce([first, second, created])
  mount()
  await screen.findByRole('list')
  await user.click(screen.getByRole('button', { name: copy.create }))
  let dialog = within(screen.getByRole('dialog'))
  await user.click(dialog.getByRole('button', { name: copy.create }))
  expect(dialog.getByRole('textbox')).toHaveFocus()
  expect(dialog.getByRole('textbox')).toHaveAccessibleDescription(
    expect.stringContaining(copy.errors.required),
  )
  expect(createChapter).not.toHaveBeenCalled()
  await user.type(dialog.getByRole('textbox'), '  Розділ e\u0301  ')
  await user.keyboard('{Escape}')
  await user.click(screen.getByRole('button', { name: copy.create }))
  dialog = within(screen.getByRole('dialog'))
  expect(dialog.getByRole('textbox')).toHaveValue('  Розділ e\u0301  ')
  await user.click(dialog.getByRole('button', { name: copy.create }))
  expect(createChapter).toHaveBeenCalledWith(book.id, { title: 'Розділ é' })
  expect(
    screen.queryByText(copy.created(created.title)),
  ).not.toBeInTheDocument()
  await user.keyboard('{Escape}')
  expect(screen.getByRole('dialog')).toBeVisible()
  await act(async () => commit(full(created)))
  expect(await screen.findByText(copy.created(created.title))).toBeVisible()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('rename targets the selected duplicate ID and changes only title using its revision', async () => {
  const user = userEvent.setup()
  const renamed = { ...second, title: 'Changed', revision: 2 }
  vi.mocked(renameChapter).mockResolvedValue(full(renamed))
  vi.mocked(listChapters)
    .mockResolvedValueOnce([first, second])
    .mockResolvedValueOnce([first, renamed])
  mount()
  await screen.findByRole('list')
  await user.click(within(row(1)).getByRole('button', { name: copy.rename }))
  const dialog = within(screen.getByRole('dialog'))
  await user.clear(dialog.getByRole('textbox'))
  await user.type(dialog.getByRole('textbox'), 'Changed')
  await user.click(dialog.getByRole('button', { name: copy.save }))
  await screen.findByText(copy.renamed('Changed'))
  expect(renameChapter).toHaveBeenCalledWith(book.id, second.id, {
    expectedRevision: 1,
    details: { title: 'Changed' },
  })
  expect(within(row(0)).getByRole('heading')).toHaveTextContent('Same title')
  expect(within(row(1)).getByRole('heading')).toHaveTextContent('Changed')
})

test('rename conflict reloads only the revision and preserves the draft for an explicit retry', async () => {
  const user = userEvent.setup()
  vi.mocked(renameChapter)
    .mockRejectedValueOnce({ code: 'conflict' })
    .mockResolvedValueOnce(full({ ...second, title: 'My draft', revision: 6 }))
  vi.mocked(getChapter).mockResolvedValue(
    full({ ...second, title: 'External title', revision: 5 }),
  )
  mount()
  await screen.findByRole('list')
  await user.click(within(row(1)).getByRole('button', { name: copy.rename }))
  const dialog = within(screen.getByRole('dialog'))
  await user.clear(dialog.getByRole('textbox'))
  await user.type(dialog.getByRole('textbox'), 'My draft')
  await user.click(dialog.getByRole('button', { name: copy.save }))
  expect(await dialog.findByRole('alert')).toHaveTextContent(copy.conflict)
  expect(dialog.getByRole('button', { name: copy.save })).toBeDisabled()
  await user.click(dialog.getByRole('button', { name: copy.reload }))
  expect(dialog.getByRole('textbox')).toHaveValue('My draft')
  await user.click(dialog.getByRole('button', { name: copy.save }))
  expect(renameChapter).toHaveBeenLastCalledWith(book.id, second.id, {
    expectedRevision: 5,
    details: { title: 'My draft' },
  })
})

test('native validation links the title error and focuses the enabled field without dropping the draft', async () => {
  const user = userEvent.setup()
  vi.mocked(createChapter).mockRejectedValue({
    code: 'validation',
    reason: 'too_long',
  })
  mount()
  await screen.findByRole('list')
  await user.click(screen.getByRole('button', { name: copy.create }))
  const dialog = within(screen.getByRole('dialog'))
  await user.type(dialog.getByRole('textbox'), 'Kept draft')
  await user.click(dialog.getByRole('button', { name: copy.create }))
  await waitFor(() => expect(dialog.getByRole('textbox')).toHaveFocus())
  expect(dialog.getByRole('textbox')).toHaveValue('Kept draft')
  expect(dialog.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
  expect(dialog.getByRole('textbox')).toHaveAccessibleDescription(
    expect.stringContaining(copy.errors.too_long),
  )
})

test('deletion is cancelled safely, requires confirmation and preserves rows while commit is pending', async () => {
  const user = userEvent.setup()
  let commit!: (remaining: ChapterSummary[]) => void
  vi.mocked(deleteChapter).mockReturnValue(
    new Promise((resolve) => {
      commit = resolve
    }),
  )
  mount()
  await screen.findByRole('list')
  await user.click(within(row(1)).getByRole('button', { name: copy.delete }))
  let dialog = within(screen.getByRole('dialog'))
  expect(dialog.getByRole('button', { name: copy.cancel })).toHaveFocus()
  expect(dialog.getByRole('button', { name: copy.delete })).toBeDisabled()
  await user.keyboard('{Escape}')
  expect(deleteChapter).not.toHaveBeenCalled()
  await user.click(within(row(1)).getByRole('button', { name: copy.delete }))
  dialog = within(screen.getByRole('dialog'))
  expect(dialog.getByRole('checkbox')).not.toBeChecked()
  await user.click(dialog.getByRole('checkbox'))
  await user.click(dialog.getByRole('button', { name: copy.delete }))
  expect(deleteChapter).toHaveBeenCalledTimes(1)
  expect(deleteChapter).toHaveBeenCalledWith(book.id, second.id, 1)
  expect(screen.queryByText(copy.deleted(second.title))).not.toBeInTheDocument()
  await user.keyboard('{Escape}')
  expect(screen.getByRole('dialog')).toBeVisible()
  await act(async () => commit([first]))
  expect(await screen.findByText(copy.deleted(second.title))).toBeVisible()
  expect(
    within(screen.getByRole('list')).getAllByRole('listitem'),
  ).toHaveLength(1)
  await waitFor(() =>
    expect(screen.getByRole('heading', { name: copy.heading })).toHaveFocus(),
  )
})

test('deletion conflict requires fresh details and a new acknowledgement before retry', async () => {
  const user = userEvent.setup()
  vi.mocked(deleteChapter)
    .mockRejectedValueOnce({ code: 'conflict' })
    .mockResolvedValueOnce([first])
  vi.mocked(getChapter).mockResolvedValue(
    full({ ...second, title: 'Changed externally', revision: 8 }),
  )
  mount()
  await screen.findByRole('list')
  await user.click(within(row(1)).getByRole('button', { name: copy.delete }))
  const dialog = within(screen.getByRole('dialog'))
  await user.click(dialog.getByRole('checkbox'))
  await user.click(dialog.getByRole('button', { name: copy.delete }))
  expect(await dialog.findByRole('alert')).toHaveTextContent(
    copy.deleteConflict,
  )
  expect(dialog.getByRole('checkbox')).not.toBeChecked()
  await user.click(dialog.getByRole('button', { name: copy.reloadDelete }))
  expect(await dialog.findByText('Changed externally')).toBeVisible()
  expect(dialog.getByRole('button', { name: copy.delete })).toBeDisabled()
  await user.click(dialog.getByRole('checkbox'))
  await user.click(dialog.getByRole('button', { name: copy.delete }))
  expect(deleteChapter).toHaveBeenLastCalledWith(book.id, second.id, 8)
})

test('failed writes and read refresh keep committed rows and distinguish load failure from empty', async () => {
  const user = userEvent.setup()
  vi.mocked(deleteChapter).mockRejectedValueOnce({ code: 'persistence' })
  vi.mocked(listChapters)
    .mockResolvedValueOnce([first, second])
    .mockRejectedValueOnce({ code: 'persistence' })
  mount()
  await screen.findByRole('list')
  await user.click(within(row(0)).getByRole('button', { name: copy.delete }))
  const dialog = within(screen.getByRole('dialog'))
  await user.click(dialog.getByRole('checkbox'))
  await user.click(dialog.getByRole('button', { name: copy.delete }))
  expect(await dialog.findByRole('alert')).toHaveTextContent(copy.deleteFailure)
  expect(dialog.getByRole('checkbox')).not.toBeChecked()
  await user.keyboard('{Escape}')
  await user.click(screen.getByRole('button', { name: copy.refresh }))
  expect(await screen.findByRole('alert')).toHaveTextContent(copy.loadFailure)
  expect(
    within(screen.getByRole('list')).getAllByRole('listitem'),
  ).toHaveLength(2)
  expect(screen.getByRole('button', { name: copy.create })).toBeDisabled()
  expect(screen.queryByText(copy.empty)).not.toBeInTheDocument()
})

test('old book responses cannot replace a newly mounted book collection', async () => {
  let resolve!: (chapters: ChapterSummary[]) => void
  vi.mocked(listChapters)
    .mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      }),
    )
    .mockResolvedValueOnce([])
  const view = render(
    <ChapterManager key={book.id} book={book} onBack={vi.fn()} />,
  )
  view.rerender(
    <ChapterManager
      key="new-book"
      book={{ ...book, id: 'new-book' }}
      onBack={vi.fn()}
    />,
  )
  await screen.findByText(copy.empty)
  await act(async () => resolve([first]))
  expect(screen.queryByRole('list')).not.toBeInTheDocument()
  expect(listChapters).toHaveBeenLastCalledWith('new-book')
})

test('a committed creation remains visible if the following list refresh fails', async () => {
  const user = userEvent.setup()
  const created = {
    ...first,
    id: 'committed',
    title: 'Committed chapter',
    position: 2,
  }
  vi.mocked(createChapter).mockResolvedValue(full(created))
  vi.mocked(listChapters)
    .mockResolvedValueOnce([first, second])
    .mockRejectedValueOnce({ code: 'persistence' })
  mount()
  await screen.findByRole('list')
  await user.click(screen.getByRole('button', { name: copy.create }))
  const dialog = within(screen.getByRole('dialog'))
  await user.type(dialog.getByRole('textbox'), created.title)
  await user.click(dialog.getByRole('button', { name: copy.create }))
  expect(await screen.findByText(copy.created(created.title))).toBeVisible()
  expect(await screen.findByRole('alert')).toHaveTextContent(copy.loadFailure)
  expect(screen.getByRole('heading', { name: created.title })).toBeVisible()
  expect(screen.getByRole('button', { name: copy.create })).toBeDisabled()
  expect(screen.queryByText(copy.empty)).not.toBeInTheDocument()
})

test.each(['desktop_required', 'invalid_stored_data'])(
  '%s cannot turn failed reads into an editable empty library',
  async (code) => {
    vi.mocked(listChapters).mockRejectedValue({ code })
    mount()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      code === 'desktop_required' ? copy.desktop : copy.storedFailure,
    )
    expect(screen.queryByText(copy.empty)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: copy.create })).toBeDisabled()
    if (code === 'desktop_required')
      expect(
        screen.queryByRole('button', { name: copy.retry }),
      ).not.toBeInTheDocument()
  },
)

test('opening an untouched rename form uses a newly loaded title and position revision', async () => {
  const user = userEvent.setup()
  const latest = { ...second, title: 'Latest title', revision: 8 }
  vi.mocked(listChapters)
    .mockResolvedValueOnce([first, second])
    .mockResolvedValue([first, latest])
  vi.mocked(renameChapter).mockResolvedValue(
    full({ ...latest, title: 'New title', revision: 9 }),
  )
  mount()
  await screen.findByRole('list')
  await user.click(screen.getByRole('button', { name: copy.refresh }))
  await screen.findByRole('heading', { name: latest.title })
  await user.click(within(row(1)).getByRole('button', { name: copy.rename }))
  const dialog = within(screen.getByRole('dialog'))
  expect(dialog.getByRole('textbox')).toHaveValue(latest.title)
  await user.clear(dialog.getByRole('textbox'))
  await user.type(dialog.getByRole('textbox'), 'New title')
  await user.click(dialog.getByRole('button', { name: copy.save }))
  expect(renameChapter).toHaveBeenCalledWith(book.id, second.id, {
    expectedRevision: 8,
    details: { title: 'New title' },
  })
})

test('reorder waits for commit, serializes moves and uses the full revision vector', async () => {
  const user = userEvent.setup()
  let commit!: (rows: ChapterSummary[]) => void
  vi.mocked(reorderChapters).mockReturnValue(
    new Promise((resolve) => {
      commit = resolve
    }),
  )
  mount()
  await screen.findByRole('list')
  const originalFirst = row(0)
  const originalSecond = row(1)
  expect(
    within(originalFirst).getByRole('button', {
      name: copy.moveUp(first.title),
    }),
  ).toBeDisabled()
  await user.click(
    within(originalFirst).getByRole('button', {
      name: copy.moveDown(first.title),
    }),
  )
  expect(reorderChapters).toHaveBeenCalledWith(book.id, {
    expected: [
      { id: first.id, revision: 1 },
      { id: second.id, revision: 1 },
    ],
    chapterIds: [second.id, first.id],
  })
  expect(row(0)).toBe(originalFirst)
  expect(screen.queryByText(copy.orderSaved)).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: copy.refresh })).toBeDisabled()
  await user.click(
    within(originalSecond).getByRole('button', {
      name: copy.moveUp(second.title),
    }),
  )
  expect(reorderChapters).toHaveBeenCalledTimes(1)
  await act(async () =>
    commit([
      { ...second, position: 0, revision: 2 },
      { ...first, position: 1, revision: 2 },
    ]),
  )
  expect(row(0)).toBe(originalSecond)
  expect(screen.getByText(copy.orderSaved)).toBeVisible()
  await waitFor(() =>
    expect(within(originalFirst).getByRole('heading')).toHaveFocus(),
  )
})

test.each(['conflict', 'persistence'])(
  'failed reorder keeps rows and reload permits retry: %s',
  async (code) => {
    const user = userEvent.setup()
    vi.mocked(reorderChapters).mockRejectedValue({ code })
    mount()
    await screen.findByRole('list')
    const originalFirst = row(0)
    await user.click(
      within(originalFirst).getByRole('button', {
        name: copy.moveDown(first.title),
      }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      code === 'conflict' ? copy.orderConflict : copy.orderFailure,
    )
    expect(row(0)).toBe(originalFirst)
    expect(screen.queryByText(copy.orderSaved)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: copy.refresh }))
    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument(),
    )
    expect(listChapters).toHaveBeenCalledTimes(2)
  },
)

test('dragging the handle submits an ID permutation; dropping on the same row is a no-op', async () => {
  vi.mocked(reorderChapters).mockResolvedValue([
    { ...second, position: 0 },
    { ...first, position: 1 },
  ])
  mount()
  await screen.findByRole('list')
  const originalFirst = row(0)
  const originalSecond = row(1)
  const dataTransfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' }
  fireEvent.dragStart(within(originalFirst).getByTitle(copy.dragChapter), {
    dataTransfer,
  })
  fireEvent.drop(originalFirst, { dataTransfer })
  expect(reorderChapters).not.toHaveBeenCalled()
  fireEvent.dragStart(within(originalFirst).getByTitle(copy.dragChapter), {
    dataTransfer,
  })
  fireEvent.dragOver(originalSecond, { dataTransfer })
  fireEvent.drop(originalSecond, { dataTransfer })
  await waitFor(() => expect(row(0)).toBe(originalSecond))
  expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', first.id)
})
