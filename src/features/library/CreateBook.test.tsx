import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { createBook, setCover, type CoverResult } from '../../services/books'
import { CreateBook } from './CreateBook'
import type { Book } from './book'

vi.mock('../../services/books', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/books')>()),
  createBook: vi.fn(),
  setCover: vi.fn(),
}))
beforeEach(() => {
  vi.mocked(createBook).mockReset()
  vi.mocked(setCover).mockReset()
})

const committedBook: Book = {
  id: 'created-book',
  title: 'New story',
  targetWordCount: 10000,
  dailyWordGoal: 250,
  deadline: '2027-01-01',
  coverPath: null,
  completedAt: null,
  createdAt: '2026-10-29T10:00:00.000Z',
  updatedAt: '2026-10-29T10:00:00.000Z',
}
const coveredBook = {
  ...committedBook,
  coverPath: 'covers/new.png',
  updatedAt: '2026-10-29T10:00:01.000Z',
}
function imageFile() {
  const file = new File(['png'], 'new-cover.png', { type: 'image/png' })
  Object.defineProperty(file, 'arrayBuffer', {
    value: async () => new Uint8Array([137, 80, 78, 71]).buffer,
  })
  return file
}
async function openWithCover(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'New Book' }))
  await user.type(screen.getByLabelText('Book title'), committedBook.title)
  await user.upload(screen.getByLabelText('Cover image'), imageFile())
  return within(screen.getByRole('dialog')).getByRole('button', {
    name: 'Create book',
  })
}

test('saves metadata through the existing API and cover bytes through the committed identity, blocking dismissal until both finish', async () => {
  const user = userEvent.setup()
  const onSaved = vi.fn()
  let resolve!: (result: CoverResult) => void
  vi.mocked(createBook).mockResolvedValue(committedBook)
  vi.mocked(setCover).mockReturnValue(
    new Promise((done) => {
      resolve = done
    }),
  )
  render(<CreateBook onSaved={onSaved} />)
  const submit = await openWithCover(user)
  await user.type(
    screen.getByLabelText('Target word count (optional)'),
    '10000',
  )
  await user.type(screen.getByLabelText('Daily word goal (optional)'), '250')
  await user.type(screen.getByLabelText('Deadline (optional)'), '2027-01-01')
  expect(
    await screen.findByRole('img', { name: 'Unsaved cover preview' }),
  ).toBeVisible()
  expect(setCover).not.toHaveBeenCalled()
  await user.dblClick(submit)
  expect(createBook).toHaveBeenCalledExactlyOnceWith({
    title: 'New story',
    targetWordCount: 10000,
    dailyWordGoal: 250,
    deadline: '2027-01-01',
  })
  expect(setCover).toHaveBeenCalledExactlyOnceWith(
    committedBook.id,
    committedBook.updatedAt,
    [137, 80, 78, 71],
  )
  expect(onSaved).not.toHaveBeenCalled()
  expect(
    screen.queryByText(/Your book was created, but/),
  ).not.toBeInTheDocument()
  expect(screen.getByLabelText('Cover image')).toBeDisabled()
  await user.keyboard('{Escape}')
  await user.click(screen.getByRole('button', { name: 'Close' }))
  expect(screen.getByRole('dialog')).toBeVisible()
  await act(async () => resolve({ book: coveredBook, cleanupPending: true }))
  expect(onSaved).toHaveBeenCalledExactlyOnceWith(coveredBook)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent(
    'Book created: New story',
  )
  expect(screen.getByRole('status')).toHaveTextContent('queued for cleanup')
  await user.click(screen.getByRole('button', { name: 'New Book' }))
  expect(screen.getByLabelText('Book title')).toHaveValue('')
  expect(
    (screen.getByLabelText('Cover image') as HTMLInputElement).files,
  ).toHaveLength(0)
})

