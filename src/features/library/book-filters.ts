import type { Book } from './book'

/** Unicode-aware, canonically equivalent title matching; stored titles stay untouched. */
export function searchBooks(
  books: readonly Book[],
  query: string,
): readonly Book[] {
  const needle = query.trim().normalize('NFC').toLowerCase().normalize('NFC')
  if (!needle) return books
  return books.filter((book) =>
    book.title.normalize('NFC').toLowerCase().normalize('NFC').includes(needle),
  )
}

export const bookFilters = ['all', 'in-progress', 'completed'] as const
export type BookFilter = (typeof bookFilters)[number]
export type BookFilterCounts = Readonly<Record<BookFilter, number>>

/** Completion is explicit persisted metadata, never inferred from word totals. */
export function countBookFilters(books: readonly Book[]): BookFilterCounts {
  const completed = books.filter((book) => book.completedAt !== null).length
  return {
    all: books.length,
    'in-progress': books.length - completed,
    completed,
  }
}

/** Read-only view of the existing loaded records; selection performs no writes. */
export function filterBooks(
  books: readonly Book[],
  filter: BookFilter,
): readonly Book[] {
  if (filter === 'all') return books
  return books.filter((book) =>
    filter === 'completed'
      ? book.completedAt !== null
      : book.completedAt === null,
  )
}
