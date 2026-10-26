import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Editor } from '@tiptap/core'
import { afterEach, expect, test } from 'vitest'
import { en } from '../../app/i18n/en'
import { FormattingToolbar } from './FormattingToolbar'
import { chapterExtensions, serializeEditorDocument } from './editor-schema'

const copy = en.writing
const editors: Editor[] = []
afterEach(() => {
  for (const editor of editors.splice(0)) editor.destroy()
})
function setup() {
  const editor = new Editor({
    extensions: chapterExtensions(),
    content: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Alpha beta' }] },
      ],
    },
  })
  editors.push(editor)
  const view = render(<FormattingToolbar editor={editor} disabled={false} />)
  const toolbar = within(screen.getByRole('toolbar', { name: copy.toolbar }))
  return { editor, toolbar, view }
}

test('reports active block, selection marks and unavailable history from editor transactions', () => {
  const { editor, toolbar } = setup()
  expect(toolbar.getByRole('button', { name: copy.paragraph })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  expect(toolbar.getByRole('button', { name: copy.undo })).toBeDisabled()
  expect(toolbar.getByRole('button', { name: copy.redo })).toBeDisabled()
  act(() => {
    editor.commands.setTextSelection({ from: 1, to: 6 })
    editor.commands.toggleBold()
  })
  expect(toolbar.getByRole('button', { name: copy.bold })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  act(() => {
    editor.commands.setTextSelection({ from: 7, to: 11 })
  })
  expect(toolbar.getByRole('button', { name: copy.bold })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
})

test('pointer activation formats exactly the retained text selection with both marks', () => {
  const { editor, toolbar } = setup()
  act(() => {
    editor.commands.setTextSelection({ from: 1, to: 6 })
  })
  fireEvent.mouseDown(toolbar.getByRole('button', { name: copy.bold }), {
    button: 0,
  })
  fireEvent.click(toolbar.getByRole('button', { name: copy.bold }))
  fireEvent.click(toolbar.getByRole('button', { name: copy.italic }))
  const text = editor.getJSON().content?.[0].content
  expect(text?.[0]).toMatchObject({ text: 'Alpha' })
  expect(text?.[0].marks?.map((mark) => mark.type).sort()).toEqual([
    'bold',
    'italic',
  ])
  expect(text?.[1]).toEqual({ type: 'text', text: ' beta' })
  expect(serializeEditorDocument(editor.getJSON())).not.toBeNull()
})

test('all supported headings, paragraph and lists preserve text and remain serializable', () => {
  const { editor, toolbar } = setup()
  for (const level of [1, 2, 3, 4, 5, 6]) {
    fireEvent.click(toolbar.getByRole('button', { name: copy.heading(level) }))
    expect(editor.isActive('heading', { level })).toBe(true)
    expect(
      toolbar.getByRole('button', { name: copy.heading(level) }),
    ).toHaveAttribute('aria-pressed', 'true')
  }
  fireEvent.click(toolbar.getByRole('button', { name: copy.paragraph }))
  expect(editor.isActive('paragraph')).toBe(true)
  fireEvent.click(toolbar.getByRole('button', { name: copy.bulletList }))
  expect(editor.isActive('bulletList')).toBe(true)
  fireEvent.click(toolbar.getByRole('button', { name: copy.orderedList }))
  expect(editor.isActive('orderedList')).toBe(true)
  expect(editor.state.doc.textContent).toBe('Alpha beta')
  expect(serializeEditorDocument(editor.getJSON())).not.toBeNull()
})

test('undo and redo follow available history and restore formatting', () => {
  const { editor, toolbar } = setup()
  act(() => {
    editor.commands.setTextSelection({ from: 1, to: 6 })
  })
  fireEvent.click(toolbar.getByRole('button', { name: copy.bold }))
  expect(toolbar.getByRole('button', { name: copy.undo })).toBeEnabled()
  fireEvent.click(toolbar.getByRole('button', { name: copy.undo }))
  expect(editor.isActive('bold')).toBe(false)
  expect(toolbar.getByRole('button', { name: copy.redo })).toBeEnabled()
  fireEvent.click(toolbar.getByRole('button', { name: copy.redo }))
  expect(editor.isActive('bold')).toBe(true)
})

test('arrow/Home/End navigation provides one Tab stop and skips unavailable history', async () => {
  const user = userEvent.setup()
  const { toolbar } = setup()
  await user.tab()
  expect(toolbar.getByRole('button', { name: copy.bold })).toHaveFocus()
  await user.keyboard('{End}')
  expect(toolbar.getByRole('button', { name: copy.orderedList })).toHaveFocus()
  await user.keyboard('{ArrowRight}')
  expect(toolbar.getByRole('button', { name: copy.bold })).toHaveFocus()
  await user.keyboard('{ArrowRight}')
  expect(toolbar.getByRole('button', { name: copy.italic })).toHaveFocus()
  await user.keyboard('{Home}')
  expect(toolbar.getByRole('button', { name: copy.bold })).toHaveFocus()
  expect(
    toolbar.getAllByRole('button').filter((button) => button.tabIndex === 0),
  ).toHaveLength(1)
})

test('disabled or read-only editors reject formatting without changing text', () => {
  const { editor, toolbar, view } = setup()
  const before = editor.getJSON()
  view.rerender(<FormattingToolbar editor={editor} disabled />)
  for (const button of toolbar.getAllByRole('button'))
    expect(button).toBeDisabled()
  view.rerender(<FormattingToolbar editor={editor} disabled={false} />)
  act(() => {
    editor.setEditable(false, false)
  })
  fireEvent.click(toolbar.getByRole('button', { name: copy.bold }))
  expect(editor.getJSON()).toEqual(before)
})
