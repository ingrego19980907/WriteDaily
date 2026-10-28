import { invoke, isTauri } from '@tauri-apps/api/core'
import type {
  Chapter,
  ChapterDetails,
  ChapterSummary,
  ChapterMetadataChange,
  ChapterContentChange,
  ChapterOrderChange,
} from '../features/editor/chapter'
import { validateChapterContent } from '../features/editor/chapter-content'

function desktop<T>(
  command: string,
  args: Record<string, unknown>,
): Promise<T> {
  if (!isTauri()) return Promise.reject({ code: 'desktop_required' })
  return invoke<T>(command, args)
}

export function listChapters(bookId: string): Promise<ChapterSummary[]> {
  return desktop('list_chapters', { bookId })
}
export function getChapter(bookId: string, id: string): Promise<Chapter> {
  return desktop('get_chapter', { bookId, id })
}
export function createChapter(
  bookId: string,
  details: ChapterDetails,
): Promise<Chapter> {
  return desktop('create_chapter', {
    bookId,
    details: { title: details.title },
  })
}
export function renameChapter(
  bookId: string,
  id: string,
  change: ChapterMetadataChange,
): Promise<Chapter> {
  return desktop('rename_chapter', {
    bookId,
    id,
    expectedRevision: change.expectedRevision,
    details: { title: change.details.title },
  })
}
export function saveChapterContent(
  bookId: string,
  id: string,
  change: ChapterContentChange,
): Promise<Chapter> {
  if (!isTauri()) return Promise.reject({ code: 'desktop_required' })
  const validation = validateChapterContent(change.content)
  if (!validation.success)
    return Promise.reject({ code: 'validation', reason: validation.code })
  return desktop('save_chapter_content', {
    bookId,
    id,
    expectedRevision: change.expectedRevision,
    contentJson: JSON.stringify(validation.data),
    activityJson: JSON.stringify(change.activity),
  })
}
/** Call only after explicit confirmation of deletion for this loaded snapshot. */
export function deleteChapter(
  bookId: string,
  id: string,
  expectedRevision: number,
): Promise<ChapterSummary[]> {
  return desktop('delete_chapter', {
    bookId,
    id,
    expectedRevision,
    confirmed: true,
  })
}
export function reorderChapters(
  bookId: string,
  change: ChapterOrderChange,
): Promise<ChapterSummary[]> {
  return desktop('reorder_chapters', {
    bookId,
    expected: change.expected.map(({ id, revision }) => ({ id, revision })),
    chapterIds: [...change.chapterIds],
  })
}
