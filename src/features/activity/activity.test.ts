import { expect, test } from 'vitest'
import { calculateActivityDelta, type ActivityOrigin } from './activity'

test.each([
  [0, 0, 0, 0],
  [10, 15, 5, 0],
  [15, 10, 0, 5],
  [15, 0, 0, 15],
  [10, 10, 0, 0],
  [0, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 0],
  [Number.MAX_SAFE_INTEGER, 0, 0, Number.MAX_SAFE_INTEGER],
])(
  'net activity from %s to %s words',
  (before, after, addedWords, deletedWords) => {
    expect(calculateActivityDelta(before, after)).toEqual({
      addedWords,
      deletedWords,
      creditedWords: addedWords,
    })
  },
)

test('paste shares editor credit; import and restore never credit existing writing', () => {
  expect(calculateActivityDelta(10, 1010, 'editor')?.creditedWords).toBe(1000)
  for (const origin of ['import', 'restore'] as const) {
    expect(calculateActivityDelta(10, 1010, origin)).toEqual({
      addedWords: 1000,
      deletedWords: 0,
      creditedWords: 0,
    })
    expect(calculateActivityDelta(1010, 10, origin)).toEqual({
      addedWords: 0,
      deletedWords: 1000,
      creditedWords: 0,
    })
  }
})

test('unknown baselines and unsafe counts are rejected instead of manufacturing credit', () => {
  for (const value of [
    null,
    undefined,
    -1,
    1.5,
    NaN,
    Infinity,
    '10',
    Number.MAX_SAFE_INTEGER + 1,
  ]) {
    expect(calculateActivityDelta(value, 10)).toBeNull()
    expect(calculateActivityDelta(10, value)).toBeNull()
  }
  expect(calculateActivityDelta(0, 10, 'unknown' as ActivityOrigin)).toBeNull()
})

test('deletion and retyping in separate commits can earn credit; a same-batch replacement cannot', () => {
  expect(calculateActivityDelta(10, 10)?.creditedWords).toBe(0)
  expect(calculateActivityDelta(10, 0)?.creditedWords).toBe(0)
  expect(calculateActivityDelta(0, 10)?.creditedWords).toBe(10)
})

test('a midnight split preserves independent batches rather than netting different days', () => {
  const beforeMidnight = calculateActivityDelta(100, 120)!
  const afterMidnight = calculateActivityDelta(120, 110)!
  expect(beforeMidnight.creditedWords).toBe(20)
  expect(afterMidnight.deletedWords).toBe(10)
  expect(afterMidnight.creditedWords).toBe(0)
  expect(calculateActivityDelta(100, 110)?.creditedWords).toBe(10)
})
