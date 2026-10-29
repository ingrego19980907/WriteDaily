// Test-only IPC verification. Production always uses native SQLite history.
import '../../src/styles/global.css'
import { createRoot } from 'react-dom/client'
import { mockIPC } from '@tauri-apps/api/mocks'
import App from '../../src/app/App'
import {
  everyDay,
  weekdaysOn,
  scheduledOn,
  type WritingSchedule,
} from '../../src/features/settings/writing-schedule'
import { activityBooks, activityFixture } from './activity-data'
import type { StatisticsRequest } from '../../src/features/activity/daily-statistics'
import type { StreakRequest } from '../../src/features/activity/current-streak'

Object.assign(globalThis, { isTauri: true })
const mode = new URLSearchParams(location.search).get('state')
let state: WritingSchedule = { revision: 0, history: [] }
let reads = 0
let saves = 0
let finish: (() => void) | undefined
const book = {
  ...activityBooks[0],
  title: 'Scheduled story',
  targetWordCount: 100,
  dailyWordGoal: 100,
  deadline: '2026-11-01',
}
Object.assign(globalThis, { completeScheduleSave: () => finish?.() })
mockIPC((command, payload) => {
  if (command === 'get_writing_schedule') {
    reads++
    if (mode === 'load-failure' && reads === 1) throw { code: 'persistence' }
    return state
  }
  if (command === 'save_writing_schedule') {
    saves++
    const request = payload as {
      expectedRevision: number
      weekdays: number[]
      today: string
    }
    if (mode === 'failure' && saves === 1) throw { code: 'persistence' }
    if (mode === 'conflict' && saves === 1) {
      state = {
        revision: 1,
        history: [
          { effectiveFrom: '2026-10-28', weekdays: everyDay },
          { effectiveFrom: '2026-10-29', weekdays: [] },
        ],
      }
      throw { code: 'conflict' }
    }
    if (request.expectedRevision !== state.revision) throw { code: 'conflict' }
    const next = new Date(`${request.today}T12:00:00Z`)
    next.setUTCDate(next.getUTCDate() + 1)
    const from = next.toISOString().slice(0, 10)
    const history = state.history.length
      ? state.history.filter((entry) => entry.effectiveFrom !== from)
      : [{ effectiveFrom: request.today, weekdays: everyDay }]
    const result = {
      revision: state.revision + 1,
      history: [
        ...history,
        {
          effectiveFrom: from,
          weekdays: [...request.weekdays].sort((a, b) => a - b),
        },
      ],
    }
    const commit = () => {
      state = result
      return result
    }
    if (mode === 'pending')
      return new Promise((resolve) => {
        finish = () => resolve(commit())
      })
    return commit()
  }
  if (command === 'list_books') return [book]
  if (command === 'list_chapters') return []
  if (command === 'get_book') return book
  if (command === 'get_daily_statistics') {
    const request = payload as StatisticsRequest
    const range = activityFixture(request, true)
    return {
      ...range,
      days: range.days.map((day) => {
        const known =
          state.history.length > 0 && state.history[0].effectiveFrom <= day.date
        const scheduled = weekdaysOn(day.date, state.history).includes(
          new Date(`${day.date}T12:00:00Z`).getUTCDay(),
        )
        return {
          ...day,
          writingDay: known ? scheduled : null,
          bookGoals: known
            ? [
                {
                  sourceBookId: book.id,
                  bookId: book.id,
                  dailyWordGoal: 100,
                  scheduled,
                  creditedWords: 0,
                  state: scheduled ? 'pending' : 'unscheduled',
                  remainingWords: scheduled ? 100 : null,
                },
              ]
            : [],
        }
      }),
    }
  }
  if (command === 'get_current_streak') {
    const request = payload as StreakRequest
    const known =
      state.history.length > 0 &&
      state.history[0].effectiveFrom <= request.today
    return {
      ...request,
      days: 0,
      exact: !known,
      todayState: known
        ? scheduledOn(request.today, state.history)
          ? 'pending'
          : 'unscheduled'
        : 'unknown',
      todayCreditedWords: 0,
      startDate: null,
      lastCompletedDate: null,
      boundary: known ? 'history_start' : 'empty_history',
    }
  }
  if (command === 'get_longest_streak')
    return {
      ...(payload as StreakRequest),
      days: 0,
      exact: true,
      startDate: null,
      endDate: null,
      historyStartDate: state.history[0]?.effectiveFrom ?? null,
    }
  throw { code: 'persistence' }
})
createRoot(document.getElementById('root')!).render(<App />)
