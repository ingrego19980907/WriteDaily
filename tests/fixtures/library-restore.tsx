// Test-only native replies; archive/file replacement is tested with real SQLite separately.
import '../../src/styles/global.css'
import { createRoot } from 'react-dom/client'
import { mockIPC } from '@tauri-apps/api/mocks'
import { LibraryBackup } from '../../src/features/library/LibraryBackup'
const scenario =
  new URLSearchParams(location.search).get('scenario') ?? 'pending'
Object.assign(globalThis, { isTauri: scenario !== 'browser' })
let prepared = 0,
  applied = 0,
  cancelled = 0,
  closed = 0
let state = 'ready'
let complete: (() => void) | undefined
Object.assign(globalThis, {
  restoreFacts: () => ({ prepared, applied, cancelled, closed }),
  completeRestore: () => complete?.(),
})
mockIPC((command, args) => {
  const request = (args ?? {}) as Record<string, unknown>
  if (command === 'prepare_library_restore') {
    prepared++
    if (Object.keys(request).join() !== 'labels') throw { code: 'validation' }
    if (scenario === 'cancel' && prepared === 1) return { status: 'cancelled' }
    if (scenario === 'invalid' && prepared === 1)
      throw { code: 'invalid_backup', message: 'C:\\private\\source.zip' }
    return {
      status: 'prepared',
      preview: {
        token: `00000000-0000-4000-8000-${String(prepared).padStart(12, '0')}`,
        fileName: `${'Бібліотека'.repeat(15)}.zip`,
        createdAt: '2026-10-29T12:00:00.000Z',
        bookCount: 2,
        chapterCount: 5,
        coverCount: 1,
      },
    }
  }
  if (command === 'cancel_library_restore') {
    cancelled++
    return null
  }
  if (command === 'apply_library_restore') {
    if (request.confirmed !== true) throw { code: 'confirmation_required' }
    applied++
    if (scenario === 'rollback' && applied === 1)
      throw { code: 'safety_backup_failed' }
    if (scenario === 'uncertain') {
      state = 'close_required'
      throw { code: 'restore_failed' }
    }
    if (scenario === 'lost') {
      state = 'restored'
      throw { code: 'transport' }
    }
    if (scenario === 'pending')
      return new Promise((resolve) => {
        complete = () => {
          state = 'restored'
          resolve({ status: state })
        }
      })
    state = 'restored'
    return { status: state }
  }
  if (command === 'get_library_restore_status') return { status: state }
  if (command === 'close_after_library_restore') {
    closed++
    return null
  }
  throw { code: 'persistence' }
})
createRoot(document.getElementById('root')!).render(
  <main className="p-4">
    <h1>My Library</h1>
    <LibraryBackup />
  </main>,
)
