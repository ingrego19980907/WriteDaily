import { expect, test } from 'vitest'
import { calculateWritingPace, type WritingWeekday } from './writing-pace'

const input = {
  wordCount: 20,
  targetWordCount: 120,
  today: '2026-10-27', // Tuesday
  deadline: '2026-10-29', // Thursday
}

test('scheduled-day totals agree with enumerated civil dates for every weekday combination', () => {
  for (let mask = 0; mask < 128; mask++) {
    const writingWeekdays = Array.from({ length: 7 }, (_, day) => day).filter(
      (day) => mask & (1 << day),
    ) as WritingWeekday[]
    for (let length = 1; length <= 22; length++) {
      const date = new Date('2024-02-25T12:00:00Z')
      let expectedDays = 0
      let deadline = ''
      for (let index = 0; index < length; index++) {
        if (writingWeekdays.includes(date.getUTCDay() as WritingWeekday))
          expectedDays++
        deadline = date.toISOString().slice(0, 10)
        date.setUTCDate(date.getUTCDate() + 1)
      }
      const result = calculateWritingPace({
        ...input,
        today: '2024-02-25',
        deadline,
        writingWeekdays,
      })
      expect(result).toMatchObject({
        kind: expectedDays ? 'ready' : 'no_writing_days',
        writingDays: expectedDays,
      })
    }
  }
})

test('includes today and deadline, rounds up and defaults to all calendar days', () => {
  expect(calculateWritingPace(input)).toEqual({
    kind: 'ready',
    remainingWords: 100,
    writingDays: 3,
    wordsPerDay: 34,
  })
  expect(calculateWritingPace({ ...input, deadline: input.today })).toEqual({
    kind: 'ready',
    remainingWords: 100,
    writingDays: 1,
    wordsPerDay: 100,
  })
})

test('counts only scheduled weekdays, deduplicates and handles no available days', () => {
  expect(
    calculateWritingPace({ ...input, writingWeekdays: [2, 4, 4] }),
  ).toMatchObject({
    kind: 'ready',
    writingDays: 2,
    wordsPerDay: 50,
  })
  for (const writingWeekdays of [[], [0, 6]] as WritingWeekday[][]) {
    expect(calculateWritingPace({ ...input, writingWeekdays })).toEqual({
      kind: 'no_writing_days',
      remainingWords: 100,
      writingDays: 0,
    })
  }
  expect(
    calculateWritingPace({
      ...input,
      deadline: '2026-11-10',
      writingWeekdays: [2],
    }),
  ).toMatchObject({
    writingDays: 3,
    wordsPerDay: 34,
  })
  expect(
    calculateWritingPace({
      ...input,
      today: '2026-10-25',
      deadline: '2026-10-25',
      writingWeekdays: [0],
    }),
  ).toMatchObject({ writingDays: 1 })
})

test('separates missing configuration, unknown totals, overdue and explicit completion', () => {
  expect(calculateWritingPace({ ...input, targetWordCount: null })).toEqual({
    kind: 'no_target',
  })
  expect(calculateWritingPace({ ...input, deadline: null })).toEqual({
    kind: 'no_deadline',
    remainingWords: 100,
  })
  expect(calculateWritingPace({ ...input, deadline: '2026-10-26' })).toEqual({
    kind: 'overdue',
    remainingWords: 100,
  })
  expect(
    calculateWritingPace({ ...input, completed: true, wordCount: null }),
  ).toEqual({ kind: 'completed' })
})

test.each([120, 121, Number.MAX_SAFE_INTEGER])(
  'target attainment never yields negative remaining words (%s)',
  (wordCount) => {
    expect(
      calculateWritingPace({ ...input, wordCount, deadline: '2020-01-01' }),
    ).toEqual({
      kind: 'target_reached',
      remainingWords: 0,
      wordsPerDay: 0,
    })
  },
)

test('invalid data stays unknown instead of producing a plausible pace', () => {
  for (const wordCount of [
    null,
    undefined,
    -1,
    0.5,
    NaN,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
    '20',
  ]) {
    expect(calculateWritingPace({ ...input, wordCount })).toEqual({
      kind: 'unknown',
    })
  }
  for (const targetWordCount of [undefined, 0, -1, 1.5, NaN, Infinity, '120']) {
    expect(calculateWritingPace({ ...input, targetWordCount })).toEqual({
      kind: 'unknown',
    })
  }
  for (const date of [
    undefined,
    '',
    '2026-02-29',
    '0000-01-01',
    '2026-10-27T00:00:00Z',
  ]) {
    expect(calculateWritingPace({ ...input, deadline: date })).toEqual({
      kind: 'unknown',
    })
    expect(calculateWritingPace({ ...input, today: date })).toEqual({
      kind: 'unknown',
    })
  }
  for (const schedule of [[-1], [7], [1.5], ['2'], [null], Array(2), null]) {
    expect(
      calculateWritingPace({
        ...input,
        writingWeekdays: schedule as readonly WritingWeekday[],
      }),
    ).toEqual({ kind: 'unknown' })
  }
})

test('calendar arithmetic spans DST, leap day, year rollover and the full supported range', () => {
  for (const [today, deadline, writingDays] of [
    ['2026-03-28', '2026-03-30', 3],
    ['2026-10-24', '2026-10-26', 3],
    ['2024-02-28', '2024-03-01', 3],
    ['2026-12-31', '2027-01-01', 2],
    ['0001-01-01', '9999-12-31', 3652059],
  ] as const) {
    expect(calculateWritingPace({ ...input, today, deadline })).toMatchObject({
      kind: 'ready',
      writingDays,
    })
  }
})

test('integer ceiling remains exact at safe-integer limits and does not mutate inputs', () => {
  const writingWeekdays = Object.freeze([0, 1, 2, 3, 4, 5, 6] as const)
  const value = Object.freeze({
    ...input,
    wordCount: 0,
    targetWordCount: Number.MAX_SAFE_INTEGER,
    writingWeekdays,
  })
  expect(calculateWritingPace(value)).toMatchObject({
    wordsPerDay: 3002399751580331,
  })
  expect(
    calculateWritingPace({ ...value, deadline: input.today }),
  ).toMatchObject({ wordsPerDay: Number.MAX_SAFE_INTEGER })
  expect(value.wordCount).toBe(0)
  expect(value.writingWeekdays).toEqual([0, 1, 2, 3, 4, 5, 6])
})
