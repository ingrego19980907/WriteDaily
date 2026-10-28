import { beforeEach, expect, test, vi } from 'vitest'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { createEmptyChapterContent } from '../features/editor/chapter-content'
import {
  createChapter,
  listChapters,
  getChapter,
  renameChapter,
  saveChapterContent,
  deleteChapter,
  reorderChapters,
} from './chapters'

const activity = {
  policyVersion: 1 as const,
  operationId: '123e4567-e89b-42d3-a456-426614174000',
  origin: 'editor' as const,
  segments: [],
}

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: vi.fn() }))
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(isTauri).mockReturnValue(true)
})

test('uses scoped native commands and separates metadata, body and order writes', async () => {
  const result = { id: 'committed-native-id' }
  vi.mocked(invoke).mockResolvedValue(result)
  const content = createEmptyChapterContent()
  const details = { title: 'Chapter', revision: 999, bookId: 'forged' }
  await expect(createChapter('book', details)).resolves.toBe(result)
  await listChapters('book')
  await getChapter('book', 'chapter')
  await renameChapter('book', 'chapter', { expectedRevision: 4, details })
  await saveChapterContent('book', 'chapter', {
    expectedRevision: 5,
    content,
    activity,
  })
  await deleteChapter('book', 'chapter', 6)
  await reorderChapters('book', {
    expected: [{ id: 'chapter', revision: 7 }],
    chapterIds: ['chapter'],
  })
  expect(vi.mocked(invoke).mock.calls).toEqual([
    ['create_chapter', { bookId: 'book', details: { title: 'Chapter' } }],
    ['list_chapters', { bookId: 'book' }],
    ['get_chapter', { bookId: 'book', id: 'chapter' }],
    [
      'rename_chapter',
      {
        bookId: 'book',
        id: 'chapter',
        expectedRevision: 4,
        details: { title: 'Chapter' },
      },
    ],
    [
      'save_chapter_content',
      {
        bookId: 'book',
        id: 'chapter',
        expectedRevision: 5,
        contentJson: JSON.stringify(content),
        activityJson: JSON.stringify(activity),
      },
    ],
    [
      'delete_chapter',
      { bookId: 'book', id: 'chapter', expectedRevision: 6, confirmed: true },
    ],
    [
      'reorder_chapters',
      {
        bookId: 'book',
        expected: [{ id: 'chapter', revision: 7 }],
        chapterIds: ['chapter'],
      },
    ],
  ])
})

test('every operation refuses browser persistence', async () => {
  vi.mocked(isTauri).mockReturnValue(false)
  const operations = [
    () => createChapter('book', { title: 'Chapter' }),
    () => listChapters('book'),
    () => getChapter('book', 'chapter'),
    () =>
      renameChapter('book', 'chapter', {
        expectedRevision: 1,
        details: { title: 'Changed' },
      }),
    () =>
      saveChapterContent('book', 'chapter', {
        expectedRevision: 1,
        content: createEmptyChapterContent(),
        activity,
      }),
    () => deleteChapter('book', 'chapter', 1),
    () => reorderChapters('book', { expected: [], chapterIds: [] }),
  ]
  for (const operation of operations)
    await expect(operation()).rejects.toEqual({ code: 'desktop_required' })
  expect(invoke).not.toHaveBeenCalled()
})

test('conflict and commit failures propagate without returning a saved snapshot', async () => {
  for (const code of [
    'conflict',
    'persistence',
    'invalid_stored_data',
    'limit_reached',
  ]) {
    vi.mocked(invoke).mockRejectedValueOnce({ code })
    await expect(
      saveChapterContent('book', 'chapter', {
        expectedRevision: 2,
        content: createEmptyChapterContent(),
        activity,
      }),
    ).rejects.toEqual({ code })
  }
})

test('validates content before JSON encoding or IPC without an empty recovery fallback', async () => {
  const content = createEmptyChapterContent()
  Object.assign(content, { schemaVersion: 999 })
  await expect(
    saveChapterContent('book', 'chapter', {
      expectedRevision: 1,
      content,
      activity,
    }),
  ).rejects.toEqual({ code: 'validation', reason: 'unsupported_version' })
  expect(invoke).not.toHaveBeenCalled()
})
