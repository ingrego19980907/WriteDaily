// Test-only committed-history responses; never used by production persistence.
import type { Book } from '../../src/features/library/book'
import type {
  BookDailyGoal,
  DailyStatisticsRange,
  StatisticsRequest,
} from '../../src/features/activity/daily-statistics'

export const activityBooks: Book[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    title: 'A quiet story',
    targetWordCount: 50000,
    dailyWordGoal: 1000,
    deadline: null,
    coverPath: null,
    completedAt: null,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    title: 'Another story',
    targetWordCount: null,
    dailyWordGoal: null,
    deadline: null,
    coverPath: null,
    completedAt: null,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
  },
]
type Entry = {
  source: string
  live: string | null
  words: number
  deleted: number
  saves: number
  target: number | null
}
export function activityFixture(
  request: StatisticsRequest,
  empty = false,
): DailyStatisticsRange {
  const dates: string[] = []
  const date = new Date(`${request.startDate}T12:00:00.000Z`)
  const end = new Date(`${request.endDate}T12:00:00.000Z`).getTime()
  while (date.getTime() <= end) {
    dates.push(date.toISOString().slice(0, 10))
    date.setUTCDate(date.getUTCDate() + 1)
  }
  const first = activityBooks[0].id
  const second = activityBooks[1].id
  const entries: Record<string, Entry[]> = empty
    ? {}
    : {
        '2026-10-03': [
          {
            source: first,
            live: first,
            words: 250,
            deleted: 30,
            saves: 2,
            target: 500,
          },
        ],
        '2026-10-06': [
          {
            source: second,
            live: second,
            words: 25,
            deleted: 0,
            saves: 1,
            target: null,
          },
        ],
        '2026-10-12': [
          {
            source: '00000000-0000-4000-8000-000000000003',
            live: null,
            words: 1000,
            deleted: 0,
            saves: 1,
            target: 1000,
          },
        ],
        '2026-10-18': [
          {
            source: first,
            live: first,
            words: 600,
            deleted: 8,
            saves: 2,
            target: 500,
          },
          {
            source: second,
            live: second,
            words: 30,
            deleted: 0,
            saves: 2,
            target: null,
          },
        ],
        '2026-10-27': [
          {
            source: first,
            live: first,
            words: 0,
            deleted: 10,
            saves: 1,
            target: 500,
          },
        ],
      }
  return {
    ...request,
    days: dates.map((date) => {
      const records = (entries[date] ?? []).filter(
        (entry) => request.bookId === null || request.bookId === entry.live,
      )
      const words = records.reduce((sum, entry) => sum + entry.words, 0)
      const bookGoals: BookDailyGoal[] = records.map((entry) => ({
        sourceBookId: entry.source,
        bookId: entry.live,
        creditedWords: entry.words,
        dailyWordGoal: entry.target,
        scheduled: true,
        state:
          entry.target === null
            ? 'unconfigured'
            : entry.words >= entry.target
              ? 'reached'
              : 'pending',
        remainingWords:
          entry.target === null
            ? null
            : Math.max(0, entry.target - entry.words),
      }))
      return {
        date,
        addedWords: words,
        deletedWords: records.reduce((sum, entry) => sum + entry.deleted, 0),
        creditedWords: words,
        saveCount: records.reduce((sum, entry) => sum + entry.saves, 0),
        active: words > 0,
        bookGoals,
      }
    }),
  }
}
