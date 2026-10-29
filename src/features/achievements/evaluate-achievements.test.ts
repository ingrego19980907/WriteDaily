import { expect, test } from 'vitest'
import type {
  BookDailyGoal,
  DailyStatistics,
  DailyStatisticsRange,
} from '../activity/daily-statistics'
import type { Book } from '../library/book'
import type { AchievementId } from './achievement-rules'
import {
  evaluateAchievements,
  type AchievementEvaluation,
  type AchievementEvidence,
  type BookCompletionEvidence,
} from './evaluate-achievements'

const today = '2026-10-29'
const sourceId = (index = 1) =>
  `00000000-0000-4000-8000-${index.toString(16).padStart(12, '0')}`
const wordRules = [
  ['first_words', 100],
  ['getting_started', 1_000],
  ['storyteller', 10_000],
  ['novelist', 50_000],
] as const

function goal(
  words = 100,
  target: number | null = 100,
  index = 1,
  scheduled = true,
): BookDailyGoal {
  return {
    sourceBookId: sourceId(index),
    bookId: sourceId(index),
    creditedWords: words,
    dailyWordGoal: target,
    scheduled,
    state: !scheduled
      ? 'unscheduled'
      : target === null
        ? 'unconfigured'
        : words >= target
          ? 'reached'
          : 'pending',
    remainingWords:
      !scheduled || target === null ? null : Math.max(0, target - words),
  }
}

function day(
  date: string,
  goals: readonly BookDailyGoal[] = [],
): DailyStatistics {
  const creditedWords = goals.reduce((sum, item) => sum + item.creditedWords, 0)
  return {
    date,
    creditedWords,
    addedWords: creditedWords,
    deletedWords: 0,
    saveCount: goals.length > 0 ? 1 : 0,
    active: creditedWords > 0,
    writingDay: true,
    bookGoals: goals,
  }
}

function page(days: readonly DailyStatistics[]): DailyStatisticsRange {
  return {
    startDate: days[0].date,
    endDate: days[days.length - 1].date,
    bookId: null,
    days,
  }
}

function evidence(days: readonly DailyStatistics[] = []): {
  today: string
  activity: NonNullable<AchievementEvidence['activity']>
  books: NonNullable<AchievementEvidence['books']>
} {
  return {
    today: days.at(-1)?.date ?? today,
    activity: {
      historyStartDate: days[0]?.date ?? null,
      pages: days.map((item) => page([item])),
      complete: true,
    },
    books: { snapshots: [], complete: true },
  }
}

function check(result: AchievementEvaluation, id: AchievementId) {
  return result.checks.find((item) => item.id === id)
}

function dateAt(offset: number): string {
  return new Date(Date.UTC(2024, 1, offset + 1)).toISOString().slice(0, 10)
}

function completion(
  completedAt: string | null = '2026-10-28T12:00:00.000Z',
): BookCompletionEvidence {
  return {
    id: sourceId(),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-10-29T12:00:00.000Z',
    completedAt,
  }
}

test('known empty history is locked while unavailable evidence stays unknown', () => {
  const empty = evaluateAchievements(evidence())
  expect(empty.policyVersion).toBe(1)
  expect(empty.checks).toHaveLength(8)
  expect(empty.eligibleIds).toEqual([])
  expect(
    empty.checks.every(
      (item) => item.status === 'locked' && item.confirmedProgress === 0,
    ),
  ).toBe(true)
  const unknown = evaluateAchievements({ today, activity: null, books: null })
  expect(
    unknown.checks.every(
      (item) =>
        item.status === 'unavailable' && item.confirmedProgress === null,
    ),
  ).toBe(true)
})

