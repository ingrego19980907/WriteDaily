import { invoke, isTauri } from '@tauri-apps/api/core'
import {
  isEditorPreferences,
  isFontSize,
  type EditorPreferences,
} from '../features/editor/editor-preferences'

async function request(
  command: string,
  args: Record<string, unknown> = {},
): Promise<EditorPreferences> {
  if (!isTauri()) throw { code: 'desktop_required' }
  const result = await invoke<unknown>(command, args)
  if (!isEditorPreferences(result)) throw { code: 'invalid_stored_data' }
  return {
    schemaVersion: 1,
    fontSize: result.fontSize,
    revision: result.revision,
  }
}
export function getEditorPreferences() {
  return request('get_editor_preferences')
}
export function saveEditorPreferences(
  fontSize: number,
  expectedRevision: number,
) {
  if (
    !isFontSize(fontSize) ||
    !Number.isSafeInteger(expectedRevision) ||
    expectedRevision < 1
  )
    return Promise.reject({ code: 'validation' })
  return request('save_editor_preferences', {
    change: { fontSize, expectedRevision },
  })
}
