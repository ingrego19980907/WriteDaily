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
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { en } from '../../app/i18n/en'
import { getChapter, saveChapterContent } from '../../services/chapters'
import { protectWritingClose } from '../../services/writing-close'
import { ChapterEditorDialog } from './ChapterEditorDialog'
import type { Chapter, ChapterSummary } from './chapter'
import { createEmptyChapterContent } from './chapter-content'
import { countChapterWords } from './word-count'

vi.mock('../../services/chapters', () => ({
  getChapter: vi.fn(),
  saveChapterContent: vi.fn(),
}))
vi.mock('../../services/writing-close', () => ({
  protectWritingClose: vi.fn(),
}))
const copy = en.writing
afterEach(() => vi.useRealTimers())
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

test('live counts include Unicode words while formatting does not split or add words', async () => {
  mount()
  const { editor } = await open()
  const counts = within(screen.getByRole('group', { name: copy.wordCounts }))
  expect(counts.getByText(copy.currentWords('0'))).toBeVisible()
  expect(counts.getByText(copy.savedWordsUnknown)).toBeVisible()
  act(() => {
    editor.commands.insertContent({
      type: 'text',
      text: "п'ять foo-bar 12,500.75 😀 é",
    })
  })
  expect(counts.getByText(copy.currentWords('4'))).toBeVisible()
  act(() => {
    editor.commands.setTextSelection({ from: 1, to: 3 })
    editor.commands.toggleBold()
    editor.commands.toggleItalic()
  })
  expect(counts.getByText(copy.currentWords('4'))).toBeVisible()
  expect(saveChapterContent).not.toHaveBeenCalled()
})

test('saved word count changes only after the corresponding native commit', async () => {
  const loaded = {
    ...chapter,
    wordCount: 2,
    content: {
      schemaVersion: 1,
      document: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'saved words' }],
          },
        ],
      },
    },
  } as Chapter
  vi.mocked(getChapter).mockResolvedValue(loaded)
  let commit!: (chapter: Chapter) => void
  vi.mocked(saveChapterContent).mockReturnValue(
    new Promise((resolve) => {
      commit = resolve
    }),
  )
  mount()
  const { user, editor } = await open()
  const counts = within(screen.getByRole('group', { name: copy.wordCounts }))
  expect(counts.getByText(copy.savedWords('2'))).toBeVisible()
  act(() => {
    editor.commands.insertContentAt(editor.state.doc.content.size - 1, {
      type: 'text',
      text: ' more',
    })
  })
  expect(counts.getByText(copy.currentWords('3'))).toBeVisible()
  await user.click(screen.getByRole('button', { name: copy.save }))
  expect(counts.getByText(copy.savedWords('2'))).toBeVisible()
  const content = vi.mocked(saveChapterContent).mock.calls[0][2].content
  expect(countChapterWords(content)).toBe(3)
  await act(async () =>
    commit({ ...loaded, content, revision: 5, wordCount: 3 }),
  )
  expect(counts.getByText(copy.savedWords('3'))).toBeVisible()
})

test('autosave debounces edits, commits the latest document and reuses the committed revision', async () => {
  vi.mocked(saveChapterContent).mockImplementation(
    async (_book, _id, change) => ({
      ...chapter,
      content: change.content,
      revision: change.expectedRevision + 1,
    }),
  )
  mount()
  const { editor } = await open()
  vi.useFakeTimers()
  const insert = (text: string) =>
    act(() => {
      editor.commands.insertContent({ type: 'text', text })
    })
  insert('first')
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1500)
  })
  expect(saveChapterContent).not.toHaveBeenCalled()
  insert(' latest')
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1999)
  })
  expect(saveChapterContent).not.toHaveBeenCalled()
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1)
  })
  expect(saveChapterContent).toHaveBeenCalledTimes(1)
  expect(
    JSON.stringify(vi.mocked(saveChapterContent).mock.calls[0][2].content),
  ).toContain('first latest')
  insert(' again')
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000)
  })
  expect(saveChapterContent).toHaveBeenLastCalledWith(
    'book',
    'chapter',
    expect.objectContaining({ expectedRevision: 5 }),
  )
  await act(async () => {
    await vi.advanceTimersByTimeAsync(10000)
  })
  expect(saveChapterContent).toHaveBeenCalledTimes(2)
})

