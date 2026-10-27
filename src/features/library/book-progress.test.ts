import { expect, test } from 'vitest'
import { calculateBookProgress } from './book-progress'

test.each([
  null,
  undefined,
  NaN,
  Infinity,
  -1,
  1.5,
  '500',
  Number.MAX_SAFE_INTEGER + 1,
])('invalid or missing count %s stays unknown', (count) => {
  expect(calculateBookProgress(count, 1000)).toEqual({
    kind: 'unknown',
    target: 1000,
  })
})
test.each([
  null,
  undefined,
  0,
  -1,
  NaN,
  Infinity,
  1.5,
  '1000',
  Number.MAX_SAFE_INTEGER + 1,
])('missing or invalid goal %s is not a zero percent target', (target) => {
  expect(calculateBookProgress(500, target)).toEqual({
    kind: 'no_target',
    words: 500,
  })
})
test.each([
  [0, 1000, 0, 1000, 0],
  [250, 1000, 25, 750, 0],
  [99999, 100000, 99.9, 1, 0],
  [1000, 1000, 100, 0, 0],
  [1500, 1000, 100, 0, 500],
  [Number.MAX_SAFE_INTEGER - 1, Number.MAX_SAFE_INTEGER, 99.9, 1, 0],
  [Number.MAX_SAFE_INTEGER, 1, 100, 0, Number.MAX_SAFE_INTEGER - 1],
])(
  'progress for %s / %s is bounded without losing remaining/excess words',
  (words, target, percentage, remaining, excess) => {
    expect(calculateBookProgress(words, target)).toEqual({
      kind: 'determinate',
      words,
      target,
      percentage,
      remaining,
      excess,
      reached: words >= target,
    })
  },
)

test('target achievement is recalculated after edits, higher targets and removal', () => {
  expect(calculateBookProgress(1000, 1000)).toMatchObject({
    reached: true,
    remaining: 0,
  })
  expect(calculateBookProgress(999, 1000)).toMatchObject({
    reached: false,
    remaining: 1,
  })
  expect(calculateBookProgress(1000, 1500)).toMatchObject({
    reached: false,
    remaining: 500,
  })
  expect(calculateBookProgress(1000, 500)).toMatchObject({
    reached: true,
    excess: 500,
  })
  expect(calculateBookProgress(1000, null)).toEqual({
    kind: 'no_target',
    words: 1000,
  })
  expect(calculateBookProgress(null, 1000)).toEqual({
    kind: 'unknown',
    target: 1000,
  })
})
