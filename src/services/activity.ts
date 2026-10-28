import {
  isLongestStreak,
  type LongestStreak,
} from '../features/activity/longest-streak'
import { invoke, isTauri } from '@tauri-apps/api/core'
import {
  isCurrentStreak,
  isStreakRequest,
  type CurrentStreak,
  type StreakRequest,
} from '../features/activity/current-streak'
import {
  isDailyStatisticsRange,
  isStatisticsRequest,
  type DailyStatisticsRange,
  type StatisticsRequest,
} from '../features/activity/daily-statistics'

export async function getDailyStatistics(
  request: StatisticsRequest,
): Promise<DailyStatisticsRange> {
  if (!isTauri()) throw { code: 'desktop_required' }
  if (!isStatisticsRequest(request)) throw { code: 'validation' }
  const result = await invoke<unknown>('get_daily_statistics', {
    startDate: request.startDate,
    endDate: request.endDate,
    bookId: request.bookId,
  })
  if (
    !isDailyStatisticsRange(result) ||
    result.startDate !== request.startDate ||
    result.endDate !== request.endDate ||
    result.bookId !== request.bookId
  )
    throw { code: 'invalid_stored_data' }
  return result
}

export async function getCurrentStreak(
  request: StreakRequest,
): Promise<CurrentStreak> {
  if (!isTauri()) throw { code: 'desktop_required' }
  if (!isStreakRequest(request)) throw { code: 'validation' }
  const result = await invoke<unknown>('get_current_streak', {
    today: request.today,
    bookId: request.bookId,
  })
  if (
    !isCurrentStreak(result) ||
    result.today !== request.today ||
    result.bookId !== request.bookId
  )
    throw { code: 'invalid_stored_data' }
  return result
}

export async function getLongestStreak(
  request: StreakRequest,
): Promise<LongestStreak> {
  if (!isTauri()) throw { code: 'desktop_required' }
  if (!isStreakRequest(request)) throw { code: 'validation' }
  const result = await invoke<unknown>('get_longest_streak', {
    today: request.today,
    bookId: request.bookId,
  })
  if (
    !isLongestStreak(result) ||
    result.today !== request.today ||
    result.bookId !== request.bookId
  )
    throw { code: 'invalid_stored_data' }
  return result
}
