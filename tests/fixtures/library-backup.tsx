// Browser-only IPC fixtures; real backup construction is verified natively.
import '../../src/styles/global.css'
import { createRoot } from 'react-dom/client'
import { mockIPC } from '@tauri-apps/api/mocks'
import { Library } from '../../src/features/library/Library'

const scenario =
  new URLSearchParams(location.search).get('scenario') ?? 'pending'
Object.assign(globalThis, { isTauri: scenario !== 'browser' })
let attempts = 0
let finish: (() => void) | undefined
const created = {
  status: 'created',
  fileName: 'Моя бібліотека.zip',
  createdAt: '2026-10-29T12:00:00.000Z',
  bookCount: 0,
  chapterCount: 0,
  coverCount: 0,
}
Object.assign(globalThis, {
  completeBackup: () => finish?.(),
  backupAttempts: () => attempts,
})
mockIPC((command, args) => {
  if (command === 'list_books') return []
  if (command === 'get_writing_schedule') return { revision: 0, history: [] }
  if (command === 'create_library_backup') {
    attempts++
    const request = args as Record<string, unknown>
    if (Object.keys(request).join() !== 'labels') throw { code: 'validation' }
    if (scenario === 'pending')
      return new Promise((resolve) => {
        finish = () => resolve(created)
      })
    if (scenario === 'cancel' && attempts === 1) return { status: 'cancelled' }
    if (scenario === 'failure' && attempts === 1)
      throw { code: 'invalid_source', message: 'C:\\private\\library' }
    return created
  }
  throw { code: 'persistence' }
})
createRoot(document.getElementById('root')!).render(
  <main className="p-4">
    <h1>My Library</h1>
    <Library />
  </main>,
)
