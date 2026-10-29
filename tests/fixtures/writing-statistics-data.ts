// Test-only committed native response shapes; never imported by production.
import type { CurrentStreak } from '../../src/features/activity/current-streak'
import type { DailyStatistics } from '../../src/features/activity/daily-statistics'
export const streak: CurrentStreak = {
  today: '2026-10-28',
  bookId: null,
  days: 3,
  exact: true,
  todayState: 'reached',
  todayCreditedWords: 50,
  startDate: '2026-10-26',
  lastCompletedDate: '2026-10-28',
  boundary: 'missed_day',
}
export const day: DailyStatistics = {
  date: streak.today,
  addedWords: 50,
  deletedWords: 10,
  creditedWords: 50,
  active: true,
  saveCount: 6,
  bookGoals: [
    {
      sourceBookId: '00000000-0000-4000-8000-000000000001',
      bookId: '00000000-0000-4000-8000-000000000001',
      dailyWordGoal: 20,
      scheduled: true,
      creditedWords: 25,
      state: 'reached',
      remainingWords: 0,
    },
    {
      sourceBookId: '00000000-0000-4000-8000-000000000006',
      bookId: null,
      dailyWordGoal: 25,
      scheduled: true,
      creditedWords: 25,
      state: 'reached',
      remainingWords: 0,
    },
    {
      sourceBookId: '00000000-0000-4000-8000-000000000003',
      bookId: null,
      dailyWordGoal: 10,
      scheduled: true,
      creditedWords: 0,
      state: 'pending',
      remainingWords: 10,
    },
    {
      sourceBookId: '00000000-0000-4000-8000-000000000004',
      bookId: null,
      dailyWordGoal: null,
      scheduled: true,
      creditedWords: 0,
      state: 'unconfigured',
      remainingWords: null,
    },
    {
      sourceBookId: '00000000-0000-4000-8000-000000000005',
      bookId: null,
      dailyWordGoal: 10,
      scheduled: false,
      creditedWords: 0,
      state: 'unscheduled',
      remainingWords: null,
    },
  ],
}