test('slow autosave is serialized and cannot announce success or permit close before commit', async () => {
  let commit!: (value: Chapter) => void
  vi.mocked(saveChapterContent).mockReturnValue(
    new Promise((resolve) => {
      commit = resolve
    }),
  )
  mount()
  const { editor, field } = await open()
  vi.useFakeTimers()
  act(() => {
    editor.commands.insertContent({ type: 'text', text: 'pending' })
  })
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000)
  })
  expect(field).toHaveAttribute('contenteditable', 'false')
  fireEvent.click(screen.getByRole('button', { name: copy.saving }))
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
  await act(async () => {
    await vi.advanceTimersByTimeAsync(20000)
  })
  expect(saveChapterContent).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('dialog')).toBeVisible()
  expect(screen.queryByText(copy.saved)).not.toBeInTheDocument()
  await act(async () => {
    commit({ ...chapter, revision: 5 })
  })
  expect(screen.getByText(copy.saved)).toBeVisible()
  expect(field).toHaveAttribute('contenteditable', 'true')
})

test.each(['persistence', 'conflict', 'not_found', 'invalid_stored_data'])(
  'failed automatic %s write pauses timers and retains writing until explicit action',
  async (code) => {
    vi.mocked(saveChapterContent).mockRejectedValueOnce({ code })
    mount()
    const { editor } = await open()
    vi.useFakeTimers()
    act(() => {
      editor.commands.insertContent({ type: 'text', text: 'keep this' })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })
    const alert = screen.getByRole('alert').textContent
    act(() => {
      editor.commands.insertContent({ type: 'text', text: ' and this' })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000)
    })
    expect(saveChapterContent).toHaveBeenCalledTimes(1)
    expect(editor.state.doc.textContent).toBe('keep this and this')
    expect(screen.getByRole('alert')).toHaveTextContent(alert!)
    const button = screen.getByRole('button', { name: copy.save })
    if (code === 'persistence') {
      expect(button).toBeEnabled()
      vi.mocked(saveChapterContent).mockResolvedValue({
        ...chapter,
        revision: 5,
      })
      await act(async () => {
        fireEvent.click(button)
      })
      act(() => {
        editor.commands.insertContent({ type: 'text', text: ' retry resumes' })
      })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000)
      })
      expect(saveChapterContent).toHaveBeenCalledTimes(3)
      expect(saveChapterContent).toHaveBeenLastCalledWith(
        'book',
        'chapter',
        expect.objectContaining({ expectedRevision: 5 }),
      )
    } else expect(button).toBeDisabled()
  },
)

test('manual save consumes a pending debounce and unmount cancels unsent autosaves', async () => {
  vi.mocked(saveChapterContent).mockResolvedValue({ ...chapter, revision: 5 })
  const view = mount()
  const { editor } = await open()
  vi.useFakeTimers()
  act(() => {
    editor.commands.insertContent({ type: 'text', text: 'manual first' })
  })
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: copy.save }))
  })
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000)
  })
  expect(saveChapterContent).toHaveBeenCalledTimes(1)
  act(() => {
    editor.commands.insertContent({ type: 'text', text: ' unsent' })
  })
  view.unmount()
  await act(async () => {
    await vi.advanceTimersByTimeAsync(10000)
  })
  expect(saveChapterContent).toHaveBeenCalledTimes(1)
})

test('save status follows edits and commit, clears pending notices and invalidates success on the next edit', async () => {
  let commit!: (value: Chapter) => void
  vi.mocked(saveChapterContent).mockReturnValue(
    new Promise((resolve) => {
      commit = resolve
    }),
  )
  mount()
  const { editor } = await open()
  const status = screen.getByRole('status', { name: copy.saveStatus })
  expect(status).toHaveTextContent(copy.saveUnchanged)
  expect(status).toHaveAttribute('aria-live', 'polite')
  expect(status).toHaveAttribute('aria-atomic', 'true')
  expect(status).not.toHaveTextContent(copy.saved)
  vi.useFakeTimers()
  act(() => {
    editor.commands.insertContent({ type: 'text', text: 'draft' })
  })
  expect(status).toHaveTextContent(copy.saveWaiting)
  act(() => {
    editor.commands.insertContent({ type: 'text', text: ' more' })
  })
  expect(screen.getByRole('status', { name: copy.saveStatus })).toBe(status)
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000)
  })
  expect(status).toHaveTextContent(copy.saving)
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
  expect(screen.getByRole('alert')).toHaveTextContent(copy.pending)
  expect(status).not.toHaveTextContent(copy.saved)
  await act(async () => {
    commit({ ...chapter, revision: 5 })
  })
  expect(status).toHaveTextContent(copy.saved)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  act(() => {
    editor.commands.insertContent({ type: 'text', text: ' new' })
  })
  expect(status).toHaveTextContent(copy.saveWaiting)
  expect(status).not.toHaveTextContent(copy.saved)
  let fail!: (error: { code: string }) => void
  vi.mocked(saveChapterContent).mockReturnValueOnce(
    new Promise((_resolve, reject) => {
      fail = reject
    }),
  )
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000)
  })
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
  expect(screen.getByRole('alert')).toHaveTextContent(copy.pending)
  await act(async () => {
    fail({ code: 'persistence' })
  })
  expect(status).toHaveTextContent(copy.savePaused)
  expect(screen.getByRole('alert')).toHaveTextContent(copy.failure)
  expect(screen.getByRole('alert')).not.toHaveTextContent(copy.pending)
})

