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
  toolbar.getByRole('button', { name: copy.bold }).focus()
  expect(toolbar.getByRole('button', { name: copy.bold })).toHaveFocus()
  await user.keyboard('{End}')
  expect(toolbar.getByRole('button', { name: copy.heading(6) })).toHaveFocus()
  await user.keyboard('{ArrowRight}')
  expect(toolbar.getByRole('button', { name: copy.bulletList })).toHaveFocus()
  await user.keyboard('{ArrowRight}')
  expect(toolbar.getByRole('button', { name: copy.orderedList })).toHaveFocus()
  await user.keyboard('{Home}')
  expect(toolbar.getByRole('button', { name: copy.bulletList })).toHaveFocus()
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

test('underline applies only to selection and subsequent typing in compact mode', () => {
  const { editor, view } = setup()
  view.rerender(<FormattingToolbar editor={editor} disabled={false} compact />)
  const underline = screen.getByRole('button', { name: copy.underline })
  act(() => {
    editor.commands.setTextSelection({ from: 1, to: 6 })
  })
  fireEvent.click(underline)
  expect(editor.getJSON().content?.[0].content?.[0]).toMatchObject({
    text: 'Alpha',
    marks: [{ type: 'underline' }],
  })
  expect(editor.getJSON().content?.[0].content?.[1]).toEqual({
    type: 'text',
    text: ' beta',
  })
  expect(serializeEditorDocument(editor.getJSON())?.schemaVersion).toBe(3)
  act(() => {
    editor.commands.setTextSelection(11)
  })
  fireEvent.click(underline)
  act(() => {
    editor.commands.insertContent(' next')
  })
  expect(editor.getJSON().content?.[0].content?.at(-1)).toMatchObject({
    text: ' next',
    marks: [{ type: 'underline' }],
  })
})

test('compact H1 through H4 change block style and retain writing', () => {
  const { editor, view } = setup()
  view.rerender(<FormattingToolbar compact editor={editor} disabled={false} />)
  for (const level of [1, 2, 3, 4]) {
    const button = screen.getByRole('button', {
      name: `H${level}`,
    })
    fireEvent.click(button)
    expect(editor.isActive('heading', { level })).toBe(true)
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(editor.state.doc.textContent).toBe('Alpha beta')
    expect(serializeEditorDocument(editor.getJSON())).not.toBeNull()
  }
  expect(screen.queryByRole('button', { name: 'H5' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'H4' }))
  expect(editor.isActive('paragraph')).toBe(true)
})

test('compact alignment changes selected blocks only and persists with headings and marks', () => {
  const { editor, view } = setup()
  act(() => {
    editor.commands.setContent({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Alpha' }] },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Beta' }],
        },
        { type: 'paragraph', content: [{ type: 'text', text: 'Gamma' }] },
      ],
    })
  })
  view.rerender(<FormattingToolbar compact editor={editor} disabled={false} />)
  act(() => {
    editor.commands.setTextSelection({ from: 1, to: 10 })
  })
  for (const [value, name] of [
    ['center', 'Align center'],
    ['right', 'Align right'],
    ['justify', 'Justify'],
    ['left', 'Align left'],
  ]) {
    fireEvent.click(screen.getByRole('button', { name }))
    const content = serializeEditorDocument(editor.getJSON())!
    expect(content.schemaVersion).toBe(4)
    expect(content.document.content[0]).toMatchObject({
      attrs: { textAlign: value },
    })
    expect(content.document.content[1]).toMatchObject({
      attrs: { level: 2, textAlign: value },
    })
    expect(content.document.content[2]).not.toHaveProperty('attrs')
    expect(editor.state.doc.textContent).toBe('AlphaBetaGamma')
  }
})
