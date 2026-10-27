import { act, fireEvent, render, screen } from '@testing-library/react'
import { Editor } from '@tiptap/core'
import { afterEach, expect, test } from 'vitest'
import { FontFamilyControl } from './FontFamilyControl'
import { chapterExtensions, serializeEditorDocument } from './editor-schema'
import { FONT_FAMILIES } from './font-families'

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
  const view = render(<FontFamilyControl editor={editor} disabled={false} />)
  const select = screen.getByRole('combobox', {
    name: 'Manuscript font family',
  })
  return { editor, select, view }
}

test('offers twenty unique named families and restores a captured selection only once', () => {
  const { editor, select } = setup()
  expect(FONT_FAMILIES).toHaveLength(20)
  expect(new Set(FONT_FAMILIES.map((font) => font.name)).size).toBe(20)
  expect(
    screen
      .getAllByRole('option')
      .filter((option) => !(option as HTMLOptionElement).disabled),
  ).toHaveLength(20)
  act(() => {
    editor.commands.setTextSelection({ from: 1, to: 6 })
    editor.commands.toggleBold()
    editor.commands.setMark('fontSize', { size: 24 })
  })
  fireEvent.focus(select)
  act(() => {
    editor.commands.setTextSelection(11)
  })
  fireEvent.change(select, { target: { value: 'Arial' } })
  const text = serializeEditorDocument(editor.getJSON())!.document.content[0]
  expect(text).toMatchObject({
    content: [
      {
        text: 'Alpha',
        marks: expect.arrayContaining([
          { type: 'bold' },
          { type: 'fontSize', attrs: { size: 24 } },
          { type: 'fontFamily', attrs: { family: 'Arial' } },
        ]),
      },
      { type: 'text', text: ' beta' },
    ],
  })
  act(() => {
    editor.commands.setTextSelection(11)
    editor.commands.toggleItalic()
  })
  fireEvent.change(select, { target: { value: 'Consolas' } })
  act(() => {
    editor.commands.insertContent(' next')
  })
  const nodes = editor.getJSON().content?.[0].content
  expect(nodes?.at(-1)).toMatchObject({
    text: ' next',
    marks: expect.arrayContaining([
      { type: 'italic' },
      { type: 'fontFamily', attrs: { family: 'Consolas' } },
    ]),
  })
  expect(nodes?.[0]).toMatchObject({ text: 'Alpha' })
  expect(serializeEditorDocument(editor.getJSON())!.schemaVersion).toBe(5)
})

test('mixed selection is explicit and disabled/read-only edits cannot change writing', () => {
  const { editor, select, view } = setup()
  act(() => {
    editor.commands.setTextSelection({ from: 1, to: 6 })
    editor.commands.setMark('fontFamily', { family: 'Arial' })
    editor.commands.selectAll()
  })
  expect(select).toHaveValue('')
  const before = editor.getJSON()
  view.rerender(<FontFamilyControl editor={editor} disabled />)
  expect(select).toBeDisabled()
  fireEvent.change(select, { target: { value: 'Calibri' } })
  expect(editor.getJSON()).toEqual(before)
  view.rerender(<FontFamilyControl editor={editor} disabled={false} />)
  act(() => {
    editor.setEditable(false, false)
  })
  fireEvent.change(select, { target: { value: 'Calibri' } })
  expect(editor.getJSON()).toEqual(before)
})
