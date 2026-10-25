import { expect, test } from 'vitest'
import { CHAPTER_TITLE_MAX_LENGTH, validateChapterDetails } from './chapter'

test('normalizes metadata without including persistence-owned or writing fields', () => {
  const input = {
    title: '  Cafe\u0301 — розділ  ',
    id: 'forged',
    bookId: 'other',
    position: 99,
    revision: 1,
    wordCount: 100,
    content: 'do not copy',
  }
  expect(validateChapterDetails(input)).toEqual({
    success: true,
    data: { title: 'Café — розділ' },
  })
  expect(input.title).toBe('  Cafe\u0301 — розділ  ')
})
test('title limit counts Unicode code points rather than UTF-16 units', () => {
  expect(
    validateChapterDetails({ title: '📖'.repeat(CHAPTER_TITLE_MAX_LENGTH) })
      .success,
  ).toBe(true)
  expect(
    validateChapterDetails({
      title: '📖'.repeat(CHAPTER_TITLE_MAX_LENGTH + 1),
    }),
  ).toEqual({ success: false, issues: [{ field: 'title', code: 'too_long' }] })
})
test.each([
  [null, 'form', 'invalid_type'],
  [[], 'form', 'invalid_type'],
  ['text', 'form', 'invalid_type'],
  [{}, 'title', 'required'],
  [{ title: null }, 'title', 'required'],
  [{ title: ' \t\n' }, 'title', 'required'],
  [{ title: 1 }, 'title', 'invalid_type'],
  [{ title: 'a\nb' }, 'title', 'invalid_title'],
  [{ title: 'a\u0000b' }, 'title', 'invalid_title'],
  [{ title: '\ud800' }, 'title', 'invalid_title'],
] as const)(
  'invalid chapter metadata %j has a typed issue',
  (input, field, code) => {
    expect(validateChapterDetails(input)).toEqual({
      success: false,
      issues: [{ field, code }],
    })
  },
)
