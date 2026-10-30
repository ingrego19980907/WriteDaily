import { invoke, isTauri } from '@tauri-apps/api/core'

export type BackupResult =
  | { readonly status: 'cancelled' }
  | {
      readonly status: 'created'
      readonly fileName: string
      readonly createdAt: string
      readonly bookCount: number
      readonly chapterCount: number
      readonly coverCount: number
    }

export async function createLibraryBackup(labels: {
  readonly title: string
  readonly fileType: string
}): Promise<BackupResult> {
  if (!isTauri()) throw { code: 'desktop_required' }
  const result = await invoke<unknown>('create_library_backup', {
    labels: { title: labels.title, fileType: labels.fileType },
  })
  if (typeof result === 'object' && result !== null && 'status' in result) {
    if (result.status === 'cancelled') return { status: 'cancelled' }
    if (
      result.status === 'created' &&
      'fileName' in result &&
      typeof result.fileName === 'string' &&
      result.fileName.length > 4 &&
      result.fileName.length <= 255 &&
      result.fileName.toLowerCase().endsWith('.zip') &&
      !/[\p{Cc}<>:"/\\|?*]/u.test(result.fileName) &&
      'createdAt' in result &&
      typeof result.createdAt === 'string' &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(result.createdAt) &&
      Number.isFinite(Date.parse(result.createdAt)) &&
      new Date(result.createdAt).toISOString() === result.createdAt &&
      'bookCount' in result &&
      natural(result.bookCount) &&
      'chapterCount' in result &&
      natural(result.chapterCount) &&
      'coverCount' in result &&
      natural(result.coverCount) &&
      result.coverCount <= result.bookCount &&
      (result.bookCount > 0 || result.chapterCount === 0)
    )
      return {
        status: 'created',
        fileName: result.fileName,
        createdAt: result.createdAt,
        bookCount: result.bookCount,
        chapterCount: result.chapterCount,
        coverCount: result.coverCount,
      }
  }
  throw { code: 'invalid_response' }
}

function natural(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}
