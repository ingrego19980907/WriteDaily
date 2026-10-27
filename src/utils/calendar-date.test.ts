import { expect, test } from 'vitest'
import {
  calendarDayNumber,
  formatCalendarDate,
  isCalendarDate,
  localCalendarDate,
} from './calendar-date'

test.each([
  '0001-01-01',
  '9999-12-31',
  '2000-02-29',
  '2024-02-29',
  '1900-02-28',
])('accepts canonical calendar date %s', (value) =>
  expect(isCalendarDate(value)).toBe(true),
)
test.each([
  '0000-01-01',
  '10000-01-01',
  '1900-02-29',
  '2026-02-29',
  '2026-02-30',
  '2026-13-01',
  '2026-1-01',
  '2026-01-01T00:00:00Z',
  '',
  null,
])('rejects invalid calendar date %s', (value) =>
  expect(isCalendarDate(value)).toBe(false),
)
test.each([
  ['2026-03-29', '2026-03-30'],
  ['2026-10-25', '2026-10-26'],
  ['2024-02-28', '2024-02-29'],
  ['2024-02-29', '2024-03-01'],
  ['2025-12-31', '2026-01-01'],
])('adjacent civil dates %s/%s remain one day apart', (from, to) =>
  expect(calendarDayNumber(to) - calendarDayNumber(from)).toBe(1),
)
test('local calendar fields and display retain the intended day, including early years', () => {
  expect(localCalendarDate(new Date(2026, 9, 27, 23, 59))).toBe('2026-10-27')
  expect(localCalendarDate(new Date(NaN))).toBeNull()
  expect(formatCalendarDate('2024-02-29')).toBe('Feb 29, 2024')
  expect(formatCalendarDate('0001-01-01')).toBe('Jan 1, 1')
})
