// Test-only IPC responses. This page is not a production entry or SQLite test.
import '../../src/styles/global.css'
import { createRoot } from 'react-dom/client'
import { mockIPC } from '@tauri-apps/api/mocks'
import type { Book, BookDetails } from '../../src/features/library/book'
import App from '../../src/app/App'

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
mockIPC((command, payload) => {
  if (command === 'list_books') return [original]
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
    return undefined
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
