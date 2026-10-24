import { expect, test } from 'vitest'
import { BOOK_TITLE_MAX_LENGTH, validateBookDetails } from './book'
import cases from '../../../tests/fixtures/book-details.json'

test.each(cases)(
  'shared Rust/TypeScript contract: $name',
  ({ input, expected }) => {
    expect(validateBookDetails(input)).toEqual(expected)
  },
)

test('normalizes editable metadata and leaves unset goals/date null', () => {
  expect(validateBookDetails({ title: '  A story  ' })).toEqual({
    success: true,
    data: {
      title: 'A story',
      targetWordCount: null,
      dailyWordGoal: null,
      deadline: null,
    },
  })
})

test('preserves Unicode, normalizes equivalent text and counts code points', () => {
  const title = 'Cafe\u0301 ' + '📖'.repeat(BOOK_TITLE_MAX_LENGTH - 5)
  const result = validateBookDetails({ title })
  expect(result.success).toBe(true)
  if (result.success) {
    expect(result.data.title).toBe(
      'Café ' + '📖'.repeat(BOOK_TITLE_MAX_LENGTH - 5),
    )
  }
  expect(validateBookDetails({ title: 'Моя історія' }).success).toBe(true)
})

test.each([
  [{}, 'required'],
  [{ title: ' \t\n ' }, 'required'],
  [{ title: 123 }, 'invalid_type'],
  [{ title: 'First\nSecond' }, 'invalid_title'],
  [{ title: 'a'.repeat(BOOK_TITLE_MAX_LENGTH + 1) }, 'too_long'],
])('rejects invalid title metadata %j', (input, code) => {
  expect(validateBookDetails(input)).toEqual({
    success: false,
    issues: [{ field: 'title', code }],
  })
})

test.each([null, undefined, [], 'A story'])(
  'rejects a non-record draft %j',
  (input) => {
    expect(validateBookDetails(input)).toEqual({
      success: false,
      issues: [{ field: 'form', code: 'invalid_type' }],
    })
  },
)

test.each(['targetWordCount', 'dailyWordGoal'] as const)(
  'validates %s as a nullable positive safe integer',
  (field) => {
    for (const value of [
      0,
      -1,
      1.5,
      NaN,
      Infinity,
      Number.MAX_SAFE_INTEGER + 1,
      '1000',
      '',
    ]) {
      expect(validateBookDetails({ title: 'Story', [field]: value })).toEqual({
        success: false,
        issues: [{ field, code: 'invalid_count' }],
      })
    }
    for (const value of [1, 50000, Number.MAX_SAFE_INTEGER, null]) {
      const result = validateBookDetails({ title: 'Story', [field]: value })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data[field]).toBe(value)
    }
  },
)

test.each([
  '2028-02-29',
  '2000-02-29',
  '2026-10-24',
  '2001-01-01',
  '9999-12-31',
])('accepts a real calendar date %s, including overdue dates', (deadline) => {
  const result = validateBookDetails({ title: 'Story', deadline })
  expect(result.success).toBe(true)
  if (result.success) expect(result.data.deadline).toBe(deadline)
})

test.each([
  '2026-02-29',
  '1900-02-29',
  '2026-04-31',
  '2026-00-01',
  '2026-13-01',
  '2026-01-00',
  '0000-01-01',
  '2026-1-01',
  '2026-10-24T00:00:00Z',
  '',
  ' 2026-10-24 ',
  123,
])('rejects invalid calendar deadline %j', (deadline) => {
  expect(validateBookDetails({ title: 'Story', deadline })).toEqual({
    success: false,
    issues: [{ field: 'deadline', code: 'invalid_date' }],
  })
})

test('reports independent errors together without returning partially valid metadata', () => {
  expect(
    validateBookDetails({
      title: '',
      targetWordCount: 0,
      dailyWordGoal: -1,
      deadline: 'invalid',
    }),
  ).toEqual({
    success: false,
    issues: [
      { field: 'title', code: 'required' },
      { field: 'targetWordCount', code: 'invalid_count' },
      { field: 'dailyWordGoal', code: 'invalid_count' },
      { field: 'deadline', code: 'invalid_date' },
    ],
  })
})

test('does not mutate the input or accept persistence-owned fields into editable metadata', () => {
  const input = Object.freeze({
    title: '  Story  ',
    id: 'external',
    coverPath: 'blob:temporary',
    createdAt: 'external',
  })
  const result = validateBookDetails(input)
  expect(result).toEqual({
    success: true,
    data: {
      title: 'Story',
      targetWordCount: null,
      dailyWordGoal: null,
      deadline: null,
    },
  })
  expect(input.title).toBe('  Story  ')
})
