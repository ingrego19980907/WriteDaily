import { expect, test } from 'vitest'
import {
  activityMonth,
  adjacentActivityMonth,
  activityIntensity,
  activityMonthSummary,
  formatActivityMonth,
} from './activity-calendar'
import { activityFixture } from '../../../tests/fixtures/activity-data'

test('months use civil Gregorian dates including leap years and Monday-first offsets', () => {
  expect(activityMonth('2024-02')).toMatchObject({
    startDate: '2024-02-01',
    endDate: '2024-02-29',
    leading: 3,
  })
  expect(activityMonth('1900-02')?.days).toHaveLength(28)
  expect(activityMonth('2000-02')?.days).toHaveLength(29)
  expect(activityMonth('0001-01')?.leading).toBe(0)
  expect(activityMonth('9999-12')?.endDate).toBe('9999-12-31')
  expect(formatActivityMonth('0001-01')).toBe('January 1')
  for (const value of ['', '2026-1', '0000-01', '10000-01', '2026-13', 'bad'])
    expect(activityMonth(value)).toBeNull()
})
test('month navigation handles year rollover and supported bounds', () => {
  expect(adjacentActivityMonth('2026-12', 1)).toBe('2027-01')
  expect(adjacentActivityMonth('2027-01', -1)).toBe('2026-12')
  expect(adjacentActivityMonth('0001-01', -1)).toBeNull()
  expect(adjacentActivityMonth('9999-12', 1)).toBeNull()
  expect(adjacentActivityMonth('bad', 1)).toBeNull()
})
test('intensity uses fixed word thresholds independently of goals or the month maximum', () => {
  expect(
    [0, 1, 249, 250, 499, 500, 999, 1000, 9000].map(activityIntensity),
  ).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4])
})
test('month summary counts positive-credit days and rejects unsafe cumulative totals', () => {
  const days = activityFixture({
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    bookId: null,
  }).days
  expect(activityMonthSummary(days)).toEqual({
    creditedWords: 1905,
    activeDays: 4,
  })
  const large = days.map((day, index) =>
    index < 2
      ? { ...day, creditedWords: Number.MAX_SAFE_INTEGER, active: true }
      : day,
  )
  expect(activityMonthSummary(large).creditedWords).toBeNull()
})
