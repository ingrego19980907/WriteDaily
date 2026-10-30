import { invoke, isTauri } from '@tauri-apps/api/core'

export type RestorePreview = {
  readonly token: string
  readonly fileName: string
  readonly createdAt: string
  readonly bookCount: number
  readonly chapterCount: number
  readonly coverCount: number
}
export type RestoreSelection =
  | { readonly status: 'cancelled' }
  | { readonly status: 'prepared'; readonly preview: RestorePreview }
export type RestoreStatus = {
  readonly status: 'ready' | 'close_required' | 'restored'
}

function desktop() {
  if (!isTauri()) throw { code: 'desktop_required' }
}
function natural(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}
function preview(value: unknown): RestorePreview {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('token' in value) ||
    typeof value.token !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      value.token,
    ) ||
    !('fileName' in value) ||
    typeof value.fileName !== 'string' ||
    value.fileName.length <= 4 ||
    value.fileName.length > 255 ||
    !value.fileName.toLowerCase().endsWith('.zip') ||
    /[\p{Cc}<>:"/\\|?*]/u.test(value.fileName) ||
    !('createdAt' in value) ||
    typeof value.createdAt !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.createdAt) ||
    !Number.isFinite(Date.parse(value.createdAt)) ||
    new Date(value.createdAt).toISOString() !== value.createdAt ||
    !('bookCount' in value) ||
    !natural(value.bookCount) ||
    !('chapterCount' in value) ||
    !natural(value.chapterCount) ||
    !('coverCount' in value) ||
    !natural(value.coverCount) ||
    value.coverCount > value.bookCount ||
    (value.bookCount === 0 && value.chapterCount !== 0)
  )
    throw { code: 'invalid_response' }
  return {
    token: value.token,
    fileName: value.fileName,
    createdAt: value.createdAt,
    bookCount: value.bookCount,
    chapterCount: value.chapterCount,
    coverCount: value.coverCount,
  }
}
function status(value: unknown): RestoreStatus {
  if (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    typeof value.status === 'string' &&
    ['ready', 'close_required', 'restored'].includes(value.status)
  )
    return { status: value.status as RestoreStatus['status'] }
  throw { code: 'invalid_response' }
}
export async function prepareLibraryRestore(labels: {
  readonly title: string
  readonly fileType: string
}): Promise<RestoreSelection> {
  desktop()
  const result = await invoke<unknown>('prepare_library_restore', {
    labels: { title: labels.title, fileType: labels.fileType },
  })
  if (typeof result === 'object' && result !== null && 'status' in result) {
    if (result.status === 'cancelled') return { status: 'cancelled' }
    if (result.status === 'prepared' && 'preview' in result)
      return { status: 'prepared', preview: preview(result.preview) }
  }
  throw { code: 'invalid_response' }
}
export async function cancelLibraryRestore(token: string): Promise<void> {
  desktop()
  await invoke('cancel_library_restore', { token })
}
export async function applyLibraryRestore(
  token: string,
): Promise<RestoreStatus> {
  desktop()
  const result = status(
    await invoke('apply_library_restore', { token, confirmed: true }),
  )
  if (result.status !== 'restored') throw { code: 'invalid_response' }
  return result
}
export async function getLibraryRestoreStatus(): Promise<RestoreStatus> {
  desktop()
  return status(await invoke('get_library_restore_status'))
}
export async function closeAfterLibraryRestore(): Promise<void> {
  desktop()
  await invoke('close_after_library_restore')
}
