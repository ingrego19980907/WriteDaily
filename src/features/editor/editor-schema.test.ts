import { Editor, getSchema } from '@tiptap/core'
import { expect, test } from 'vitest'
import cases from '../../../tests/fixtures/chapter-content.json'
import {
  chapterExtensions,
  contentBoundary,
  prepareEditorDocument,
  serializeEditorDocument,
} from './editor-schema'

test.each(cases)(
  'installed editor schema matches the persisted contract: $name',
  ({ input, valid }) => {
    const document = prepareEditorDocument(input)
    expect(Boolean(document)).toBe(valid)
    if (!document) return
    const editor = new Editor({
      extensions: chapterExtensions(),
      content: document,
      enableContentCheck: true,
    })
    try {
      expect(serializeEditorDocument(editor.getJSON())).not.toBeNull()
      // Opening saved JSON must not append a paragraph or alter any writing.
      expect(editor.getJSON()).toEqual(document)
      expect(
        prepareEditorDocument(serializeEditorDocument(editor.getJSON())),
      ).toEqual(document)
      if (
        input.document?.content[0]?.type === 'paragraph' &&
        'content' in input.document.content[0]
      ) {
        expect(editor.state.doc.textContent).toBe(
          input.document.content[0].content
            ?.map((node) => ('text' in node ? node.text : ''))
            .join('') ?? '',
        )
      }
    } finally {
      editor.destroy()
    }
  },
)

test('schema contains only the v1 nodes and marks', () => {
  const schema = getSchema(chapterExtensions())
  expect(Object.keys(schema.nodes).sort()).toEqual(
    [
      'doc',
      'paragraph',
      'heading',
      'bulletList',
      'orderedList',
      'listItem',
      'text',
      'hardBreak',
    ].sort(),
  )
  expect(Object.keys(schema.marks).sort()).toEqual(['bold', 'italic'])
})

test('real rich-text transactions serialize supported formatting and undo without changing Unicode', () => {
  const editor = new Editor({
    extensions: chapterExtensions(),
    content: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Україна é 🖋' }] },
      ],
    },
  })
  try {
    editor.commands.selectAll()
    editor.commands.toggleBold()
    editor.commands.toggleItalic()
    const formatted = editor.getJSON()
    expect(
      formatted.content?.[0].content?.[0].marks
        ?.map((mark) => mark.type)
        .sort(),
    ).toEqual(['bold', 'italic'])
    expect(serializeEditorDocument(formatted)).not.toBeNull()
    expect(editor.state.doc.textContent).toBe('Україна é 🖋')
    editor.commands.undo()
    expect(serializeEditorDocument(editor.getJSON())).not.toBeNull()
  } finally {
    editor.destroy()
  }
})

test('a transaction outside the content bounds is rejected visibly and leaves existing writing intact', () => {
  let rejected = 0
  const editor = new Editor({
    extensions: [
      ...chapterExtensions(),
      contentBoundary(() => {
        rejected += 1
      }),
    ],
    content: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Keep this' }] },
      ],
    },
  })
  try {
    const before = editor.getJSON()
    editor.view.dispatch(
      editor.state.tr.insertText('x'.repeat(5 * 1024 * 1024), 1),
    )
    expect(rejected).toBe(1)
    expect(editor.getJSON()).toEqual(before)
  } finally {
    editor.destroy()
  }
})