test.each(
  wordRules.flatMap(([id, threshold]) =>
    [-1, 0, 1].map((offset) => ({ id, threshold, offset })),
  ),
)(
  '$id at threshold $threshold plus $offset, across books and dates',
  ({ id, threshold, offset }) => {
    const words = threshold + offset
    const first = Math.floor(words / 2)
    const result = evaluateAchievements(
      evidence([
        day('2026-10-28', [goal(first, null)]),
        day(today, [goal(words - first, null, 2)]),
      ]),
    )
    expect(check(result, id)).toEqual({
      id,
      status: offset < 0 ? 'locked' : 'eligible',
      confirmedProgress: Math.min(words, threshold),
    })
  },
)

test('a large first snapshot qualifies for all word thresholds independently', () => {
  const result = evaluateAchievements(
    evidence([day(today, [goal(50_000, null)])]),
  )
  expect(result.eligibleIds).toEqual(wordRules.map(([id]) => id))
})

test.each(
  (
    [
      ['consistency', 7],
      ['dedicated_writer', 30],
    ] as const
  ).flatMap(([id, threshold]) =>
    [-1, 0, 1].map((offset) => ({ id, threshold, offset })),
  ),
)(
  '$id counts $threshold plus $offset completed dates despite rest and missed days',
  ({ id, threshold, offset }) => {
    const count = threshold + offset
    const days = Array.from({ length: count * 3 }, (_, index) =>
      day(dateAt(index), [
        index % 3 === 0 ? goal() : goal(0, 100, 1, index % 3 !== 1),
      ]),
    )
    const result = evaluateAchievements(evidence(days))
    expect(check(result, id)).toEqual({
      id,
      status: offset < 0 ? 'locked' : 'eligible',
      confirmedProgress: Math.min(count, threshold),
    })
  },
)

test.each([9, 10, 11])(
  'Goal Keeper counts %s distinct book/date goals on one day',
  (count) => {
    const result = evaluateAchievements(
      evidence([
        day(
          today,
          Array.from({ length: count }, (_, index) =>
            goal(100, 100, index + 1),
          ),
        ),
      ]),
    )
    expect(check(result, 'goal_keeper')).toEqual({
      id: 'goal_keeper',
      status: count < 10 ? 'locked' : 'eligible',
      confirmedProgress: Math.min(count, 10),
    })
    expect(check(result, 'consistency')?.confirmedProgress).toBe(1)
  },
)

test('two books meeting their goals on five dates give five days and ten goals', () => {
  const result = evaluateAchievements(
    evidence(
      Array.from({ length: 5 }, (_, index) =>
        day(dateAt(index), [goal(), goal(100, 100, 2)]),
      ),
    ),
  )
  expect(check(result, 'consistency')).toEqual({
    id: 'consistency',
    status: 'locked',
    confirmedProgress: 5,
  })
  expect(check(result, 'goal_keeper')?.status).toBe('eligible')
})

test('unconfigured goals and unscheduled writing earn words but no completed goals', () => {
  const result = evaluateAchievements(
    evidence([day(today, [goal(500, null), goal(500, 100, 2, false)])]),
  )
  expect(check(result, 'getting_started')?.status).toBe('eligible')
  expect(check(result, 'consistency')?.confirmedProgress).toBe(0)
  expect(check(result, 'goal_keeper')?.confirmedProgress).toBe(0)
})

test('zero credit, formatting, and deletions cannot meet a positive daily goal', () => {
  const entry = { ...day(today, [goal(0)]), deletedWords: 50_000 }
  const result = evaluateAchievements(evidence([entry]))
  expect(result.eligibleIds).toEqual([])
  expect(result.checks.every((item) => item.confirmedProgress === 0)).toBe(true)
})

test('overlapping pages and repeated snapshots cannot multiply words or goals', () => {
  const first = day('2026-10-28', [goal(25, 25), goal(25, 25, 2)])
  const second = day(today, [goal(25, 25)])
  const input = evidence([first, second])
  input.activity = {
    historyStartDate: first.date,
    complete: true,
    pages: [
      page([first, second]),
      page([{ ...first, bookGoals: [...first.bookGoals].reverse() }]),
      page([second]),
    ],
  }
  const result = evaluateAchievements(input)
  expect(check(result, 'first_words')).toEqual({
    id: 'first_words',
    status: 'locked',
    confirmedProgress: 75,
  })
  expect(check(result, 'consistency')?.confirmedProgress).toBe(2)
  expect(check(result, 'goal_keeper')?.confirmedProgress).toBe(3)
})

