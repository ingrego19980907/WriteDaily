import { invoke, isTauri } from '@tauri-apps/api/core'
import type { Book, BookDetails } from '../features/library/book'

export function createBook(details: BookDetails): Promise<Book> {
  if (!isTauri()) return Promise.reject({ code: 'desktop_required' })
  return invoke<Book>('create_book', { details })
}

export function listBooks(): Promise<Book[]> {
  if (!isTauri()) return Promise.reject({ code: 'desktop_required' })
  return invoke<Book[]>('list_books')
}

export function getBook(id: string): Promise<Book> {
  if (!isTauri()) return Promise.reject({ code: 'desktop_required' })
  return invoke<Book>('get_book', { id })
}

export function updateBook(
  id: string,
  expectedUpdatedAt: string,
  details: BookDetails,
): Promise<Book> {
  if (!isTauri()) return Promise.reject({ code: 'desktop_required' })
  return invoke<Book>('update_book', { id, expectedUpdatedAt, details })
}

export function bookErrorCode(error: unknown): unknown {
  return typeof error === 'object' && error !== null && 'code' in error
    ? error.code
    : null
}

/** Call only after explicit user confirmation for this snapshot. */
export function deleteBook(
  id: string,
  expectedUpdatedAt: string,
): Promise<{ cleanupPending: boolean }> {
  if (!isTauri()) return Promise.reject({ code: 'desktop_required' })
  return invoke<{ cleanupPending: boolean }>('delete_book', {
    id,
    expectedUpdatedAt,
    confirmed: true,
  })
}

export type CoverResult = { book: Book; cleanupPending: boolean }
export function setCover(
  id: string,
  expectedUpdatedAt: string,
  bytes: number[] | null,
): Promise<CoverResult> {
  if (!isTauri()) return Promise.reject({ code: 'desktop_required' })
  return invoke<CoverResult>('set_cover', { id, expectedUpdatedAt, bytes })
}
export function readCover(id: string, expectedPath: string): Promise<number[]> {
  if (!isTauri()) return Promise.reject({ code: 'desktop_required' })
  return invoke<number[]>('read_cover', { id, expectedPath })
}
