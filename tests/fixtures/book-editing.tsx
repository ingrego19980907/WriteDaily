// Test-only IPC responses. This page is not a production entry or SQLite test.
import '../../src/styles/global.css'
import { createRoot } from 'react-dom/client'
import { mockIPC } from '@tauri-apps/api/mocks'
import type { Book, BookDetails } from '../../src/features/library/book'
import App from '../../src/app/App'
import coverDataUrl from '../../src-tauri/icons/32x32.png?inline'

const original: Book = {
  id: '8af2b704-45bc-4e41-8e25-d12f427da441',
  title: 'A quiet story',
  targetWordCount: 50000,
  dailyWordGoal: 500,
  deadline: '2027-01-01',
  coverPath: null,
  completedAt: null,
  createdAt: '2026-10-24T10:00:00.000Z',
  updatedAt: '2026-10-24T10:00:00.000Z',
}
Object.assign(globalThis, { isTauri: true })
let stateListAttempts = 0
mockIPC((command, payload) => {
  if (command === 'list_chapters') return []
  if (command === 'list_books') {
    const state = new URLSearchParams(location.search).get('state')
    if (state === 'empty') return []
    if (state === 'loading') return new Promise(() => {})
    if (state === 'retry') {
      stateListAttempts += 1
      if (stateListAttempts === 1) throw { code: 'persistence' }
      return []
    }
    if (new URLSearchParams(location.search).has('grid'))
      return [
        original,
        {
          ...original,
          id: 'second',
          title: original.title,
          targetWordCount: 2000,
        },
        {
          ...original,
          id: 'third',
          title: 'Третя історія',
          targetWordCount: null,
        },
      ]
    if (new URLSearchParams(location.search).has('cards'))
      return [
        { ...original, title: 'ДовгаНазва'.repeat(22) },
        {
          ...original,
          id: 'second',
          title: 'Історія з обкладинкою',
          coverPath: `covers/${original.id}.png`,
          targetWordCount: null,
          completedAt: original.createdAt,
        },
        {
          ...original,
          id: 'third',
          title: 'Unavailable cover',
          coverPath: 'covers/missing.png',
        },
      ]
    return [original]
  }
  if (
    command === 'create_book' &&
    new URLSearchParams(location.search).has('state')
  ) {
    throw {
      code: 'validation',
      issues: [
        { field: 'title', code: 'too_long' },
        { field: 'dailyWordGoal', code: 'invalid_count' },
      ],
    }
  }
  if (
    command === 'get_book' &&
    new URLSearchParams(location.search).has('grid')
  ) {
    const id = (payload as { id: string }).id
    return { ...original, id, targetWordCount: id === 'second' ? 2000 : 1000 }
  }
  if (command === 'get_book')
    return {
      ...original,
      title: 'Latest details',
      updatedAt: '2026-10-24T11:00:00.000Z',
    }
  if (command === 'delete_book') {
    const { id, expectedUpdatedAt, confirmed } = payload as {
      id: string
      expectedUpdatedAt: string
      confirmed: boolean
    }
    if (id !== original.id || confirmed !== true)
      throw new Error('Unconfirmed test deletion')
    if (expectedUpdatedAt === original.updatedAt) throw { code: 'conflict' }
    return { cleanupPending: false }
  }
  if (command === 'read_cover') {
    if (
      (payload as { expectedPath: string }).expectedPath ===
      'covers/missing.png'
    )
      throw new Error('Missing test image')
    return Array.from(atob(coverDataUrl.split(',')[1]), (character) =>
      character.charCodeAt(0),
    )
  }
  if (command === 'set_cover') {
    const { bytes } = payload as { bytes: number[] | null }
    if (bytes && bytes[0] !== 137) throw { code: 'invalid_image' }
    return {
      book: {
        ...original,
        coverPath: bytes ? `covers/${original.id}.png` : null,
        updatedAt: '2026-10-24T12:00:00.000Z',
      },
      cleanupPending: false,
    }
  }
  if (command === 'update_book') {
    const { id, expectedUpdatedAt, details } = payload as {
      id: string
      expectedUpdatedAt: string
      details: BookDetails
    }
    if (id !== original.id || !expectedUpdatedAt)
      throw new Error('Missing book identity/revision')
    if (details.title === 'Conflict draft') throw { code: 'conflict' }
    if (details.title === 'Failed draft') throw { code: 'persistence' }
    return { ...original, ...details, updatedAt: '2026-10-24T12:00:00.000Z' }
  }
  throw new Error(`Unexpected test command: ${command}`)
})
createRoot(document.getElementById('root')!).render(<App />)
