import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Editor } from '@tiptap/core'
import { beforeEach, expect, test, vi } from 'vitest'
import { en } from '../../app/i18n/en'
import { getChapter, saveChapterContent } from '../../services/chapters'
import { protectWritingClose } from '../../services/writing-close'
import { ChapterEditorDialog } from './ChapterEditorDialog'
import type { Chapter } from './chapter'
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
const mount = (onSaved = vi.fn()) =>
  render(
    <ChapterEditorDialog
      bookId="book"
      chapter={chapter}
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
