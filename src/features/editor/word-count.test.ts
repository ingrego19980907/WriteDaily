import { Editor } from '@tiptap/core'
import { expect, test } from 'vitest'
import textCases from '../../../tests/fixtures/word-count.json'
import documents from '../../../tests/fixtures/word-count-documents.json'
import categories from '../../../resources/unicode/word-categories-17.0.0.json'
import { countChapterWords, countTextWords } from './word-count'
import { chapterExtensions, prepareEditorDocument } from './editor-schema'

test.each(textCases)(
  'shared native/TypeScript word rule: $name',
  ({ text, expected }) => {
    expect(countTextWords(text)).toBe(expected)
    const content = {
      schemaVersion: 1,
      document: {
        type: 'doc',
        content: [
          text
            ? { type: 'paragraph', content: [{ type: 'text', text }] }
            : { type: 'paragraph' },
        ],
      },
    }
    expect(countChapterWords(content)).toBe(expected)
  },
)
test.each(documents)(
  'shared native/TypeScript document rule: $name',
  ({ content, expected }) => {
    const before = JSON.stringify(content)
    expect(countChapterWords(content)).toBe(expected)
    expect(JSON.stringify(content)).toBe(before)
  },
)
test.each([
  null,
  { schemaVersion: 99, document: {} },
  { schemaVersion: 1, document: { type: 'doc', content: [] } },
])('invalid content %j has an unknown count', (input) => {
  expect(countChapterWords(input)).toBeNull()
})
test('bundled Unicode ranges are pinned, sorted and nonoverlapping', () => {
  expect(categories.unicodeVersion).toBe('17.0.0')
  let previous = -1
  for (const [start, end, kind] of categories.ranges) {
    expect(start).toBeGreaterThan(previous)
    expect(end).toBeGreaterThanOrEqual(start)
    expect(end).toBeLessThanOrEqual(0x10ffff)
    expect([1, 2, 3]).toContain(kind)
    previous = end
  }
})
test('real Tiptap formatting and undo cannot alter the word count', () => {
  const editor = new Editor({
    extensions: chapterExtensions(),
    content: prepareEditorDocument(documents[1].content)!,
  })
  const count = () =>
    countChapterWords({ schemaVersion: 1, document: editor.getJSON() })
  try {
    expect(count()).toBe(1)
    editor.commands.selectAll()
    editor.commands.toggleBold()
    editor.commands.toggleItalic()
    editor.commands.toggleHeading({ level: 2 })
    expect(count()).toBe(1)
    editor.commands.undo()
    expect(count()).toBe(1)
  } finally {
    editor.destroy()
  }
})