test('ten repeated reads of the same book/day still count as one goal', () => {
  const entry = day(today, [goal()])
  const input = evidence([entry])
  input.activity = {
    historyStartDate: today,
    complete: true,
    pages: Array.from({ length: 10 }, () => page([entry])),
  }
  const result = evaluateAchievements(input)
  expect(check(result, 'consistency')?.confirmedProgress).toBe(1)
  expect(check(result, 'goal_keeper')?.confirmedProgress).toBe(1)
  expect(new Set(result.eligibleIds).size).toBe(result.eligibleIds.length)
})

test('conflicting repeated dates fail closed rather than choosing greater credit', () => {
  const input = evidence([day(today, [goal(99, null)])])
  input.activity = {
    ...input.activity!,
    pages: [...input.activity!.pages, page([day(today, [goal(50_000, null)])])],
  }
  const result = evaluateAchievements(input)
  expect(
    result.checks
      .filter((item) => item.id !== 'the_end')
      .every(
        (item) =>
          item.status === 'unavailable' && item.confirmedProgress === null,
      ),
  ).toBe(true)
  expect(check(result, 'the_end')?.status).toBe('locked')
})

test('book-filtered pages cannot masquerade as global history', () => {
  const input = evidence([day(today, [goal(50_000)])])
  input.activity = {
    ...input.activity!,
    pages: [{ ...input.activity!.pages[0], bookId: sourceId() }],
  }
  expect(evaluateAchievements(input).eligibleIds).toEqual([])
  expect(check(evaluateAchievements(input), 'first_words')?.status).toBe(
    'unavailable',
  )
})

test('partial valid evidence proves reached thresholds without claiming missing totals', () => {
  const input = evidence([day(today, [goal(100, null)])])
  input.activity = { ...input.activity!, complete: false }
  const result = evaluateAchievements(input)
  expect(check(result, 'first_words')?.status).toBe('eligible')
  expect(check(result, 'getting_started')).toEqual({
    id: 'getting_started',
    status: 'unavailable',
    confirmedProgress: 100,
  })
})

test('a completeness claim cannot hide a missing page or a missing final date', () => {
  for (const dates of [
    ['2026-10-27', today],
    ['2026-10-27', '2026-10-28'],
  ]) {
    const input = {
      ...evidence(dates.map((date) => day(date, [goal(1, null)]))),
      today,
    }
    expect(check(evaluateAchievements(input), 'first_words')?.status).toBe(
      'unavailable',
    )
  }
})

test('history beyond 366 days contributes instead of being truncated to a calendar view', () => {
  const days = Array.from({ length: 400 }, (_, index) =>
    day(dateAt(index), index >= 370 ? [goal()] : []),
  )
  const input = evidence(days)
  input.activity = {
    historyStartDate: days[0].date,
    complete: true,
    pages: [page(days.slice(0, 366)), page(days.slice(366))],
  }
  const result = evaluateAchievements(input)
  expect(check(result, 'dedicated_writer')?.status).toBe('eligible')
  expect(check(result, 'goal_keeper')?.status).toBe('eligible')
  expect(check(result, 'getting_started')?.status).toBe('eligible')
})

test('deleted sources retain word and goal credit without implying a completed book', () => {
  const input = evidence(
    Array.from({ length: 7 }, (_, index) =>
      day(dateAt(index), [{ ...goal(), bookId: null }]),
    ),
  )
  const result = evaluateAchievements(input)
  expect(check(result, 'consistency')?.status).toBe('eligible')
  expect(check(result, 'first_words')?.status).toBe('eligible')
  expect(check(result, 'the_end')?.status).toBe('locked')
})

