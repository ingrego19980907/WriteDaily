// Test-only IPC scenarios, excluded from the production entry. Never stores writing.
import '../../src/styles/global.css'
import { createRoot } from 'react-dom/client'
import { mockIPC } from '@tauri-apps/api/mocks'
import App from '../../src/app/App'
import { createEmptyChapterContent } from '../../src/features/editor/chapter-content'
import type {
  ChapterSummary,
  ChapterDetails,
} from '../../src/features/editor/chapter'
import type { Book } from '../../src/features/library/book'

const book: Book = {
  id: '8af2b704-45bc-4e41-8e25-d12f427da441',
  title: 'A quiet story',
  targetWordCount: 2000,
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
const scenario = new URLSearchParams(location.search).get('scenario')
Object.assign(globalThis, { isTauri: true })
mockIPC((command, payload) => {
  if (command === 'list_books') return [book]
  if (command === 'get_book') return book
  if (command === 'list_chapters') {
    listAttempts += 1
    if (scenario === 'errors' && listAttempts === 1)
      throw { code: 'persistence' }
    return structuredClone(chapters)
  }
  const args = payload as {
    bookId: string
    id: string
    details: ChapterDetails
    expectedRevision: number
    confirmed: boolean
  }
  if (args.bookId !== book.id) throw new Error('Unscoped test IPC')
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
    }
    chapters = [...chapters, chapter]
    return { ...chapter, content: createEmptyChapterContent() }
  }
  const index = chapters.findIndex((chapter) => chapter.id === args.id)
  if (index < 0) throw { code: 'not_found' }
  if (command === 'get_chapter')
    return { ...chapters[index], content: createEmptyChapterContent() }
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
})
createRoot(document.getElementById('root')!).render(<App />)
