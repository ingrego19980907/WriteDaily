// Isolated native-response scenarios. No real database or production fallback.
import '../../src/styles/global.css'
import { createRoot } from 'react-dom/client'
import { mockIPC } from '@tauri-apps/api/mocks'
import App from '../../src/app/App'
import type { AchievementUnlock } from '../../src/features/achievements/achievement-unlocks'

Object.assign(globalThis, { isTauri: true })
const mode = new URLSearchParams(location.search).get('state')
const first: AchievementUnlock = {
  achievementId: 'first_words',
  rulePolicyVersion: 1,
  unlockedAt: '2026-10-28T10:00:00.000Z',
}
let stored: AchievementUnlock[] =
  mode === 'empty' || mode === 'lost-response' || mode === 'pending-refresh'
    ? []
    : [first]
let reads = 0
let refreshes = 0
let failing = false
let finishRead: (() => void) | undefined
let finishRefresh: (() => void) | undefined
Object.assign(globalThis, {
  achievementRequests: () => ({ reads, refreshes }),
  failAchievementReads: () => {
    failing = true
  },
  completeAchievementRead: () => finishRead?.(),
  completeAchievementRefresh: () => finishRefresh?.(),
})
mockIPC((command) => {
  if (command === 'get_writing_schedule') return { revision: 0, history: [] }
  if (command === 'list_books' || command === 'list_chapters') return []
  if (command === 'get_achievement_unlocks') {
    reads++
    if (failing || (mode === 'initial-failure' && reads === 1))
      throw { code: 'persistence' }
    if ((mode === 'pending-read' || mode === 'late-read') && reads === 1)
      return new Promise((resolve) => {
        finishRead = () => resolve(mode === 'late-read' ? [] : stored)
      })
    return stored
  }
  if (command === 'refresh_achievements') {
    refreshes++
    if (mode === 'refresh-failure' && refreshes === 1)
      throw { code: 'persistence' }
    if (mode === 'malformed' && refreshes === 1)
      return {
        unlocks: stored,
        newlyUnlocked: [{ ...first, achievementId: 'unknown' }],
      }
    if (mode === 'lost-response' && refreshes === 1) {
      stored = [first]
      throw { code: 'persistence' }
    }
    if (mode === 'pending-refresh' && refreshes === 1)
      return new Promise((resolve) => {
        finishRefresh = () => {
          stored = [first]
          resolve({ unlocks: stored, newlyUnlocked: [first] })
        }
      })
    return { unlocks: stored, newlyUnlocked: [] }
  }
  throw { code: 'persistence' }
})
createRoot(document.getElementById('root')!).render(<App />)
