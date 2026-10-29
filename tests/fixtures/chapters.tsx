// Test-only IPC scenarios, excluded from the production entry. Never stores writing.
import '../../src/styles/global.css'
import { createRoot } from 'react-dom/client'
import { mockIPC, mockWindows } from '@tauri-apps/api/mocks'
import { emit } from '@tauri-apps/api/event'
import App from '../../src/app/App'
import {
  createEmptyChapterContent,
  validateChapterContent,
  type ChapterContent,
} from '../../src/features/editor/chapter-content'
import contentCases from './chapter-content.json'
import { countChapterWords } from '../../src/features/editor/word-count'
import type {
  ChapterSummary,
  ChapterDetails,
} from '../../src/features/editor/chapter'
import type { Book } from '../../src/features/library/book'
import type { ActivitySubmission } from '../../src/features/activity/activity'
import type { AchievementUnlock } from '../../src/features/achievements/achievement-unlocks'

const book: Book = {
  id: '8af2b704-45bc-4e41-8e25-d12f427da441',
  title: 'A quiet story',
  targetWordCount: new URLSearchParams(location.search)
    .get('scenario')
    ?.startsWith('goal-')
    ? 2
    : 2000,
  dailyWordGoal: null,
  deadline: null,
  coverPath: null,
  completedAt: null,
  createdAt: '2026-10-25T10:00:00.000Z',
  updatedAt: '2026-10-25T10:00:00.000Z',
}
const first: ChapterSummary = {
  id: '00000000-0000-4000-8000-000000000001',
  bookId: book.id,
  title: 'Розділ'.repeat(30),
  position: 0,
  revision: 1,
  wordCount: null,
  createdAt: book.createdAt,
  updatedAt: book.updatedAt,
}
let chapters = [
  first,
  { ...first, id: '00000000-0000-4000-8000-000000000002', position: 1 },
]
let listAttempts = 0
let createAttempts = 0
let renameAttempts = 0
let deleteAttempts = 0
let saveAttempts = 0
const activityReceipts = new Map<
  string,
  { fingerprint: string; revision: number }
>()
const activityEvents: ActivitySubmission[] = []
const activityRequests: ActivitySubmission[] = []
let destroyed = false
let finishSave: (() => void) | undefined
let finishRead: (() => void) | undefined
let finishReorder: (() => void) | undefined
let reorderAttempts = 0
let targetReads = 0
let preferenceReads = 0
let preferenceWrites = 0
let preferences = { schemaVersion: 1, fontSize: 18, revision: 1 }
let finishPreferenceSave: (() => void) | undefined
const chapterReads: string[] = []
const seed = validateChapterContent({
  schemaVersion: 1,
  document: {
    type: 'doc',
    content: contentCases
      .filter((item) => item.valid && item.input.schemaVersion === 1)
      .flatMap((item) => item.input.document.content),
  },
})
if (!seed.success) throw new Error('Invalid test editor seed')
const manuscripts = new Map<string, ChapterContent>([[first.id, seed.data]])
const requestedScenario = new URLSearchParams(location.search).get('scenario')
const scenario = requestedScenario?.replace(/^goal-/, 'editor-')
const noticeMode = new URLSearchParams(location.search).get('notice')
const noticeUnlocks = new Map<string, AchievementUnlock>()
const noticeClaims = new Set<string>()
let claimFault = false
let finishNotice: (() => void) | undefined
let noticeAttempts = 0
if (noticeMode === 'old') {
  noticeUnlocks.set('first_words', {
    achievementId: 'first_words',
    rulePolicyVersion: 1,
    unlockedAt: '2026-10-28T10:00:00.000Z',
  })
  noticeClaims.add('first_words')
}
function recordNotices(words: number) {
  if (!noticeMode) return
  for (const [id, threshold] of [
    ['first_words', 100],
    ['getting_started', 1000],
    ['storyteller', 10000],
    ['novelist', 50000],
  ] as const) {
    if (words >= threshold && !noticeUnlocks.has(id))
      noticeUnlocks.set(id, {
        achievementId: id,
        rulePolicyVersion: 1,
        unlockedAt: '2026-10-29T10:00:00.000Z',
      })
  }
  void emit('achievement-unlocks-changed')
}
if (requestedScenario?.startsWith('reorder'))
  chapters = chapters.map((chapter) => ({ ...chapter, title: 'Chapter' }))
