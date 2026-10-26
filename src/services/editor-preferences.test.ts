import { beforeEach, expect, test, vi } from 'vitest'
import { invoke, isTauri } from '@tauri-apps/api/core'
import {
  getEditorPreferences,
  saveEditorPreferences,
} from './editor-preferences'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: vi.fn() }))
const snapshot = { schemaVersion: 1, fontSize: 24, revision: 2 }
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(isTauri).mockReturnValue(true)
  vi.mocked(invoke).mockResolvedValue(snapshot)
})
test('loads and saves only validated native preferences through narrow commands', async () => {
  const loaded = await getEditorPreferences()
  expect(loaded).toEqual(snapshot)
  expect(loaded).not.toBe(snapshot)
  await expect(saveEditorPreferences(24, 1)).resolves.toEqual(snapshot)
  expect(vi.mocked(invoke).mock.calls).toEqual([
    ['get_editor_preferences', {}],
    [
      'save_editor_preferences',
      { change: { fontSize: 24, expectedRevision: 1 } },
    ],
  ])
})
test('browser preview has no preference persistence fallback', async () => {
  vi.mocked(isTauri).mockReturnValue(false)
  await expect(getEditorPreferences()).rejects.toEqual({
    code: 'desktop_required',
  })
  await expect(saveEditorPreferences(18, 1)).rejects.toEqual({
    code: 'desktop_required',
  })
  expect(invoke).not.toHaveBeenCalled()
})
test('invalid size and revision never reach IPC', async () => {
  for (const [size, revision] of [
    [11, 1],
    [33, 1],
    [18.5, 1],
    [18, 0],
    [18, Infinity],
    [18, Number.MAX_SAFE_INTEGER + 1],
  ])
    await expect(saveEditorPreferences(size, revision)).rejects.toEqual({
      code: 'validation',
    })
  expect(invoke).not.toHaveBeenCalled()
})
test('invalid native replies and persistence failures never become applied settings', async () => {
  vi.mocked(invoke).mockResolvedValueOnce({ ...snapshot, fontSize: 100 })
  await expect(getEditorPreferences()).rejects.toEqual({
    code: 'invalid_stored_data',
  })
  const error = { code: 'conflict' }
  vi.mocked(invoke).mockRejectedValueOnce(error)
  await expect(saveEditorPreferences(24, 1)).rejects.toBe(error)
})
