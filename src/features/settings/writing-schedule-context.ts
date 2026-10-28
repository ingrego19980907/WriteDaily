import { createContext, useContext } from 'react'
import type { WritingSchedule } from './writing-schedule'

export type ScheduleState = {
  data: WritingSchedule | null
  failed: boolean
  loading: boolean
}
export const WritingScheduleContext = createContext<
  | (ScheduleState & {
      reload: () => Promise<void>
      accept: (data: WritingSchedule) => void
    })
  | null
>(null)
export function useWritingSchedule() {
  return useContext(WritingScheduleContext)
}
