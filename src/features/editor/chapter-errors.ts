import { en } from '../../app/i18n/en'
import type { ChapterDetailsIssue } from './chapter'

export function chapterErrorCode(error: unknown): unknown {
  return typeof error === 'object' && error !== null && 'code' in error
    ? error.code
    : null
}

/** Native error payloads remain untrusted; only known codes become UI text. */
export function chapterTitleError(
  error: unknown,
): ChapterDetailsIssue['code'] | null {
  if (
    chapterErrorCode(error) !== 'validation' ||
    typeof error !== 'object' ||
    error === null ||
    !('reason' in error)
  )
    return null
  const reason = error.reason
  return reason === 'required' ||
    reason === 'invalid_type' ||
    reason === 'invalid_title' ||
    reason === 'too_long'
    ? reason
    : null
}

export function chapterFailure(error: unknown, fallback: string): string {
  const copy = en.chapters
  switch (chapterErrorCode(error)) {
    case 'desktop_required':
      return copy.desktop
    case 'not_found':
      return copy.missing
    case 'invalid_stored_data':
      return copy.storedFailure
    case 'limit_reached':
      return copy.limit
    default:
      return fallback
  }
}
