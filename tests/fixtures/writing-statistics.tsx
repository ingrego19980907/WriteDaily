// Test-only native response fixtures. Never used for application persistence.
import '../../src/styles/global.css'
import { createRoot } from 'react-dom/client'
import { mockIPC } from '@tauri-apps/api/mocks'
import App from '../../src/app/App'
import coverDataUrl from '../../src-tauri/icons/32x32.png?inline'
import { streak, day } from './writing-statistics-data'
import { activityBooks, activityFixture } from './activity-data'
import type { StreakRequest } from '../../src/features/activity/current-streak'
import type { StatisticsRequest } from '../../src/features/activity/daily-statistics'

Object.assign(globalThis, { isTauri: true })
const mode = new URLSearchParams(location.search).get('state')
const polish = new URLSearchParams(location.search).has('polish')
const libraryBooks = polish
  ? [
      { ...activityBooks[0], title: 'Тиха історія', deadline: '2027-01-01' },
      {
        ...activityBooks[1],
        title: 'НадзвичайноДовгаНазваУкраїнськоїКниги'.repeat(4),
        targetWordCount: Number.MAX_SAFE_INTEGER,
        coverPath: 'covers/polish.png',
      },
      {
        ...activityBooks[0],
        id: '00000000-0000-4000-8000-000000000003',
        title: 'Українська абетка — Ї, Є, Ґ та апостроф’',
        deadline: '2020-01-01',
        dailyWordGoal: null,
      },
      {
        ...activityBooks[1],
        id: '00000000-0000-4000-8000-000000000004',
        title: 'A fresh page',
      },
    ]
  : activityBooks
const counts = [12500, Number.MAX_SAFE_INTEGER, 0, 250]
let currentReads = 0
let dailyReads = 0
let finishCurrent: (() => void) | undefined
let finishDaily: (() => void) | undefined
Object.assign(globalThis, {
  currentStatisticsReads: () => currentReads,
  dailyStatisticsReads: () => dailyReads,
  completeWritingStatistics: () => {
    finishCurrent?.()
    finishDaily?.()
  },
})
mockIPC((command, payload) => {
  if (command === 'get_writing_schedule') return { revision: 0, history: [] }
  if (command === 'list_books') return libraryBooks
  if (command === 'list_chapters') {
    if (!polish) return []
    const bookId = (payload as { bookId: string }).bookId
    return [
      {
        id: `chapter-${bookId}`,
        bookId,
        title: 'Saved chapter',
        position: 0,
        revision: 1,
        wordCount: counts[libraryBooks.findIndex((book) => book.id === bookId)],
        createdAt: activityBooks[0].createdAt,
        updatedAt: activityBooks[0].updatedAt,
      },
    ]
  }
  if (command === 'read_cover')
    return Array.from(atob(coverDataUrl.split(',')[1]), (character) =>
      character.charCodeAt(0),
    )
  if (command === 'get_current_streak') {
    currentReads++
    const request = payload as StreakRequest
    if (mode === 'failed') throw { code: 'persistence' }
    const response =
      mode === 'empty'
        ? {
            ...streak,
            ...request,
            days: 0,
            exact: true,
            todayState: 'unknown',
            todayCreditedWords: 0,
            startDate: null,
            lastCompletedDate: null,
            boundary: 'empty_history',
          }
        : mode === 'partial'
          ? { ...streak, ...request, exact: false, boundary: 'history_start' }
          : mode === 'unknown'
            ? {
                ...streak,
                ...request,
                days: 0,
                exact: false,
                todayState: 'unknown',
                startDate: null,
                lastCompletedDate: null,
                boundary: 'unknown_day',
              }
            : {
                ...streak,
                ...request,
                ...(request.today > streak.today
                  ? { todayState: 'unknown', todayCreditedWords: 0 }
                  : {}),
              }
    if (mode === 'pending')
      return new Promise((resolve) => {
        finishCurrent = () => resolve(response)
      })
    return response
  }
  if (command === 'get_longest_streak')
    return {
      ...(payload as StreakRequest),
      days: mode === 'empty' ? 0 : 3,
      exact: mode !== 'unknown',
      historyStartDate: mode === 'empty' ? null : '2026-10-24',
      startDate: mode === 'empty' ? null : '2026-10-26',
      endDate: mode === 'empty' ? null : '2026-10-28',
    }
  if (command === 'get_daily_statistics') {
    dailyReads++
    const request = payload as StatisticsRequest
    if (mode === 'failed' || (mode === 'day-failure' && dailyReads === 1))
      throw { code: 'persistence' }
    const response =
      request.startDate === day.date &&
      request.endDate === day.date &&
      mode !== 'empty'
        ? {
            ...request,
            days: [
              mode === 'unknown'
                ? {
                    ...day,
                    bookGoals: day.bookGoals.map((goal) => ({
                      ...goal,
                      dailyWordGoal: null,
                      scheduled: true,
                      state: 'unconfigured',
                      remainingWords: null,
                    })),
                  }
                : day,
            ],
          }
        : activityFixture(request, true)
    if (mode === 'pending' || (mode === 'stale' && dailyReads === 1))
      return new Promise((resolve) => {
        finishDaily = () => resolve(response)
      })
    return response
  }
  throw { code: 'persistence' }
})
createRoot(document.getElementById('root')!).render(<App />)
