import { invoke, isTauri } from '@tauri-apps/api/core'
import type { ChapterOrderEntry } from '../features/editor/chapter'

function validFileName(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 4 &&
    value.length <= 255 &&
    value.toLowerCase().endsWith('.txt') &&
    !/[\p{Cc}<>:"/\\|?*]/u.test(value)
  )
}

export type ChapterExportResult =
  | { readonly status: 'cancelled' }
  | {
      readonly status: 'exported'
      readonly fileName: string
      readonly revision: number
    }

/** No paths or manuscript text cross this boundary. Native code owns the saved
 * snapshot, system picker and completed file write. Cancellation is not success. */
export async function exportChapter(
  bookId: string,
  id: string,
  expectedRevision: number,
  labels: { readonly title: string; readonly fileType: string },
): Promise<ChapterExportResult> {
  if (!isTauri()) throw { code: 'desktop_required' }
  const result = await invoke<unknown>('export_chapter', {
    bookId,
    id,
    expectedRevision,
    labels: { title: labels.title, fileType: labels.fileType },
  })
  if (result !== null && typeof result === 'object' && 'status' in result) {
    if (result.status === 'cancelled') return { status: 'cancelled' }
    if (
      result.status === 'exported' &&
      'fileName' in result &&
      validFileName(result.fileName) &&
      'revision' in result &&
      typeof result.revision === 'number' &&
      Number.isSafeInteger(result.revision) &&
      result.revision > 0 &&
      result.revision === expectedRevision
    )
      return {
        status: 'exported',
        fileName: result.fileName,
        revision: expectedRevision,
      }
  }
  throw { code: 'invalid_response' }
}

export type BookExportResult =
  | { readonly status: 'cancelled' }
  | {
      readonly status: 'exported'
      readonly fileName: string
      readonly bookUpdatedAt: string
      readonly chapters: readonly ChapterOrderEntry[]
    }

export async function exportBook(
  bookId: string,
  snapshot: {
    readonly bookUpdatedAt: string
    readonly chapters: readonly ChapterOrderEntry[]
  },
  labels: { readonly title: string; readonly fileType: string },
): Promise<BookExportResult> {
  if (!isTauri()) throw { code: 'desktop_required' }
  const expectedBookUpdatedAt = snapshot.bookUpdatedAt
  const expectedChapters = snapshot.chapters.map(({ id, revision }) => ({
    id,
    revision,
  }))
  const result = await invoke<unknown>('export_book', {
    bookId,
    expectedBookUpdatedAt,
    expectedChapters,
    labels: { title: labels.title, fileType: labels.fileType },
  })
  if (result !== null && typeof result === 'object' && 'status' in result) {
    if (result.status === 'cancelled') return { status: 'cancelled' }
    if (
      result.status === 'exported' &&
      'fileName' in result &&
      validFileName(result.fileName) &&
      'bookUpdatedAt' in result &&
      result.bookUpdatedAt === expectedBookUpdatedAt &&
      'chapters' in result &&
      Array.isArray(result.chapters) &&
      expectedChapters.length > 0 &&
      result.chapters.length === expectedChapters.length &&
      new Set(expectedChapters.map((row) => row.id)).size ===
        expectedChapters.length &&
      result.chapters.every(
        (row: unknown, index: number) =>
          row !== null &&
          typeof row === 'object' &&
          'id' in row &&
          row.id === expectedChapters[index].id &&
          'revision' in row &&
          typeof row.revision === 'number' &&
          Number.isSafeInteger(row.revision) &&
          row.revision > 0 &&
          row.revision === expectedChapters[index].revision,
      )
    )
      return {
        status: 'exported',
        fileName: result.fileName,
        bookUpdatedAt: expectedBookUpdatedAt,
        chapters: expectedChapters,
      }
  }
  throw { code: 'invalid_response' }
}
