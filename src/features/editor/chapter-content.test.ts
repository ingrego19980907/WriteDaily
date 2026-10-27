import { expect, test } from 'vitest'
import {
  CHAPTER_CONTENT_MAX_BYTES,
  CHAPTER_CONTENT_MAX_DEPTH,
  CHAPTER_CONTENT_MAX_NODES,
  createEmptyChapterContent,
  validateChapterContent,
} from './chapter-content'

const content = (blocks: unknown[]) => ({
  schemaVersion: 1,
  document: { type: 'doc', content: blocks },
})
const paragraph = (text = 'Моя історія') => ({
  type: 'paragraph',
  content: [{ type: 'text', text }],
})

test('creation returns independent empty documents; empty input is never silently repaired', () => {
  const first = createEmptyChapterContent()
  const second = createEmptyChapterContent()
  expect(first).toEqual(second)
  expect(first.document.content).not.toBe(second.document.content)
  expect(validateChapterContent(first)).toEqual({ success: true, data: first })
  expect(validateChapterContent(content([]))).toEqual({
    success: false,
    code: 'invalid_document',
  })
})
test('preserves writing, whitespace, decomposed Unicode, literal HTML and marks without normalization or sanitization', () => {
  const text = '  Cafe\u0301\n\t<em>текст</em> 📖  '
  const input = content([
    {
      type: 'paragraph',
      content: [
        { type: 'text', text, marks: [{ type: 'bold' }, { type: 'italic' }] },
        { type: 'hardBreak', marks: [{ type: 'italic' }] },
      ],
    },
  ])
  const result = validateChapterContent(input)
  expect(result).toEqual({ success: true, data: input })
  if (result.success) {
    expect(result.data).not.toBe(input)
    expect(JSON.stringify(result.data)).toContain('Cafe\u0301')
  }
})
test('supports headings and nested lists with leading paragraphs and ordered-list attributes', () => {
  const input = content([
    {
      type: 'heading',
      attrs: { level: 6 },
      content: [{ type: 'text', text: 'Heading' }],
    },
    {
      type: 'orderedList',
      attrs: { start: 3, type: 'I' },
      content: [
        {
          type: 'listItem',
          content: [
            paragraph(),
            {
              type: 'bulletList',
              content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }],
            },
          ],
        },
      ],
    },
  ])
  expect(validateChapterContent(input)).toEqual({ success: true, data: input })
})
test.each([null, undefined, '', [], 42])(
  'non-object content %j is rejected',
  (value) => {
    expect(validateChapterContent(value)).toEqual({
      success: false,
      code: 'invalid_type',
    })
  },
)
test.each([undefined, null, 0, 6, '1'])(
  'unsupported content version %s is preserved as an error, not downgraded',
  (schemaVersion) => {
    expect(
      validateChapterContent({
        schemaVersion,
        document: { type: 'doc', content: [{ type: 'paragraph' }] },
      }),
    ).toEqual({ success: false, code: 'unsupported_version' })
  },
)
test.each([
  [{ type: 'text', text: 'not a block' }],
  [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }],
  [{ type: 'paragraph', content: [{ type: 'text', text: '\ud800' }] }],
  [{ type: 'paragraph', attrs: { arbitrary: 'do not discard' } }],
  [{ type: 'image', attrs: { src: 'https://example.com/image.png' } }],
  [
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Link',
          marks: [{ type: 'link', attrs: { href: 'javascript:bad' } }],
        },
      ],
    },
  ],
  [
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'A',
          marks: [{ type: 'bold' }, { type: 'bold' }],
        },
      ],
    },
  ],
  [{ type: 'heading', attrs: { level: 7 } }],
  [{ type: 'heading', attrs: { level: '1' } }],
  [{ type: 'bulletList', content: [] }],
  [{ type: 'bulletList', content: [paragraph()] }],
  [{ type: 'listItem', content: [paragraph()] }],
  [
    {
      type: 'orderedList',
      attrs: { start: 0 },
      content: [{ type: 'listItem', content: [paragraph()] }],
    },
  ],
  [
    {
      type: 'orderedList',
      attrs: { start: 1, type: 'unknown' },
      content: [{ type: 'listItem', content: [paragraph()] }],
    },
  ],
  [
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [{ type: 'heading', attrs: { level: 1 } }],
        },
      ],
    },
  ],
  [{ type: null }],
])('invalid tree %j is rejected without modifying it', (blocks) => {
  const input = content([blocks])
  const before = JSON.stringify(input)
  expect(validateChapterContent(input)).toEqual({
    success: false,
    code: 'invalid_document',
  })
  expect(JSON.stringify(input)).toBe(before)
})
test('rejects cycles, sparse arrays and custom serialization rather than dropping content', () => {
  const list: { type: string; content: unknown[] } = {
    type: 'bulletList',
    content: [],
  }
  list.content.push({ type: 'listItem', content: [paragraph(), list] })
  expect(validateChapterContent(content([list]))).toEqual({
    success: false,
    code: 'invalid_document',
  })
  expect(validateChapterContent(content(new Array(1)))).toEqual({
    success: false,
    code: 'invalid_document',
  })
  const node = paragraph()
  Object.defineProperty(node, 'toJSON', {
    value: () => ({ type: 'paragraph' }),
  })
  expect(validateChapterContent(content([node]))).toEqual({
    success: false,
    code: 'invalid_document',
  })
})
test('enforces byte size including JSON overhead and Unicode, without truncation', () => {
  expect(
    validateChapterContent(
      content([paragraph('a'.repeat(CHAPTER_CONTENT_MAX_BYTES))]),
    ),
  ).toEqual({ success: false, code: 'too_large' })
  expect(
    validateChapterContent(
      content([paragraph('📖'.repeat(CHAPTER_CONTENT_MAX_BYTES / 4))]),
    ),
  ).toEqual({ success: false, code: 'too_large' })
})
test('limits nested depth and node count before unsafe recursion or serialization', () => {
  let block: unknown = paragraph()
  for (let i = 0; i < CHAPTER_CONTENT_MAX_DEPTH; i += 1)
    block = {
      type: 'bulletList',
      content: [{ type: 'listItem', content: [paragraph(), block] }],
    }
  expect(validateChapterContent(content([block]))).toEqual({
    success: false,
    code: 'too_deep',
  })
  expect(
    validateChapterContent(
      content(
        Array.from({ length: CHAPTER_CONTENT_MAX_NODES }, () => ({
          type: 'paragraph',
        })),
      ),
    ),
  ).toEqual({ success: false, code: 'too_large' })
})