if (requestedScenario?.startsWith('goal-')) {
  chapters = chapters.map((chapter) => ({ ...chapter, wordCount: 0 }))
  manuscripts.clear()
}
if (scenario?.startsWith('book-count-') || scenario?.startsWith('activity-')) {
  chapters = chapters.map((chapter) => ({ ...chapter, wordCount: 0 }))
  for (const chapter of chapters)
    manuscripts.set(chapter.id, createEmptyChapterContent())
}
Object.assign(globalThis, { isTauri: true })
mockWindows('main')
Object.assign(globalThis, {
  requestTestClose: () => emit('tauri://close-requested'),
  testWindowDestroyed: () => destroyed,
  completeTestSave: () => finishSave?.(),
  testSaveAttempts: () => saveAttempts,
  testActivityEvents: () => structuredClone(activityEvents),
  testActivityRequests: () => structuredClone(activityRequests),
  testChapterReads: () => [...chapterReads],
  completeTestRead: () => finishRead?.(),
  completeTestReorder: () => finishReorder?.(),
  completePreferenceSave: () => finishPreferenceSave?.(),
  testPreferenceWrites: () => preferenceWrites,
  completeTestNotice: () => finishNotice?.(),
  testNoticeClaims: () => noticeAttempts,
  wakeTestAchievements: () => emit('achievement-unlocks-changed'),
})
mockIPC(
  (command, payload) => {
    if (noticeMode && command === 'claim_achievement_notifications') {
      noticeAttempts++
      const pending = [...noticeUnlocks.values()].filter(
        (row) => !noticeClaims.has(row.achievementId),
      )
      if (pending.length && noticeMode === 'claim-failure' && !claimFault) {
        claimFault = true
        throw { code: 'persistence' }
      }
      const claim = () => {
        for (const row of pending) noticeClaims.add(row.achievementId)
        return structuredClone(pending)
      }
      if (pending.length && noticeMode === 'pending-claim')
        return new Promise((resolve) => {
          finishNotice = () => resolve(claim())
        })
      const result = claim()
      if (pending.length && noticeMode === 'claim-lost' && !claimFault) {
        claimFault = true
        throw { code: 'persistence' }
      }
      return result
    }
    if (noticeMode && command === 'get_achievement_unlocks')
      return [...noticeUnlocks.values()]
    if (noticeMode && command === 'refresh_achievements')
      return { unlocks: [...noticeUnlocks.values()], newlyUnlocked: [] }
    if (command === 'get_writing_schedule') return { revision: 0, history: [] }
    if (command === 'get_editor_preferences') {
      preferenceReads += 1
      if (scenario === 'preferences-read-failure' && preferenceReads === 1)
        throw { code: 'persistence' }
      return { ...preferences }
    }
    if (command === 'save_editor_preferences') {
      const { change } = payload as {
        change: { fontSize: number; expectedRevision: number }
      }
      preferenceWrites += 1
      if (scenario === 'preferences-save-failure' && preferenceWrites === 1)
        throw { code: 'persistence' }
      if (scenario === 'preferences-conflict' && preferenceWrites === 1) {
        preferences = { schemaVersion: 1, fontSize: 22, revision: 2 }
        throw { code: 'conflict' }
      }
      if (change.expectedRevision !== preferences.revision)
        throw { code: 'conflict' }
      if (
        !Number.isInteger(change.fontSize) ||
        change.fontSize < 12 ||
        change.fontSize > 32
      )
        throw { code: 'validation' }
      const commit = () => {
        preferences = {
          ...preferences,
          fontSize: change.fontSize,
          revision: preferences.revision + 1,
        }
        return { ...preferences }
      }
      if (scenario === 'preferences-pending')
        return new Promise((resolve) => {
          finishPreferenceSave = () => resolve(commit())
        })
      return commit()
    }
    if (command === 'plugin:window|destroy') {
      destroyed = true
      return
    }
    if (command === 'list_books') return [book]
    if (command === 'get_book') return book
    if (command === 'list_chapters') {
      listAttempts += 1
      if (scenario === 'errors' && listAttempts === 2)
        throw { code: 'persistence' }
      return structuredClone(chapters)
    }
    const args = payload as {
      bookId: string
      id: string
      details: ChapterDetails
      expectedRevision: number
      confirmed: boolean
      contentJson: string
      activityJson: string
    }
    if (args.bookId !== book.id) throw new Error('Unscoped test IPC')
    if (command === 'reorder_chapters') {
      const change = payload as {
        expected: { id: string; revision: number }[]
        chapterIds: string[]
      }
      reorderAttempts++
      if (scenario === 'reorder-conflict' && reorderAttempts === 1) {
        chapters = chapters.map((chapter) => ({
          ...chapter,
          revision: chapter.revision + 1,
        }))
        throw { code: 'conflict' }
      }
      if (
        change.expected.length !== chapters.length ||
        change.expected.some(
          (item, position) =>
            item.id !== chapters[position].id ||
            item.revision !== chapters[position].revision,
        )
      )
        throw { code: 'conflict' }
      if (
        change.chapterIds.length !== chapters.length ||
        new Set(change.chapterIds).size !== chapters.length ||
        change.chapterIds.some(
          (id) => !chapters.some((chapter) => chapter.id === id),
        )
      )
        throw { code: 'validation' }
      const commit = () => {
        chapters = change.chapterIds.map((id, position) => {
          const chapter = chapters.find((item) => item.id === id)!
          return {
            ...chapter,
            position,
            revision:
              chapter.position === position
                ? chapter.revision
                : chapter.revision + 1,
          }
        })
        return structuredClone(chapters)
      }
      if (scenario === 'reorder-pending')
        return new Promise((resolve) => {
          finishReorder = () => resolve(commit())
        })
      return commit()
    }
    if (command === 'create_chapter') {
      createAttempts += 1
      if (scenario === 'errors' && createAttempts === 1)
        throw { code: 'validation', reason: 'too_long' }
      if (scenario === 'errors' && createAttempts === 2)
        throw { code: 'persistence' }
      const chapter = {
        ...first,
        id: crypto.randomUUID(),
        title: args.details.title,
        position: chapters.length,
        wordCount: 0,
      }
      chapters = [...chapters, chapter]
      return { ...chapter, content: createEmptyChapterContent() }
    }
    const index = chapters.findIndex((chapter) => chapter.id === args.id)
    if (index < 0) throw { code: 'not_found' }
    if (command === 'get_chapter') {
      chapterReads.push(args.id)
      if (args.id !== first.id) {
        targetReads += 1
        if (scenario === 'navigation-failure' && targetReads === 1)
          throw { code: 'persistence' }
        if (scenario === 'navigation-invalid')
          return {
            ...chapters[index],
            content: {
              schemaVersion: 999,
              document: { type: 'doc', content: [] },
            },
          }
        if (scenario === 'navigation-slow' && targetReads === 1)
          return new Promise((resolve) => {
            finishRead = () =>
              resolve({
                ...chapters[index],
                content:
                  manuscripts.get(args.id) ?? createEmptyChapterContent(),
              })
          })
      }
      if (scenario === 'editor-invalid')
        return {
          ...chapters[index],
          content: {
            schemaVersion: 999,
            document: { type: 'doc', content: [] },
          },
        }
      return {
        ...chapters[index],
        content: manuscripts.get(args.id) ?? createEmptyChapterContent(),
      }
    }
    if (command === 'save_chapter_content') {
      saveAttempts += 1
      const activity = JSON.parse(args.activityJson) as ActivitySubmission
      if (
        activity.policyVersion !== 1 ||
        !activity.operationId ||
        !activity.segments.length
      )
        throw { code: 'validation' }
      activityRequests.push(structuredClone(activity))
      const fingerprint = JSON.stringify([
        args.bookId,
        args.id,
        args.expectedRevision,
        args.contentJson,
        activity,
      ])
      const receipt = activityReceipts.get(activity.operationId)
      if (receipt) {
        if (
          receipt.fingerprint !== fingerprint ||
          receipt.revision !== chapters[index].revision
        )
          throw { code: 'conflict' }
        if (noticeMode) void emit('achievement-unlocks-changed')
        return { ...chapters[index], content: manuscripts.get(args.id) }
      }
      if (scenario === 'editor-conflict') throw { code: 'conflict' }
      if (
        (scenario === 'editor-failure' || scenario === 'book-count-failure') &&
        saveAttempts === 1
      )
        throw { code: 'persistence' }
      if (args.expectedRevision !== chapters[index].revision)
        throw { code: 'conflict' }
      const result = validateChapterContent(JSON.parse(args.contentJson))
      if (!result.success) throw { code: 'validation', reason: result.code }
      const commit = () => {
        chapters[index] = {
          ...chapters[index],
          revision: chapters[index].revision + 1,
          wordCount: countChapterWords(result.data),
        }
        manuscripts.set(args.id, result.data)
        activityEvents.push(structuredClone(activity))
        activityReceipts.set(activity.operationId, {
          fingerprint,
          revision: chapters[index].revision,
        })
        recordNotices(chapters[index].wordCount ?? 0)
        return { ...chapters[index], content: result.data }
      }
      if (
        scenario === 'editor-pending' ||
        scenario === 'book-count-pending' ||
        scenario === 'activity-pending'
      )
        return new Promise((resolve) => {
          finishSave = () => resolve(commit())
        })
      if (scenario === 'activity-lost-response' && saveAttempts === 1) {
        commit()
        throw { code: 'persistence' }
      }
      return commit()
    }
    if (command === 'rename_chapter') {
      renameAttempts += 1
      if (scenario === 'conflicts' && renameAttempts === 1) {
        chapters[index] = {
          ...chapters[index],
          title: 'Changed elsewhere',
          revision: chapters[index].revision + 1,
        }
        throw { code: 'conflict' }
      }
      if (args.expectedRevision !== chapters[index].revision)
        throw { code: 'conflict' }
      chapters[index] = {
        ...chapters[index],
        title: args.details.title,
        revision: chapters[index].revision + 1,
      }
      return { ...chapters[index], content: createEmptyChapterContent() }
    }
    if (command === 'delete_chapter') {
      deleteAttempts += 1
      if (!args.confirmed) throw new Error('Unconfirmed test deletion')
      if (scenario === 'conflicts' && deleteAttempts === 1) {
        chapters[index] = {
          ...chapters[index],
          title: 'Review before deleting',
          revision: chapters[index].revision + 1,
        }
        throw { code: 'conflict' }
      }
      if (args.expectedRevision !== chapters[index].revision)
        throw { code: 'conflict' }
      chapters = chapters
        .filter((chapter) => chapter.id !== args.id)
        .map((chapter, position) => ({
          ...chapter,
          position,
          revision: chapter.revision + (chapter.position === position ? 0 : 1),
        }))
      return structuredClone(chapters)
    }
    throw new Error(`Unexpected test command: ${command}`)
  },
  { shouldMockEvents: true },
)
createRoot(document.getElementById('root')!).render(<App />)
