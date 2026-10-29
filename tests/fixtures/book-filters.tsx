// Test-only IPC responses; never included in production persistence.
import '../../src/styles/global.css'
import { createRoot } from 'react-dom/client'
import { mockIPC } from '@tauri-apps/api/mocks'
import { Library } from '../../src/features/library/Library'
import { activityBooks } from './activity-data'

Object.assign(globalThis, { isTauri: true })
let writes = 0
Object.assign(globalThis, { filterWrites: () => writes })
const books = new URLSearchParams(location.search).has('search')
  ? [
      { ...activityBooks[0], title: 'Українська історія Café' },
      {
        ...activityBooks[1],
        title: 'Історія 東京',
        completedAt: activityBooks[1].updatedAt,
      },
    ]
  : [
      activityBooks[0],
      { ...activityBooks[1], completedAt: activityBooks[1].updatedAt },
    ]
mockIPC((command) => {
  if (command === 'list_books') return books
  if (command === 'list_chapters') return []
  if (command === 'get_writing_schedule') return { revision: 0, history: [] }
  if (['create_book', 'update_book', 'delete_book'].includes(command)) writes++
  throw { code: 'persistence' }
})
createRoot(document.getElementById('root')!).render(
  <main className="p-4">
    <h1>My Library</h1>
    <Library />
  </main>,
)
