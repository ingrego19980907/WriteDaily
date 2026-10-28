// Test-only responses for UI verification, not a production route or persistence layer.
import '../../src/styles/global.css'
import { createRoot } from 'react-dom/client'
import { mockIPC } from '@tauri-apps/api/mocks'
import App from '../../src/app/App'
import type {
  StatisticsRequest,
  DailyStatisticsRange,
} from '../../src/features/activity/daily-statistics'
import { activityBooks, activityFixture } from './activity-data'

Object.assign(globalThis, { isTauri: true })
const state = new URLSearchParams(location.search).get('state')
let reads = 0
let finish: (() => void) | undefined
Object.assign(globalThis, {
  completeActivityRead: () => finish?.(),
  activityReadCount: () => reads,
})
mockIPC((command, payload) => {
  if (command === 'list_books') {
    if (state === 'books-failure') throw { code: 'persistence' }
    return activityBooks
  }
  if (command === 'list_chapters') return []
  if (command === 'get_daily_statistics') {
    reads++
    const request = payload as StatisticsRequest
    if (state === 'loading') return new Promise(() => {})
    if (state === 'failure' && reads === 1) throw { code: 'persistence' }
    if (state === 'invalid') return { ...request, days: [] }
    if (state === 'removed-book' && request.bookId) throw { code: 'not_found' }
    const response = activityFixture(request, state === 'empty')
    if (state === 'stale' && reads === 1)
      return new Promise<DailyStatisticsRange>((resolve) => {
        finish = () => resolve(response)
      })
    return response
  }
  throw new Error(`Unexpected activity-fixture command: ${command}`)
})
createRoot(document.getElementById('root')!).render(<App />)
