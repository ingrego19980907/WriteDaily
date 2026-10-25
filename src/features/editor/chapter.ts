import type { ChapterContent } from './chapter-content'

export const CHAPTER_TITLE_MAX_LENGTH = 200

/** User-editable metadata only. Position, ownership and revisions are native-owned. */
export type ChapterDetails = { readonly title: string }
export type ChapterSummary = ChapterDetails & {
  readonly id: string
  readonly bookId: string
  /** Contiguous zero-based order within one book. */
  readonly position: number
  /** Derived count; null means not computed for the current content revision. */
  readonly wordCount: number | null
  /** Positive safe integer, advanced by every committed chapter change. */
  readonly revision: number
  readonly createdAt: string
  readonly updatedAt: string
}
export type Chapter = ChapterSummary & { readonly content: ChapterContent }
export type ChapterMetadataChange = {
  readonly expectedRevision: number
  readonly details: ChapterDetails
}
export type ChapterContentChange = {
  readonly expectedRevision: number
  readonly content: ChapterContent
}
export type ChapterOrderEntry = {
  readonly id: string
  readonly revision: number
}
/** Full prior membership/order/revision vector prevents lost concurrent reorder/add/delete. */
export type ChapterOrderChange = {
  readonly expected: readonly ChapterOrderEntry[]
  readonly chapterIds: readonly string[]
}
export type ChapterDetailsIssue = {
  field: 'title' | 'form'
  code: 'required' | 'invalid_type' | 'invalid_title' | 'too_long'
}
export type ChapterDetailsValidation =
  | { success: true; data: ChapterDetails }
  | { success: false; issues: ChapterDetailsIssue[] }

export function validateChapterDetails(
  input: unknown,
): ChapterDetailsValidation {
  if (typeof input !== 'object' || input === null || Array.isArray(input))
    return { success: false, issues: [{ field: 'form', code: 'invalid_type' }] }
  const value = (input as Record<string, unknown>).title
  if (value === undefined || value === null)
    return { success: false, issues: [{ field: 'title', code: 'required' }] }
  if (typeof value !== 'string')
    return {
      success: false,
      issues: [{ field: 'title', code: 'invalid_type' }],
    }
  const title = value.trim().normalize('NFC')
  const code = !title
    ? 'required'
    : /\p{Cc}/u.test(title) || /[\uD800-\uDFFF]/u.test(title)
      ? 'invalid_title'
      : Array.from(title).length > CHAPTER_TITLE_MAX_LENGTH
        ? 'too_long'
        : null
  return code
    ? { success: false, issues: [{ field: 'title', code }] }
    : { success: true, data: { title } }
}
