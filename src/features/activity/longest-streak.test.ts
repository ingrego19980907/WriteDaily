import { expect, test } from 'vitest'
import { isLongestStreak } from './longest-streak'

const value = {
  today: '2026-10-28',
  bookId: null,
  days: 2,
  exact: true,
  historyStartDate: '2026-10-01',
  startDate: '2026-10-25',
  endDate: '2026-10-26',
}
test('accepts recorded maxima, lower bounds and honest empty history', () => {
  expect(isLongestStreak(value)).toBe(true)
  expect(isLongestStreak({ ...value, exact: false })).toBe(true)
  expect(
    isLongestStreak({
      ...value,
      days: 0,
      historyStartDate: null,
      startDate: null,
      endDate: null,
    }),
  ).toBe(true)
})
test.each([
  null,
  {},
  { ...value, days: -1 },
  { ...value, days: 1.5 },
  { ...value, days: Number.MAX_SAFE_INTEGER + 1 },
  { ...value, days: 3 },
  { ...value, exact: 'yes' },
  { ...value, today: '2026-02-29' },
  { ...value, bookId: 'bad' },
  { ...value, historyStartDate: null },
  { ...value, startDate: '2026-09-30' },
  { ...value, endDate: '2026-10-29' },
  { ...value, startDate: null },
  { ...value, days: 0 },
  {
    ...value,
    days: 0,
    startDate: null,
    endDate: null,
    historyStartDate: null,
    exact: false,
  },
])('rejects malformed/inconsistent native longest record %#', (data) => {
  expect(isLongestStreak(data)).toBe(false)
})
