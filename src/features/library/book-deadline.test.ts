import { expect, test } from 'vitest'
import { calculateBookDeadline } from './book-deadline'

test('none, unknown, today, future and past deadlines are distinct', () => {
  expect(calculateBookDeadline(null, '2026-10-27')).toEqual({ kind: 'none' })
  expect(calculateBookDeadline(undefined, '2026-10-27')).toEqual({
    kind: 'unknown',
  })
  expect(calculateBookDeadline('2026-02-29', '2026-10-27')).toEqual({
    kind: 'unknown',
  })
  expect(calculateBookDeadline('2026-10-27', null)).toEqual({ kind: 'unknown' })
  expect(calculateBookDeadline('2026-10-27', '2026-10-27')).toEqual({
    kind: 'today',
    date: '2026-10-27',
    days: 0,
  })
  expect(calculateBookDeadline('2026-10-29', '2026-10-27')).toEqual({
    kind: 'upcoming',
    date: '2026-10-29',
    days: 2,
  })
  expect(calculateBookDeadline('2026-10-26', '2026-10-27')).toEqual({
    kind: 'overdue',
    date: '2026-10-26',
    days: 1,
  })
})
test('completion makes the deadline informational without inventing a completion date', () => {
  expect(calculateBookDeadline('2026-10-26', '2026-10-27', true)).toEqual({
    kind: 'completed',
    date: '2026-10-26',
  })
  expect(calculateBookDeadline(null, '2026-10-27', true)).toEqual({
    kind: 'none',
  })
})
test('calendar arithmetic spans DST, leap days and supported year bounds', () => {
  expect(calculateBookDeadline('2026-03-30', '2026-03-29')).toMatchObject({
    kind: 'upcoming',
    days: 1,
  })
  expect(calculateBookDeadline('2026-10-25', '2026-10-26')).toMatchObject({
    kind: 'overdue',
    days: 1,
  })
  expect(calculateBookDeadline('2024-03-01', '2024-02-28')).toMatchObject({
    days: 2,
  })
  expect(calculateBookDeadline('9999-12-31', '0001-01-01')).toMatchObject({
    kind: 'upcoming',
    days: 3652058,
  })
})
