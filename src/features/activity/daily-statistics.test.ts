import { expect, test } from 'vitest'
import {
  isDailyStatisticsRange,
  isStatisticsRequest,
  type DailyStatisticsRange,
} from './daily-statistics'

const bookId = '123e4567-e89b-42d3-a456-426614174000'
function statisticsFixture(): DailyStatisticsRange {
  return {
    startDate: '2026-10-28',
    endDate: '2026-10-29',
    bookId: null,
    days: [
      {
        date: '2026-10-28',
        addedWords: 5,
        deletedWords: 2,
        creditedWords: 5,
        saveCount: 3,
        active: true,
        bookGoals: [
          {
            sourceBookId: bookId,
            bookId,
            dailyWordGoal: 10,
            scheduled: true,
            creditedWords: 5,
            state: 'pending',
            remainingWords: 5,
          },
        ],
      },
      {
        date: '2026-10-29',
        addedWords: 0,
        deletedWords: 0,
        creditedWords: 0,
        saveCount: 0,
        active: false,
        bookGoals: [],
      },
    ],
  }
}

test('accepts complete ordered daily results and retained historical book identifiers', () => {
  const value = statisticsFixture()
  expect(isDailyStatisticsRange(value)).toBe(true)
  const archived = structuredClone(value) as unknown as Record<string, unknown>
  const days = archived.days as { bookGoals: { bookId: null }[] }[]
  days[0].bookGoals[0].bookId = null
  expect(isDailyStatisticsRange(archived)).toBe(true)
})

test.each([
  ['2024-01-01', '2024-12-31', true],
  ['2024-01-01', '2025-01-01', false],
  ['0001-01-01', '0001-01-01', true],
  ['9999-12-31', '9999-12-31', true],
  ['0000-01-01', '0001-01-01', false],
  ['2026-02-29', '2026-03-01', false],
  ['2026-10-29', '2026-10-28', false],
  ['2026-1-01', '2026-01-02', false],
])('range %s through %s has validity %s', (startDate, endDate, valid) => {
  expect(isStatisticsRequest({ startDate, endDate, bookId: null })).toBe(valid)
})

test('validates UUID scope and refuses absent optional scope sent as undefined', () => {
  expect(
    isStatisticsRequest({
      startDate: '2026-10-28',
      endDate: '2026-10-28',
      bookId,
    }),
  ).toBe(true)
  for (const invalid of [
    'forged',
    undefined,
    0,
    '123e4567-e89b-12d3-a456-426614174000',
  ])
    expect(
      isStatisticsRequest({
        startDate: '2026-10-28',
        endDate: '2026-10-28',
        bookId: invalid,
      }),
    ).toBe(false)
})

test('rejects missing dates, duplicate dates, numeric corruption and false active-day claims', () => {
  const mutations: ((value: ReturnType<typeof JSON.parse>) => void)[] = [
    (v) => v.days.pop(),
    (v) => v.days.reverse(),
    (v) => (v.days[1].date = v.days[0].date),
    (v) => (v.days[0].addedWords = null),
    (v) => (v.days[0].deletedWords = -1),
    (v) => (v.days[0].creditedWords = Number.MAX_SAFE_INTEGER + 1),
    (v) => (v.days[0].saveCount = 1.5),
    (v) => (v.days[0].active = false),
    (v) => (v.days[1].active = true),
    (v) => (v.days[0].creditedWords = 4),
    (v) => v.days[0].bookGoals.push(v.days[0].bookGoals[0]),
    (v) => (v.days[0].bookGoals = []),
    (v) => (v.days[0].saveCount = 0),
  ]
  for (const mutate of mutations) {
    const value: unknown = JSON.parse(JSON.stringify(statisticsFixture()))
    mutate(value)
    expect(isDailyStatisticsRange(value)).toBe(false)
  }
})

test('checks goal states against sealed targets rather than trusting achievement flags', () => {
  const value: ReturnType<typeof JSON.parse> = JSON.parse(
    JSON.stringify(statisticsFixture()),
  )
  const goal = value.days[0].bookGoals[0]
  for (const [target, scheduled, state, remaining, valid] of [
    [5, true, 'reached', 0, true],
    [3, true, 'reached', 0, true],
    [10, true, 'reached', 0, false],
    [10, true, 'pending', 5, true],
    [null, true, 'unconfigured', null, true],
    [null, true, 'reached', 0, false],
    [0, true, 'reached', 0, false],
    [10, false, 'unscheduled', null, true],
    [10, false, 'reached', 0, false],
  ] as const) {
    Object.assign(goal, {
      dailyWordGoal: target,
      scheduled,
      state,
      remainingWords: remaining,
    })
    expect(isDailyStatisticsRange(value)).toBe(valid)
  }
})

test('scoped statistics cannot include another or detached book', () => {
  const value: ReturnType<typeof JSON.parse> = JSON.parse(
    JSON.stringify(statisticsFixture()),
  )
  value.bookId = bookId
  expect(isDailyStatisticsRange(value)).toBe(true)
  value.days[0].bookGoals[0].bookId = null
  expect(isDailyStatisticsRange(value)).toBe(false)
})
