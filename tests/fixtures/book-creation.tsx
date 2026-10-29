// Isolated browser IPC fixture; no product persistence or SQLite is replaced.
import '../../src/styles/global.css'
import { createRoot } from 'react-dom/client'
import { mockIPC } from '@tauri-apps/api/mocks'
import App from '../../src/app/App'
import type { Book, BookDetails } from '../../src/features/library/book'

const calls: string[] = []
const books: Book[] = []
const covers = new Map<string, number[]>()
let failCover = new URLSearchParams(location.search).has('cover-failure')
Object.assign(window, { isTauri: true, creationCalls: calls })
mockIPC(async (command, payload) => {
  if (command === 'list_books') return books
  if (command === 'list_chapters') return []
  if (command === 'get_writing_schedule') return { revision: 0, history: [] }
  if (command === 'create_book') {
    calls.push(command)
    const { details } = payload as { details: BookDetails }
    const book: Book = {
      ...details,
      id: `created-${books.length + 1}`,
      coverPath: null,
      completedAt: null,
      createdAt: '2026-10-29T10:00:00.000Z',
      updatedAt: '2026-10-29T10:00:00.000Z',
    }
    books.push(book)
    return book
  }
  if (command === 'set_cover') {
    calls.push(command)
    const { id, expectedUpdatedAt, bytes } = payload as {
      id: string
      expectedUpdatedAt: string
      bytes: number[]
    }
    const index = books.findIndex((book) => book.id === id)
    if (index < 0 || books[index].updatedAt !== expectedUpdatedAt)
      throw { code: 'conflict' }
    await new Promise((resolve) => setTimeout(resolve, 700))
    if (failCover) {
      failCover = false
      throw { code: 'persistence' }
    }
    if (bytes[0] !== 137) throw { code: 'invalid_image' }
    covers.set(id, bytes)
    books[index] = {
      ...books[index],
      coverPath: `covers/${id}.png`,
      updatedAt: '2026-10-29T10:00:01.000Z',
    }
    return { book: books[index], cleanupPending: false }
  }
  if (command === 'read_cover')
    return covers.get((payload as { id: string }).id)
  throw new Error(`Unexpected test command: ${command}`)
})
createRoot(document.getElementById('root')!).render(<App />)