test('a failed cover commit retains the already-created book and draft across dismissal, then retries without creating another book', async () => {
  const user = userEvent.setup()
  const onSaved = vi.fn()
  vi.mocked(createBook).mockResolvedValue(committedBook)
  vi.mocked(setCover)
    .mockRejectedValueOnce({ code: 'invalid_image' })
    .mockResolvedValueOnce({ book: coveredBook, cleanupPending: false })
  render(<CreateBook onSaved={onSaved} />)
  await user.click(await openWithCover(user))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Choose a valid PNG',
  )
  expect(screen.getByLabelText('Cover image')).toHaveAttribute(
    'aria-invalid',
    'true',
  )
  expect(screen.getByLabelText('Book title')).toBeDisabled()
  expect(onSaved).toHaveBeenCalledExactlyOnceWith(committedBook)
  expect(
    screen.getByText(/Retrying will not create another book/),
  ).toBeVisible()
  await user.keyboard('{Escape}')
  await user.click(screen.getByRole('button', { name: 'New Book' }))
  expect(screen.getByLabelText('Book title')).toHaveValue('New story')
  expect(
    await screen.findByRole('img', { name: 'Unsaved cover preview' }),
  ).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Retry cover' }))
  expect(createBook).toHaveBeenCalledTimes(1)
  expect(setCover).toHaveBeenCalledTimes(2)
  expect(setCover).toHaveBeenLastCalledWith(
    committedBook.id,
    committedBook.updatedAt,
    [137, 80, 78, 71],
  )
  expect(onSaved).toHaveBeenLastCalledWith(coveredBook)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('finishes an already-created book without a cover after a conflict and starts the next creation with an empty draft', async () => {
  const user = userEvent.setup()
  vi.mocked(createBook).mockResolvedValue(committedBook)
  vi.mocked(setCover).mockRejectedValue({ code: 'conflict' })
  render(<CreateBook />)
  await user.click(await openWithCover(user))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'then open Manage cover',
  )
  await user.click(screen.getByRole('button', { name: 'Finish without cover' }))
  expect(screen.getByRole('status')).toHaveTextContent(
    'Book created: New story',
  )
  expect(createBook).toHaveBeenCalledTimes(1)
  expect(setCover).toHaveBeenCalledTimes(1)
  await user.click(screen.getByRole('button', { name: 'New Book' }))
  expect(screen.getByLabelText('Book title')).toHaveValue('')
  expect(
    screen.queryByRole('button', { name: 'Retry cover' }),
  ).not.toBeInTheDocument()
})

test('invalid, empty and oversized files show linked errors before any creation; removing a draft file performs no persistence', async () => {
  const user = userEvent.setup({ applyAccept: false })
  render(<CreateBook />)
  await user.click(screen.getByRole('button', { name: 'New Book' }))
  await user.type(screen.getByLabelText('Book title'), 'Valid title')
  const picker = screen.getByLabelText('Cover image')
  for (const file of [
    new File(['text'], 'notes.txt', { type: 'text/plain' }),
    new File([], 'empty.png', { type: 'image/png' }),
    new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', {
      type: 'image/png',
    }),
  ]) {
    await user.upload(picker, file)
    expect(picker).toHaveAttribute('aria-invalid', 'true')
    expect(picker).toHaveAccessibleDescription(/Choose/)
    await user.click(screen.getByRole('button', { name: 'Create book' }))
    expect(picker).toHaveFocus()
    expect(createBook).not.toHaveBeenCalled()
  }
  await user.click(screen.getByRole('button', { name: 'Remove cover' }))
  expect(picker).not.toHaveAttribute('aria-invalid')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(setCover).not.toHaveBeenCalled()
})

test('invalid fields show linked errors and do not call persistence', async () => {
  const user = userEvent.setup()
  render(<CreateBook />)
  await user.click(screen.getByRole('button', { name: 'New Book' }))
  await user.type(screen.getByLabelText('Daily word goal (optional)'), '-1')
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Create book',
    }),
  )
  expect(screen.getByLabelText('Book title')).toHaveFocus()
  expect(screen.getByLabelText('Book title')).toHaveAccessibleDescription(
    'Up to 200 characters. Enter a title.',
  )
  expect(screen.getByLabelText('Daily word goal (optional)')).toHaveAttribute(
    'aria-invalid',
    'true',
  )
  expect(createBook).not.toHaveBeenCalled()
})

