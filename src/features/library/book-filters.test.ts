import { expect, test } from 'vitest'
import type { Book } from './book'
import { countBookFilters, filterBooks, searchBooks } from './book-filters'

test('title search preserves Unicode, canonical accents, order and source records', () => {
  const books = Object.freeze([
    Object.freeze({ title: 'Українська історія' } as Book),
    Object.freeze({ title: 'Café in spring' } as Book),
    Object.freeze({ title: '東京の物語' } as Book),
  ])
  expect(searchBooks(books, '  УКРАЇНСЬКА  ')).toEqual([books[0]])
  expect(searchBooks(books, 'CAFE\u0301')).toEqual([books[1]])
  expect(searchBooks(books, '東京')).toEqual([books[2]])
  expect(searchBooks(books, 'missing')).toEqual([])
  expect(searchBooks(books, '  ')).toBe(books)
  expect(books[0].title).toBe('Українська історія')
})

test('explicit completion, independent of targets, partitions records without mutation', () => {
  const base: Book = {
    id: 'one',
    title: 'Story',
    targetWordCount: null,
    dailyWordGoal: null,
    deadline: null,
    coverPath: null,
    completedAt: null,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-28T10:00:00.000Z',
  }
  const books = Object.freeze([
    Object.freeze({ ...base, targetWordCount: 1 }),
    Object.freeze({
      ...base,
      id: 'two',
      completedAt: base.updatedAt,
      targetWordCount: 100000,
    }),
    Object.freeze({ ...base, id: 'three' }),
  ])
  expect(countBookFilters(books)).toEqual({
    all: 3,
    'in-progress': 2,
    completed: 1,
  })
  expect(filterBooks(books, 'all')).toBe(books)
  expect(filterBooks(books, 'in-progress').map((book) => book.id)).toEqual([
    'one',
    'three',
  ])
  expect(filterBooks(books, 'completed')).toEqual([books[1]])
  expect(books).toHaveLength(3)
})

test('confirmed empty records have genuine zero counts', () => {
  expect(countBookFilters([])).toEqual({
    all: 0,
    'in-progress': 0,
    completed: 0,
  })
  expect(filterBooks([], 'completed')).toEqual([])
})
