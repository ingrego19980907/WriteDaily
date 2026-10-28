import { expect, test } from 'vitest'
import {
  isCurrentStreak,
  isStreakRequest,
  type CurrentStreak,
} from './current-streak'

function valid(): CurrentStreak {
  return {
    today: '2026-10-28',
    bookId: null,
    days: 3,
    exact: true,
    todayState: 'pending',
    todayCreditedWords: 50,
    startDate: '2026-10-25',
    lastCompletedDate: '2026-10-27',
    boundary: 'missed_day',
  }
}
test('validates exact, lower-bound, zero and empty-history outcomes without turning uncertainty into zero', () => {
  expect(isCurrentStreak(valid())).toBe(true)
  expect(
    isCurrentStreak({ ...valid(), exact: false, boundary: 'unknown_day' }),
  ).toBe(true)
  expect(
    isCurrentStreak({ ...valid(), exact: false, boundary: 'history_start' }),
  ).toBe(true)
  expect(
    isCurrentStreak({
      ...valid(),
      days: 0,
      startDate: null,
      lastCompletedDate: null,
    }),
  ).toBe(true)
  expect(
    isCurrentStreak({
      ...valid(),
      days: 0,
      exact: false,
      boundary: 'unknown_day',
      startDate: null,
      lastCompletedDate: null,
    }),
  ).toBe(true)
  expect(
    isCurrentStreak({
      ...valid(),
      days: 0,
      boundary: 'empty_history',
      todayState: 'unknown',
      todayCreditedWords: 0,
      startDate: null,
      lastCompletedDate: null,
    }),
  ).toBe(true)
})
test.each([
  { days: -1 },
  { days: 1.5 },
  { days: Number.MAX_SAFE_INTEGER + 1 },
  { days: 4 },
  { today: '2026-02-29' },
  { bookId: 'forged' },
  { exact: false },
  { boundary: 'bad' },
  { todayState: {} },
  { boundary: {} },
  { todayCreditedWords: null },
  { todayState: 'reached' },
  { lastCompletedDate: '2026-10-29' },
  { startDate: '2026-10-28' },
  { days: 0 },
  { boundary: 'empty_history' },
])('rejects inconsistent native result %j', (change) =>
  expect(isCurrentStreak({ ...valid(), ...change })).toBe(false),
)
test('request validates canonical date/scope and treats missing scope distinctly from global null', () => {
  expect(isStreakRequest({ today: '0001-01-01', bookId: null })).toBe(true)
  expect(
    isStreakRequest({
      today: '9999-12-31',
      bookId: '00000000-0000-4000-8000-000000000001',
    }),
  ).toBe(true)
  expect(isStreakRequest({ today: '2026-10-28' })).toBe(false)
  expect(isStreakRequest({ today: '2026-1-01', bookId: null })).toBe(false)
})