test.each(['persistence', 'conflict', 'not_found', 'invalid_stored_data'])(
  'save status keeps %s errors visible through edits, close attempts and retry',
  async (code) => {
    vi.mocked(saveChapterContent).mockRejectedValueOnce({ code })
    mount()
    const { editor, user } = await open()
    const status = screen.getByRole('status', { name: copy.saveStatus })
    act(() => {
      editor.commands.insertContent({ type: 'text', text: 'retained' })
    })
    await user.click(screen.getByRole('button', { name: copy.save }))
    expect(status).toHaveTextContent(
      code === 'persistence' ? copy.savePaused : copy.saveBlocked,
    )
    const message = screen.getByRole('alert').textContent!
    act(() => {
      editor.commands.insertContent({ type: 'text', text: ' edits' })
    })
    await user.keyboard('{Escape}')
    expect(screen.getByRole('alert')).toHaveTextContent(message)
    expect(screen.getByRole('alert')).toHaveTextContent(copy.unsaved)
    expect(status).not.toHaveTextContent(copy.saved)
    if (code === 'persistence') {
      let commit!: (value: Chapter) => void
      vi.mocked(saveChapterContent).mockReturnValue(
        new Promise((resolve) => {
          commit = resolve
        }),
      )
      await user.click(screen.getByRole('button', { name: copy.save }))
      expect(status).toHaveTextContent(copy.saving)
      expect(screen.getByRole('alert')).toHaveTextContent(message)
      await act(async () => {
        commit({ ...chapter, revision: 5 })
      })
      expect(status).toHaveTextContent(copy.saved)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    } else
      expect(screen.getByRole('button', { name: copy.save })).toBeDisabled()
  },
)

test('save status distinguishes guard preparation from unavailable editing', async () => {
  let reject!: (reason: Error) => void
  vi.mocked(protectWritingClose).mockReturnValue(
    new Promise((_resolve, fail) => {
      reject = fail
    }),
  )
  mount()
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: en.chapters.open }))
  const status = await screen.findByRole('status', { name: copy.saveStatus })
  expect(status).toHaveTextContent(copy.savePreparing)
  await act(async () => {
    reject(new Error('guard unavailable'))
  })
  expect(status).toHaveTextContent(copy.saveUnavailable)
  expect(status).not.toHaveTextContent(copy.saved)
})

test('chapter navigation starts a fresh neutral save status after a committed outgoing edit', async () => {
  vi.mocked(getChapter)
    .mockResolvedValueOnce(chapter)
    .mockResolvedValueOnce(second)
  vi.mocked(saveChapterContent).mockResolvedValue({ ...chapter, revision: 5 })
  mount(vi.fn(), [chapter, second])
  const { user, editor } = await open()
  act(() => {
    editor.commands.insertContent({ type: 'text', text: 'outgoing' })
  })
  await user.click(screen.getByRole('button', { name: copy.save }))
  expect(
    screen.getByRole('status', { name: copy.saveStatus }),
  ).toHaveTextContent(copy.saved)
  await user.click(screen.getByRole('button', { name: copy.nextChapter }))
  await waitFor(() =>
    expect(screen.getByRole('textbox')).toHaveTextContent(
      'Second chapter text',
    ),
  )
  expect(
    screen.getByRole('status', { name: copy.saveStatus }),
  ).toHaveTextContent(copy.saveUnchanged)
})