test('stored day plans govern achievements despite current targets or schedules', () => {
  const input = evidence([day(today, [goal(100, 100)])])
  const currentBook: Book = {
    ...completion(null),
    title: 'Книга',
    targetWordCount: 1,
    dailyWordGoal: 50_000,
    deadline: null,
    coverPath: null,
  }
  input.books = { complete: true, snapshots: [currentBook] }
  expect(
    check(evaluateAchievements(input), 'goal_keeper')?.confirmedProgress,
  ).toBe(1)
  expect(check(evaluateAchievements(input), 'the_end')?.status).toBe('locked')
})

test('date-line repeats and clock rollback exclude future labels without mutating history', () => {
  const input = evidence([
    day(today, [goal(99, null)]),
    day('2026-10-30', [goal(50_000, null)]),
  ])
  const stored = structuredClone(input)
  const before = evaluateAchievements({ ...input, today })
  expect(check(before, 'first_words')).toEqual({
    id: 'first_words',
    status: 'locked',
    confirmedProgress: 99,
  })
  expect(evaluateAchievements(input).eligibleIds).toEqual(
    wordRules.map(([id]) => id),
  )
  expect(evaluateAchievements({ ...input, today })).toEqual(before)
  expect(
    evaluateAchievements({ ...input, today: '2026-10-28' }).eligibleIds,
  ).toEqual([])
  expect(input).toEqual(stored)
})

test('today qualifies immediately at the daily goal threshold', () => {
  const input = evidence(
    Array.from({ length: 7 }, (_, index) => day(dateAt(index), [goal()])),
  )
  expect(check(evaluateAchievements(input), 'consistency')?.status).toBe(
    'eligible',
  )
  input.activity = {
    ...input.activity!,
    pages: input.activity!.pages.slice(0, -1),
  }
  expect(check(evaluateAchievements(input), 'consistency')?.status).toBe(
    'unavailable',
  )
})

test('safe per-day counts can exceed the safe lifetime sum without numeric overflow', () => {
  const result = evaluateAchievements(
    evidence([
      day('2026-10-28', [goal(Number.MAX_SAFE_INTEGER, null)]),
      day(today, [goal(Number.MAX_SAFE_INTEGER, null)]),
    ]),
  )
  expect(result.eligibleIds).toEqual(wordRules.map(([id]) => id))
  expect(
    result.checks.every(
      (item) =>
        item.confirmedProgress === null ||
        Number.isSafeInteger(item.confirmedProgress),
    ),
  ).toBe(true)
})

test.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '100', null])(
  'invalid credited value %s never qualifies',
  (value) => {
    const entry = structuredClone(day(today, [goal(50_000)]))
    ;(entry as unknown as Record<string, unknown>).creditedWords = value
    const result = evaluateAchievements(evidence([entry]))
    expect(result.eligibleIds).toEqual([])
    expect(check(result, 'first_words')?.confirmedProgress).toBeNull()
  },
)

test.each([
  (value: BookDailyGoal) => ({
    ...value,
    state: 'reached' as const,
    scheduled: false,
  }),
  (value: BookDailyGoal) => ({ ...value, dailyWordGoal: 0 }),
  (value: BookDailyGoal) => ({ ...value, sourceBookId: 'invalid' }),
  (value: BookDailyGoal) => ({
    ...value,
    creditedWords: Number.MAX_SAFE_INTEGER + 1,
  }),
])(
  'malformed goal evidence cannot manufacture a qualifying result (%#)',
  (corrupt) => {
    const result = evaluateAchievements(
      evidence([day(today, [corrupt(goal())])]),
    )
    expect(check(result, 'goal_keeper')?.status).toBe('unavailable')
    expect(result.eligibleIds).toEqual([])
  },
)

test('duplicate book goals within a page and unsafe daily aggregates are rejected', () => {
  for (const goals of [
    [goal(), goal()],
    [
      goal(Number.MAX_SAFE_INTEGER, null),
      goal(Number.MAX_SAFE_INTEGER, null, 2),
    ],
  ]) {
    expect(
      check(evaluateAchievements(evidence([day(today, goals)])), 'first_words')
        ?.status,
    ).toBe('unavailable')
  }
})

