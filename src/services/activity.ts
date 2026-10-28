import { invoke, isTauri } from '@tauri-apps/api/core'
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
