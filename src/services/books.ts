import { invoke, isTauri } from '@tauri-apps/api/core'
import type { Book, BookDetails } from '../features/library/book'

export function createBook(details: BookDetails): Promise<Book> {
  if (!isTauri()) return Promise.reject({ code: 'desktop_required' })
  return invoke<Book>('create_book', { details })
}
