import { invoke, isTauri } from '@tauri-apps/api/core'
import {
  isWritingSchedule,
  validWeekdays,
  type WritingSchedule,
} from '../features/settings/writing-schedule'
import { calendarDayNumber, isCalendarDate } from '../utils/calendar-date'

async function checked(
  command: string,
  args?: Record<string, unknown>,
): Promise<WritingSchedule> {
  if (!isTauri()) throw { code: 'desktop_required' }
  const result = await invoke<unknown>(command, args)
  if (!isWritingSchedule(result)) throw { code: 'invalid_stored_data' }
  return result
}
export function getWritingSchedule() {
  return checked('get_writing_schedule')
}
export async function saveWritingSchedule(
  expectedRevision: number,
  weekdays: readonly number[],
  today: string,
) {
  if (
    !Number.isSafeInteger(expectedRevision) ||
    expectedRevision < 0 ||
    !validWeekdays(weekdays) ||
    !isCalendarDate(today)
  )
    throw { code: 'validation' }
  const result = await checked('save_writing_schedule', {
    expectedRevision,
    weekdays,
    today,
  })
  if (
    result.revision !== expectedRevision + 1 ||
    calendarDayNumber(result.history.at(-1)!.effectiveFrom) !==
      calendarDayNumber(today) + 1 ||
    result.history.at(-1)!.weekdays.join(',') !==
      [...weekdays].sort((a, b) => a - b).join(',')
  )
    throw { code: 'invalid_stored_data' }
  return result
}