test('explicit persisted completion is independent of word targets and other read failures', () => {
  const result = evaluateAchievements({
    today,
    activity: null,
    books: { complete: true, snapshots: [completion()] },
  })
  expect(result.eligibleIds).toEqual(['the_end'])
  expect(check(result, 'first_words')?.status).toBe('unavailable')
})

test('missing completion and unknown completion reads are distinct', () => {
  const input = evidence([day(today, [goal(50_000)])])
  input.books = { complete: true, snapshots: [completion(null)] }
  expect(check(evaluateAchievements(input), 'the_end')).toEqual({
    id: 'the_end',
    status: 'locked',
    confirmedProgress: 0,
  })
  input.books = { complete: false, snapshots: [completion(null)] }
  expect(check(evaluateAchievements(input), 'the_end')?.status).toBe(
    'unavailable',
  )
  input.books = { complete: false, snapshots: [completion()] }
  expect(check(evaluateAchievements(input), 'the_end')?.status).toBe('eligible')
})

test('repeated and multiple completed books produce only one eligible The End ID', () => {
  const input = evidence()
  input.books = {
    complete: true,
    snapshots: [
      completion(),
      completion(),
      { ...completion(), id: sourceId(2) },
    ],
  }
  const first = evaluateAchievements(input)
  expect(first.eligibleIds).toEqual(['the_end'])
  expect(evaluateAchievements(input)).toEqual(first)
  expect(check(first, 'the_end')?.confirmedProgress).toBe(1)
})

test.each([
  { id: 'bad-id' },
  { completedAt: '' },
  { completedAt: undefined },
  { completedAt: '2026-10-28' },
  { completedAt: '2026-02-30T12:00:00.000Z' },
  { completedAt: '2026-10-28T15:00:00.000+03:00' },
  { completedAt: '2025-12-31T23:59:59.000Z' },
  { completedAt: '2026-10-30T00:00:00.000Z' },
  { createdAt: '0000-01-01T00:00:00.000Z' },
  { updatedAt: '2025-01-01T00:00:00.000Z' },
])('invalid completion evidence fails closed (%j)', (override) => {
  const input = evidence([day(today, [goal(100, null)])])
  input.books = {
    complete: true,
    snapshots: [{ ...completion(), ...override } as BookCompletionEvidence],
  }
  const result = evaluateAchievements(input)
  expect(check(result, 'the_end')?.status).toBe('unavailable')
  expect(check(result, 'first_words')?.status).toBe('eligible')
})

test('conflicting book snapshots cannot guess explicit completion', () => {
  const input = evidence()
  input.books = { complete: true, snapshots: [completion(), completion(null)] }
  expect(check(evaluateAchievements(input), 'the_end')?.status).toBe(
    'unavailable',
  )
})

test.each([
  '2026-02-29',
  '0000-01-01',
  '10000-01-01',
  '2026-1-01',
  'not-a-date',
])('invalid as-of date %s prevents evaluation', (date) => {
  const result = evaluateAchievements({
    ...evidence([day(today, [goal(50_000)])]),
    today: date,
    books: { complete: true, snapshots: [completion()] },
  })
  expect(result.checks.every((item) => item.status === 'unavailable')).toBe(
    true,
  )
})

test('pure evaluation never mutates frozen evidence or remembers an earlier result', () => {
  const entry = day(today, [goal(100, 100, 2), goal(100, 100)])
  const input = evidence([entry])
  Object.freeze(entry.bookGoals)
  Object.freeze(entry)
  Object.freeze(input.activity?.pages)
  Object.freeze(input.activity)
  Object.freeze(input)
  const first = evaluateAchievements(input)
  expect(evaluateAchievements(evidence()).eligibleIds).toEqual([])
  expect(evaluateAchievements(input)).toEqual(first)
  expect(first).not.toHaveProperty('unlockedAt')
})
