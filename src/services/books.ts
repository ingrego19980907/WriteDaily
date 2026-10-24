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
