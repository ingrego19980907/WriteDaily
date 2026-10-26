import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Editor } from '@tiptap/core'
import { beforeEach, expect, test, vi } from 'vitest'
import { en } from '../../app/i18n/en'
import { getChapter, saveChapterContent } from '../../services/chapters'
import { protectWritingClose } from '../../services/writing-close'
import { ChapterEditorDialog } from './ChapterEditorDialog'
import type { Chapter, ChapterSummary } from './chapter'
import { createEmptyChapterContent } from './chapter-content'

vi.mock('../../services/chapters', () => ({
  getChapter: vi.fn(),
  saveChapterContent: vi.fn(),
}))
vi.mock('../../services/writing-close', () => ({
  protectWritingClose: vi.fn(),
}))
const copy = en.writing
const chapter: Chapter = {
  id: 'chapter',
  bookId: 'book',
  title: 'A chapter',
  position: 0,
  revision: 4,
  wordCount: null,
  createdAt: '2026-10-25T10:00:00.000Z',
  updatedAt: '2026-10-25T10:00:00.000Z',
  content: createEmptyChapterContent(),
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getChapter).mockResolvedValue(chapter)
  vi.mocked(protectWritingClose).mockResolvedValue(vi.fn())
})
const mount = (onSaved = vi.fn(), chapters?: ChapterSummary[]) =>
  render(
    <ChapterEditorDialog
      bookId="book"
      chapter={chapter}
      chapters={chapters}
      disabled={false}
      onPending={vi.fn()}
      onSaved={onSaved}
    />,
  )
async function open() {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: en.chapters.open }))
  const field = await screen.findByRole('textbox', { name: copy.label })
  await waitFor(() => expect(field).toHaveAttribute('contenteditable', 'true'))
  return {
    user,
    field,
    editor: (field as HTMLElement & { editor: Editor }).editor,
  }
}

test('loads by identity and saves validated real editor JSON only after a committed result', async () => {
  let commit!: (chapter: Chapter) => void
  vi.mocked(saveChapterContent).mockReturnValue(
    new Promise((resolve) => {
      commit = resolve
    }),
  )
  const onSaved = vi.fn()
  mount(onSaved)
  const { user, field, editor } = await open()
  expect(getChapter).toHaveBeenCalledWith('book', 'chapter')
  expect(screen.getByRole('button', { name: copy.save })).toBeDisabled()
  act(() => {
    editor.commands.insertContent({ type: 'text', text: '  Україна é <tag>  ' })
  })
  await user.click(screen.getByRole('button', { name: copy.save }))
  expect(saveChapterContent).toHaveBeenCalledWith('book', 'chapter', {
    expectedRevision: 4,
    content: expect.objectContaining({ schemaVersion: 1 }),
  })
  expect(field).toHaveAttribute('contenteditable', 'false')
  expect(screen.queryByText(copy.saved)).not.toBeInTheDocument()
  await user.keyboard('{Escape}')
  expect(screen.getByRole('dialog')).toBeVisible()
  await act(async () => commit({ ...chapter, revision: 5 }))
  expect(await screen.findByText(copy.saved)).toBeVisible()
  expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ revision: 5 }))
  expect(editor.state.doc.textContent).toBe('  Україна é <tag>  ')
  act(() => {
    editor.commands.insertContent({ type: 'text', text: 'next' })
  })
  vi.mocked(saveChapterContent).mockResolvedValue({ ...chapter, revision: 6 })
  await user.click(screen.getByRole('button', { name: copy.save }))
  expect(saveChapterContent).toHaveBeenLastCalledWith(
    'book',
    'chapter',
    expect.objectContaining({ expectedRevision: 5 }),
  )
})

test.each(['persistence', 'conflict', 'not_found', 'invalid_stored_data'])(
  '%s retains writing and unsaved-close protection',
  async (code) => {
    vi.mocked(saveChapterContent).mockRejectedValue({ code })
    mount()
    const { user, editor } = await open()
    act(() => {
      editor.commands.insertContent({ type: 'text', text: 'Keep my writing' })
    })
    await user.click(screen.getByRole('button', { name: copy.save }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      code === 'conflict'
        ? copy.conflict
        : code === 'not_found'
          ? copy.missing
          : code === 'invalid_stored_data'
            ? copy.storedFailure
            : copy.failure,
    )
    expect(editor.state.doc.textContent).toBe('Keep my writing')
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeVisible()
    expect(screen.getByRole('alert')).toHaveTextContent(copy.unsaved)
    expect(screen.getByRole('button', { name: copy.discard })).toBeDisabled()
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: copy.discard }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  },
)

