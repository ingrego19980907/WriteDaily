// Test-only IPC responses; production book selection uses the real repository.
import '../../src/styles/global.css'
import { createRoot } from 'react-dom/client'
import { mockIPC } from '@tauri-apps/api/mocks'
import App from '../../src/app/App'
import { activityBooks } from './activity-data'

Object.assign(globalThis, { isTauri: true })
const state = new URLSearchParams(location.search).get('state')
const books = activityBooks.map((book) => ({ ...book, title: 'A quiet story' }))
let reads = 0
let opens = 0
let finish: (() => void) | undefined
Object.assign(globalThis, { completeEditorOpen: () => finish?.() })
mockIPC((command, payload) => {
  if (command === 'get_writing_schedule') return { revision: 0, history: [] }
  if (command === 'list_books') {
    reads++
    if (state === 'read-failure' && reads === 2) throw { code: 'persistence' }
    return state === 'empty' ? [] : books
  }
  if (command === 'list_chapters') return []
  if (command === 'get_book') {
    opens++
    if (state === 'open-failure' && opens === 1) throw { code: 'not_found' }
    const index = books.findIndex(
      (book) => book.id === (payload as { id: string }).id,
    )
    if (index < 0) throw { code: 'not_found' }
    const book = {
      ...books[index],
      title: `A quiet story (latest ${index + 1})`,
    }
    if (state === 'pending')
      return new Promise((resolve) => {
        finish = () => resolve(book)
      })
    return book
  }
  throw { code: 'persistence' }
})
createRoot(document.getElementById('root')!).render(<App />)
