import { expect, test } from 'vitest'
import { aggregateBookWordCount } from './book-word-count'
const row = (id: string, wordCount: unknown, bookId = 'book') => ({
  id,
  wordCount,
  bookId,
})

test('empty books are zero, chapters sum independently, and membership changes replace rather than add totals', () => {
  expect(aggregateBookWordCount('book', [])).toBe(0)
  expect(aggregateBookWordCount('book', [row('a', 7), row('b', 3)])).toBe(10)
  expect(aggregateBookWordCount('book', [row('a', 2), row('b', 3)])).toBe(5)
  expect(aggregateBookWordCount('book', [row('b', 3)])).toBe(3)
  expect(aggregateBookWordCount('book', [row('a', 0)])).toBe(0)
})

test.each([
  null,
  undefined,
  -1,
  1.5,
  NaN,
  Infinity,
  '10',
  Number.MAX_SAFE_INTEGER + 1,
])(
  'unknown/invalid chapter count %s never becomes a partial total',
  (count) => {
    expect(
      aggregateBookWordCount('book', [row('a', 7), row('b', count)]),
    ).toBeNull()
  },
)

test('rejects wrong-book snapshots, duplicate chapters, malformed inputs and unsafe totals', () => {
  expect(aggregateBookWordCount('book', [row('a', 2, 'other')])).toBeNull()
  expect(aggregateBookWordCount('book', [row('a', 2), row('a', 3)])).toBeNull()
  for (const input of [null, {}, [null], [{}]])
    expect(aggregateBookWordCount('book', input)).toBeNull()
  expect(
    aggregateBookWordCount('book', [row('a', Number.MAX_SAFE_INTEGER)]),
  ).toBe(Number.MAX_SAFE_INTEGER)
  expect(
    aggregateBookWordCount('book', [
      row('a', Number.MAX_SAFE_INTEGER),
      row('b', 1),
    ]),
  ).toBeNull()
})