test('keeps details after dismissal and failed persistence, then normalizes and resets only after success', async () => {
  const user = userEvent.setup()
  vi.mocked(createBook)
    .mockRejectedValueOnce(new Error('disk full'))
    .mockResolvedValueOnce({ title: 'Story' } as Book)
  render(<CreateBook />)
  const trigger = screen.getByRole('button', { name: 'New Book' })
  await user.click(trigger)
  await user.type(screen.getByLabelText('Book title'), '  Story  ')
  await user.keyboard('{Escape}')
  await user.click(trigger)
  expect(screen.getByLabelText('Book title')).toHaveValue('  Story  ')
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Create book',
    }),
  )
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not create')
  expect(screen.getByLabelText('Book title')).toHaveValue('  Story  ')
  expect(screen.getByRole('status', { hidden: true })).toBeEmptyDOMElement()
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Create book',
    }),
  )
  expect(await screen.findByRole('status')).toHaveTextContent(
    'Book created: Story',
  )
  expect(createBook).toHaveBeenLastCalledWith({
    title: 'Story',
    targetWordCount: null,
    dailyWordGoal: null,
    deadline: null,
  })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  await user.click(trigger)
  expect(screen.getByLabelText('Book title')).toHaveValue('')
})

test('blocks duplicate submission and dismissal while a commit is pending', async () => {
  const user = userEvent.setup()
  let resolve!: (value: Book) => void
  vi.mocked(createBook).mockReturnValue(
    new Promise<Book>((done) => {
      resolve = done
    }),
  )
  render(<CreateBook />)
  await user.click(screen.getByRole('button', { name: 'New Book' }))
  await user.type(screen.getByLabelText('Book title'), 'Story')
  await user.dblClick(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Create book',
    }),
  )
  await user.keyboard('{Escape}')
  await user.click(screen.getByRole('button', { name: 'Close' }))
  expect(screen.getByRole('dialog')).toBeVisible()
  expect(screen.getByLabelText('Book title')).toBeDisabled()
  expect(createBook).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('status', { hidden: true })).toBeEmptyDOMElement()
  await act(async () => resolve({ title: 'Story' } as Book))
  expect(screen.getByRole('status')).toHaveTextContent('Book created: Story')
})

test('native field validation links localized errors, focuses the field after pending ends and retains the draft', async () => {
  const user = userEvent.setup()
  vi.mocked(createBook).mockRejectedValue({
    code: 'validation',
    issues: [{ field: 'dailyWordGoal', code: 'invalid_count' }],
  })
  render(<CreateBook />)
  await user.click(screen.getByRole('button', { name: 'New Book' }))
  await user.type(screen.getByLabelText('Book title'), 'Retained draft')
  await user.type(screen.getByLabelText('Daily word goal (optional)'), '500')
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Create book',
    }),
  )
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'highlighted fields',
  )
  const field = screen.getByLabelText('Daily word goal (optional)')
  expect(field).toHaveAttribute('aria-invalid', 'true')
  await vi.waitFor(() => expect(field).toHaveFocus())
  expect(screen.getByLabelText('Book title')).toHaveValue('Retained draft')
  expect(field).toHaveValue('500')
})

test('optional total target validates positive whole words before creating the book', async () => {
  const user = userEvent.setup()
  vi.mocked(createBook).mockResolvedValue({
    title: 'Target book',
    targetWordCount: 1,
  } as Book)
  render(<CreateBook />)
  await user.click(screen.getByRole('button', { name: 'New Book' }))
  await user.type(screen.getByLabelText('Book title'), 'Target book')
  const target = screen.getByLabelText('Target word count (optional)')
  expect(target).toHaveAccessibleDescription(/Leave blank to remove/)
  for (const invalid of ['0', '-1', '1.5', '9007199254740992']) {
    await user.clear(target)
    await user.type(target, invalid)
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Create book',
      }),
    )
    expect(target).toHaveAttribute('aria-invalid', 'true')
    expect(createBook).not.toHaveBeenCalled()
  }
  await user.clear(target)
  await user.type(target, '1')
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Create book',
    }),
  )
  expect(createBook).toHaveBeenCalledWith(
    expect.objectContaining({ targetWordCount: 1 }),
  )
})