test('beforeunload/native close guards retain dirty writing and clean up after explicit discard', async () => {
  const cleanup = vi.fn()
  vi.mocked(protectWritingClose).mockResolvedValue(cleanup)
  mount()
  const { user, editor } = await open()
  const [shouldBlock, onBlocked] = vi.mocked(protectWritingClose).mock.calls[0]
  expect(shouldBlock()).toBe(false)
  act(() => {
    editor.commands.insertContent({ type: 'text', text: 'Not saved' })
  })
  expect(shouldBlock()).toBe(true)
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  expect(event.defaultPrevented).toBe(true)
  act(() => onBlocked())
  expect(screen.getByRole('alert')).toHaveTextContent(copy.unsaved)
  await user.click(screen.getByRole('checkbox'))
  await user.click(screen.getByRole('button', { name: copy.discard }))
  expect(cleanup).toHaveBeenCalledOnce()
})

test('guard registration failure never enables writing', async () => {
  vi.mocked(protectWritingClose).mockRejectedValue(new Error('permission'))
  mount()
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: en.chapters.open }))
  expect(await screen.findByRole('alert')).toHaveTextContent(copy.guardFailure)
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  expect(saveChapterContent).not.toHaveBeenCalled()
})

test.each(['unsupported', 'missing'])(
  'a %s saved document is not replaced by an empty editor',
  async (kind) => {
    if (kind === 'unsupported')
      vi.mocked(getChapter).mockResolvedValue({
        ...chapter,
        content: { ...chapter.content, schemaVersion: 2 },
      } as unknown as Chapter)
    else vi.mocked(getChapter).mockRejectedValue({ code: 'not_found' })
    mount()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: en.chapters.open }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      kind === 'unsupported' ? copy.invalid : copy.loadFailure,
    )
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(saveChapterContent).not.toHaveBeenCalled()
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: copy.close,
      }),
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  },
)

const second: Chapter = {
  ...chapter,
  id: 'second',
  position: 1,
  revision: 9,
  content: {
    schemaVersion: 1,
    document: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Second chapter text' }],
        },
      ],
    },
  },
}

test('navigation commits dirty writing before reading the target and restores it on return', async () => {
  let commit!: (value: Chapter) => void
  vi.mocked(getChapter)
    .mockResolvedValueOnce(chapter)
    .mockResolvedValueOnce(second)
  vi.mocked(saveChapterContent).mockReturnValue(
    new Promise((resolve) => {
      commit = resolve
    }),
  )
  const onSaved = vi.fn()
  mount(onSaved, [chapter, second])
  const { user, editor } = await open()
  act(() => {
    editor.commands.insertContent({ type: 'text', text: 'My first draft' })
  })
  await user.click(screen.getByRole('button', { name: copy.nextChapter }))
  expect(getChapter).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('textbox')).toHaveAttribute(
    'contenteditable',
    'false',
  )
  expect(screen.getByRole('combobox')).toBeDisabled()
  const change = vi.mocked(saveChapterContent).mock.calls[0][2]
  const committed = { ...chapter, revision: 5, content: change.content }
  await act(async () => commit(committed))
  await waitFor(() =>
    expect(screen.getByRole('textbox')).toHaveTextContent(
      'Second chapter text',
    ),
  )
  expect(getChapter).toHaveBeenLastCalledWith(chapter.bookId, second.id)
  expect(onSaved).toHaveBeenCalledWith(committed)
  await waitFor(() =>
    expect(screen.getByRole('heading', { name: chapter.title })).toHaveFocus(),
  )
  vi.mocked(getChapter).mockResolvedValueOnce(committed)
  await user.click(screen.getByRole('button', { name: copy.previousChapter }))
  await waitFor(() =>
    expect(screen.getByRole('textbox')).toHaveTextContent('My first draft'),
  )
  expect(saveChapterContent).toHaveBeenCalledTimes(1)
})

test.each(['persistence', 'conflict'])(
  'a %s save failure cancels navigation and preserves the same editor',
  async (code) => {
    vi.mocked(saveChapterContent).mockRejectedValue({ code })
    mount(vi.fn(), [chapter, second])
    const { user, editor } = await open()
    act(() => {
      editor.commands.insertContent({ type: 'text', text: 'Keep this draft' })
    })
    await user.selectOptions(screen.getByRole('combobox'), second.id)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      code === 'conflict' ? copy.conflict : copy.failure,
    )
    expect(getChapter).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('combobox')).toHaveValue(chapter.id)
    expect(screen.getByRole('textbox')).toHaveTextContent('Keep this draft')
    expect(
      (screen.getByRole('textbox') as HTMLElement & { editor: Editor }).editor,
    ).toBe(editor)
    expect(editor.isDestroyed).toBe(false)
  },
)

