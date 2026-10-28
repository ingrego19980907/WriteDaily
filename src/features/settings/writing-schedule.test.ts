import { expect, test } from 'vitest'
import {
  isWritingSchedule,
  scheduledOn,
  countWritingDays,
} from './writing-schedule'
import { calculateWritingPace } from '../library/writing-pace'
import { captureActivityContext } from '../activity/activity-recorder'

const history = [
  { effectiveFrom: '2026-10-23', weekdays: [0, 1, 2, 3, 4, 5, 6] },
  { effectiveFrom: '2026-10-24', weekdays: [1, 2, 3, 4, 5] },
  { effectiveFrom: '2026-10-29', weekdays: [0, 6] },
]
test('effective schedules leave older weekdays unchanged and support paused schedules', () => {
  expect(isWritingSchedule({ revision: 2, history })).toBe(true)
  expect(scheduledOn('2026-10-23', history)).toBe(true)
  expect(scheduledOn('2026-10-24', history)).toBe(false)
  expect(scheduledOn('2026-10-26', history)).toBe(true)
  expect(scheduledOn('2026-10-30', history)).toBe(false)
  expect(scheduledOn('2026-10-31', history)).toBe(true)
  expect(countWritingDays('2026-10-23', '2026-11-01', history)).toBe(6)
  expect(countWritingDays('2026-10-24', '2026-10-25', history)).toBe(0)
  expect(
    countWritingDays('2026-10-28', '2026-11-01', [
      ...history,
      { effectiveFrom: '2026-10-30', weekdays: [] },
    ]),
  ).toBe(1)
})
test('pace counts today under its original schedule and tomorrow under the newly saved one', () => {
  expect(
    calculateWritingPace({
      wordCount: 0,
      targetWordCount: 100,
      deadline: '2026-11-01',
      today: '2026-10-28',
      scheduleHistory: history,
    }),
  ).toEqual({
    kind: 'ready',
    remainingWords: 100,
    writingDays: 3,
    wordsPerDay: 34,
  })
  expect(
    captureActivityContext(100, new Date(2026, 9, 31, 12), history).scheduled,
  ).toBe(true)
  expect(
    captureActivityContext(100, new Date(2026, 9, 30, 12), history).scheduled,
  ).toBe(false)
})
test.each([
  null,
  {},
  { revision: 0, history },
  { revision: 1, history: [] },
  { revision: -1, history },
  { revision: 1.5, history },
  { revision: 1, history: [{ effectiveFrom: '2026-02-29', weekdays: [1] }] },
  { revision: 1, history: [{ effectiveFrom: '2026-10-28', weekdays: [7] }] },
  { revision: 1, history: [{ effectiveFrom: '2026-10-28', weekdays: [1, 1] }] },
  { revision: 1, history: [history[1], history[0]] },
])('rejects malformed schedule history %#', (value) =>
  expect(isWritingSchedule(value)).toBe(false),
)

test('interval calculation agrees with a civil-date walk across leap and year boundaries', () => {
  for (const start of ['2024-02-25', '2026-10-23', '2026-12-28']) {
    const plan = [{ effectiveFrom: start, weekdays: [1, 3, 5] }]
    const day = new Date(`${start}T12:00:00Z`)
    let expected = 0
    for (let i = 0; i < 40; i++) {
      if ([1, 3, 5].includes(day.getUTCDay())) expected++
      expect(
        countWritingDays(start, day.toISOString().slice(0, 10), plan),
      ).toBe(expected)
      day.setUTCDate(day.getUTCDate() + 1)
    }
  }
})
