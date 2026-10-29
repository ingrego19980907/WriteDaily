import { streak, day } from '../../../tests/fixtures/writing-statistics-data'
import { expect, test } from 'vitest'
import { completedDailyGoals, presentCurrentStreak } from './writing-statistics'

test('streak display preserves exact zero, lower bounds and unknown history', () => {
  expect(presentCurrentStreak(streak)).toEqual({ count: 3, atLeast: false })
  expect(presentCurrentStreak({ ...streak, exact: false })).toEqual({
    count: 3,
    atLeast: true,
  })
  expect(presentCurrentStreak({ ...streak, days: 0 })).toEqual({
    count: 0,
    atLeast: false,
  })
  expect(presentCurrentStreak({ ...streak, days: 0, exact: false })).toBeNull()
  expect(presentCurrentStreak(undefined)).toBeNull()
})
test('daily completions count only native reached book goals, including retained sources, not saves', () => {
  expect(completedDailyGoals(day)).toBe(2)
  expect(completedDailyGoals({ ...day, saveCount: 100 })).toBe(2)
  expect(
    completedDailyGoals({ ...day, bookGoals: day.bookGoals.slice(2) }),
  ).toBe(0)
  expect(completedDailyGoals({ ...day, bookGoals: [] })).toBe(0)
  expect(
    completedDailyGoals({
      ...day,
      bookGoals: day.bookGoals
        .filter((goal) => goal.state === 'unscheduled')
        .map((goal) => ({ ...goal, creditedWords: 100 })),
    }),
  ).toBe(0)
})
