import { beforeEach, expect, test, vi } from 'vitest'
import { isTauri } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { protectWritingClose } from './writing-close'

vi.mock('@tauri-apps/api/core', () => ({ isTauri: vi.fn() }))
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: vi.fn() }))
beforeEach(() => vi.resetAllMocks())

test('desktop close guard blocks pending writing, allows clean close and returns cleanup', async () => {
  vi.mocked(isTauri).mockReturnValue(true)
  let handler!: (event: { preventDefault: () => void }) => void
  const cleanup = vi.fn()
  vi.mocked(getCurrentWindow).mockReturnValue({
    onCloseRequested: vi.fn(async (callback) => {
      handler = callback
      return cleanup
    }),
  } as unknown as ReturnType<typeof getCurrentWindow>)
  let dirty = true
  const blocked = vi.fn()
  const unlisten = await protectWritingClose(() => dirty, blocked)
  const preventDefault = vi.fn()
  handler({ preventDefault })
  expect(preventDefault).toHaveBeenCalledOnce()
  expect(blocked).toHaveBeenCalledOnce()
  dirty = false
  handler({ preventDefault })
  expect(preventDefault).toHaveBeenCalledOnce()
  unlisten()
  expect(cleanup).toHaveBeenCalledOnce()
})

test('plain browser registration does not invoke a native window API', async () => {
  vi.mocked(isTauri).mockReturnValue(false)
  await expect(protectWritingClose(() => true, vi.fn())).resolves.toBeTypeOf(
    'function',
  )
  expect(getCurrentWindow).not.toHaveBeenCalled()
})
