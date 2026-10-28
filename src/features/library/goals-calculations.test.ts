import { expect, test } from 'vitest'
import { calculateBookDeadline } from './book-deadline'
import { calculateBookProgress } from './book-progress'
import { aggregateBookWordCount } from './book-word-count'
import { calculateWritingPace, type WritingWeekday } from './writing-pace'

const book = {
  wordCount: 90,
  targetWordCount: 100,
  today: '2026-10-27',
  deadline: '2026-10-29',
}

test('chapter aggregation feeds planning without treating legacy or overflowing totals as zero', () => {
  const chapter = (id: string, wordCount: number | null) => ({
    id,
    bookId: 'book',
    wordCount,
  })
  for (const [chapters, expectedKind] of [
    [[], 'ready'],
    [[chapter('a', 40), chapter('b', 60)], 'target_reached'],
    [[chapter('a', 40)], 'ready'],
    [[chapter('a', 40), chapter('b', null)], 'unknown'],
    [[chapter('a', Number.MAX_SAFE_INTEGER), chapter('b', 1)], 'unknown'],
  ] as const) {
    const wordCount = aggregateBookWordCount('book', chapters)
    expect(calculateWritingPace({ ...book, wordCount }).kind).toBe(expectedKind)
    if (expectedKind === 'unknown')
      expect(calculateBookProgress(wordCount, 100).kind).toBe('unknown')
  }
})

test.each([
  [null, null, 'no_target', 'none', 'no_target'],
  [100, null, 'determinate', 'none', 'no_deadline'],
  [null, '2026-10-26', 'no_target', 'overdue', 'no_target'],
  [100, '2026-10-26', 'determinate', 'overdue', 'overdue'],
  [100, '2026-10-27', 'determinate', 'today', 'ready'],
  [100, '2026-10-29', 'determinate', 'upcoming', 'ready'],
] as const)(
  'goal/deadline matrix: target %s and deadline %s',
  (targetWordCount, deadline, progressKind, deadlineKind, paceKind) => {
    expect(calculateBookProgress(book.wordCount, targetWordCount).kind).toBe(
      progressKind,
    )
    expect(calculateBookDeadline(deadline, book.today).kind).toBe(deadlineKind)
    expect(
      calculateWritingPace({ ...book, targetWordCount, deadline }).kind,
    ).toBe(paceKind)
  },
)

test('target achievement, explicit completion and overdue status remain independent', () => {
  const value = { ...book, wordCount: 110, deadline: '2026-10-26' }
  expect(
    calculateBookProgress(value.wordCount, value.targetWordCount),
  ).toMatchObject({ reached: true, excess: 10 })
  expect(calculateBookDeadline(value.deadline, value.today)).toMatchObject({
    kind: 'overdue',
  })
  expect(calculateWritingPace(value)).toEqual({
    kind: 'target_reached',
    remainingWords: 0,
    wordsPerDay: 0,
  })
  expect(
    calculateWritingPace({
      ...book,
      completed: true,
      wordCount: null,
      targetWordCount: null,
      deadline: null,
      today: null,
    }),
  ).toEqual({ kind: 'completed' })
  expect(calculateBookDeadline(value.deadline, value.today, true)).toEqual({
    kind: 'completed',
    date: value.deadline,
  })
})

test('recalculates after saved count reductions, raised targets, deadline changes and removal', () => {
  const states = [
    { ...book, wordCount: 100 },
    { ...book, wordCount: 90 },
    { ...book, targetWordCount: 120 },
    { ...book, targetWordCount: 120, deadline: book.today },
    { ...book, targetWordCount: null },
    { ...book, deadline: null },
  ]
  expect(states.map((value) => calculateWritingPace(value))).toEqual([
    { kind: 'target_reached', remainingWords: 0, wordsPerDay: 0 },
    { kind: 'ready', remainingWords: 10, writingDays: 3, wordsPerDay: 4 },
    { kind: 'ready', remainingWords: 30, writingDays: 3, wordsPerDay: 10 },
    { kind: 'ready', remainingWords: 30, writingDays: 1, wordsPerDay: 30 },
    { kind: 'no_target' },
    { kind: 'no_deadline', remainingWords: 10 },
  ])
})

test('unavailable totals never become achieved targets or numeric pace even after the deadline', () => {
  for (const wordCount of [null, undefined, NaN, -1]) {
    expect(calculateBookProgress(wordCount, 100).kind).toBe('unknown')
    expect(
      calculateWritingPace({ ...book, wordCount, deadline: '2026-10-26' }),
    ).toEqual({ kind: 'unknown' })
  }
  expect(
    calculateWritingPace({
      ...book,
      wordCount: 100,
      today: null,
      deadline: null,
      writingWeekdays: [],
    }),
  ).toEqual({ kind: 'target_reached', remainingWords: 0, wordsPerDay: 0 })
})

test('required integer pace is sufficient and minimal at count and division boundaries', () => {
  for (const targetWordCount of [
    1,
    2,
    7,
    8,
    100,
    Number.MAX_SAFE_INTEGER - 1,
    Number.MAX_SAFE_INTEGER,
  ]) {
    for (const wordCount of [0, 1, Math.max(0, targetWordCount - 1)]) {
      for (const deadline of [
        '2026-10-27',
        '2026-10-28',
        '2026-11-02',
        '9999-12-31',
      ]) {
        const result = calculateWritingPace({
          ...book,
          targetWordCount,
          wordCount,
          deadline,
        })
        if (wordCount >= targetWordCount) {
          expect(result.kind).toBe('target_reached')
          continue
        }
        expect(result.kind).toBe('ready')
        if (result.kind !== 'ready') throw new Error('Expected a numeric pace')
        const rate = BigInt(result.wordsPerDay)
        const days = BigInt(result.writingDays)
        const remaining = BigInt(targetWordCount) - BigInt(wordCount)
        expect(rate * days >= remaining).toBe(true)
        expect((rate - 1n) * days < remaining).toBe(true)
        expect(Number.isSafeInteger(result.wordsPerDay)).toBe(true)
      }
    }
  }
})

test('scheduled days match an independent date walk for all start weekdays and century boundaries', () => {
  for (const today of [
    '0001-01-01',
    '1900-02-25',
    '2000-02-25',
    '2026-10-25',
    '2026-10-26',
    '2026-10-27',
    '2026-10-28',
    '2026-10-29',
    '2026-10-30',
    '2026-10-31',
    '9999-12-10',
  ]) {
    for (let mask = 0; mask < 128; mask++) {
      const writingWeekdays = Array.from(
        { length: 7 },
        (_, index) => index,
      ).filter((day) => mask & (1 << day)) as WritingWeekday[]
      const date = new Date(`${today}T12:00:00Z`)
      let expected = 0
      for (let length = 1; length <= 15; length++) {
        if (writingWeekdays.includes(date.getUTCDay() as WritingWeekday))
          expected++
        const deadline = date.toISOString().slice(0, 10)
        expect(
          calculateWritingPace({ ...book, today, deadline, writingWeekdays }),
        ).toMatchObject({
          kind: expected ? 'ready' : 'no_writing_days',
          writingDays: expected,
        })
        date.setUTCDate(date.getUTCDate() + 1)
      }
    }
  }
})