test('failed target loading retains the committed current session and retry does not save it twice', async () => {
  vi.mocked(getChapter)
    .mockResolvedValueOnce(chapter)
    .mockRejectedValueOnce({ code: 'persistence' })
    .mockResolvedValueOnce(second)
  vi.mocked(saveChapterContent).mockImplementation(
    async (_book, _id, change) => ({
      ...chapter,
      revision: 5,
      content: change.content,
    }),
  )
  mount(vi.fn(), [chapter, second])
  const { user, editor } = await open()
  act(() => {
    editor.commands.insertContent({
      type: 'text',
      text: 'Saved before failure',
    })
  })
  await user.click(screen.getByRole('button', { name: copy.nextChapter }))
  expect(await screen.findByRole('alert')).toHaveTextContent(copy.switchFailure)
  expect(editor.isDestroyed).toBe(false)
  expect(screen.getByRole('textbox')).toHaveTextContent('Saved before failure')
  await waitFor(() =>
    expect(screen.getByRole('textbox')).toHaveAttribute(
      'contenteditable',
      'true',
    ),
  )
  await user.click(screen.getByRole('button', { name: copy.retryChapter }))
  await waitFor(() =>
    expect(screen.getByRole('textbox')).toHaveTextContent(
      'Second chapter text',
    ),
  )
  expect(saveChapterContent).toHaveBeenCalledTimes(1)
})

test('unsupported target data leaves the current document open instead of creating an empty one', async () => {
  vi.mocked(getChapter)
    .mockResolvedValueOnce(chapter)
    .mockResolvedValueOnce({
      ...second,
      content: { ...second.content, schemaVersion: 99 },
    } as unknown as Chapter)
  mount(vi.fn(), [chapter, second])
  const { user, editor } = await open()
  await user.click(screen.getByRole('button', { name: copy.nextChapter }))
  expect(await screen.findByRole('alert')).toHaveTextContent(copy.invalid)
  expect(
    (screen.getByRole('textbox') as HTMLElement & { editor: Editor }).editor,
  ).toBe(editor)
  expect(screen.getByRole('combobox')).toHaveValue(chapter.id)
  expect(saveChapterContent).not.toHaveBeenCalled()
})

test('rapid navigation requests are serialized while target loading locks current editing', async () => {
  let resolve!: (value: Chapter) => void
  const third = { ...second, id: 'third', position: 2 }
  vi.mocked(getChapter)
    .mockResolvedValueOnce(chapter)
    .mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      }),
    )
  mount(vi.fn(), [chapter, second, third])
  const { user } = await open()
  await user.selectOptions(screen.getByRole('combobox'), second.id)
  expect(screen.getByRole('combobox')).toBeDisabled()
  fireEvent.change(screen.getByRole('combobox'), {
    target: { value: third.id },
  })
  expect(getChapter).toHaveBeenCalledTimes(2)
  expect(getChapter).toHaveBeenLastCalledWith(chapter.bookId, second.id)
  expect(screen.getByRole('textbox')).toHaveAttribute(
    'contenteditable',
    'false',
  )
  await act(async () => resolve(second))
  await waitFor(() =>
    expect(screen.getByRole('combobox')).toHaveValue(second.id),
  )
  expect(screen.getByRole('textbox')).toHaveTextContent('Second chapter text')
})

test('manual-save pending state blocks navigation until its commit finishes', async () => {
  let commit!: (value: Chapter) => void
  vi.mocked(getChapter)
    .mockResolvedValueOnce(chapter)
    .mockResolvedValueOnce(second)
  vi.mocked(saveChapterContent).mockReturnValue(
    new Promise((resolve) => {
      commit = resolve
    }),
  )
  mount(vi.fn(), [chapter, second])
  const { user, editor } = await open()
  act(() => {
    editor.commands.insertContent({ type: 'text', text: 'Pending manual save' })
  })
  await user.click(screen.getByRole('button', { name: copy.save }))
  expect(screen.getByRole('button', { name: copy.nextChapter })).toBeDisabled()
  fireEvent.change(screen.getByRole('combobox'), {
    target: { value: second.id },
  })
  expect(getChapter).toHaveBeenCalledTimes(1)
  await act(async () =>
    commit({
      ...chapter,
      revision: 5,
      content: vi.mocked(saveChapterContent).mock.calls[0][2].content,
    }),
  )
  await user.click(screen.getByRole('button', { name: copy.nextChapter }))
  await waitFor(() =>
    expect(screen.getByRole('textbox')).toHaveTextContent(
      'Second chapter text',
    ),
  )
  expect(saveChapterContent).toHaveBeenCalledTimes(1)
})

test('a late dismissed read cannot replace a freshly reopened chapter', async () => {
  let stale!: (value: Chapter) => void
  vi.mocked(getChapter)
    .mockReturnValueOnce(
      new Promise((done) => {
        stale = done
      }),
    )
    .mockResolvedValueOnce({ ...second, id: chapter.id })
  mount(vi.fn(), [chapter, second])
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: en.chapters.open }))
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: copy.close,
    }),
  )
  await user.click(screen.getByRole('button', { name: en.chapters.open }))
  await screen.findByRole('textbox')
  await act(async () => stale(chapter))
  expect(screen.getByRole('textbox')).toHaveTextContent('Second chapter text')
})
