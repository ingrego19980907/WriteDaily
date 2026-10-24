export const BOOK_TITLE_MAX_LENGTH = 200

/** Editable metadata; optional values use null rather than sentinel numbers. */
export type BookDetails = {
  readonly title: string
  readonly targetWordCount: number | null
  readonly dailyWordGoal: number | null
  /** Local calendar date in YYYY-MM-DD format, not an instant. */
  readonly deadline: string | null
}

/** Persisted snapshot. IDs, managed paths and timestamps are persistence-owned. */
export type Book = BookDetails & {
  readonly id: string
  readonly coverPath: string | null
  readonly completedAt: string | null
  readonly createdAt: string
  readonly updatedAt: string
}

export type BookValidationIssue = {
  field: keyof BookDetails | 'form'
  code:
    | 'required'
    | 'invalid_type'
    | 'too_long'
    | 'invalid_title'
    | 'invalid_count'
    | 'invalid_date'
}

export type BookDetailsValidation =
  | { success: true; data: BookDetails }
  | { success: false; issues: BookValidationIssue[] }

function optionalCount(
  value: unknown,
  field: 'targetWordCount' | 'dailyWordGoal',
  issues: BookValidationIssue[],
): number | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    issues.push({ field, code: 'invalid_count' })
    return null
  }
  return value
}

function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (year < 1 || month < 1 || month > 12 || day < 1) return false
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ]
  return day <= daysInMonth[month - 1]
}

/** Pure validation boundary: no persistence, defaults tied to today, or UI copy. */
export function validateBookDetails(input: unknown): BookDetailsValidation {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { success: false, issues: [{ field: 'form', code: 'invalid_type' }] }
  }
  const values = input as Record<string, unknown>
  const issues: BookValidationIssue[] = []
  let title = ''
  if (values.title === undefined || values.title === null) {
    issues.push({ field: 'title', code: 'required' })
  } else if (typeof values.title !== 'string') {
    issues.push({ field: 'title', code: 'invalid_type' })
  } else {
    title = values.title.trim().normalize('NFC')
    if (!title) issues.push({ field: 'title', code: 'required' })
    else if (/\p{Cc}/u.test(title))
      issues.push({ field: 'title', code: 'invalid_title' })
    else if (Array.from(title).length > BOOK_TITLE_MAX_LENGTH) {
      issues.push({ field: 'title', code: 'too_long' })
    }
  }

  const targetWordCount = optionalCount(
    values.targetWordCount,
    'targetWordCount',
    issues,
  )
  const dailyWordGoal = optionalCount(
    values.dailyWordGoal,
    'dailyWordGoal',
    issues,
  )
  let deadline: string | null = null
  if (values.deadline !== undefined && values.deadline !== null) {
    if (
      typeof values.deadline === 'string' &&
      isCalendarDate(values.deadline)
    ) {
      deadline = values.deadline
    } else {
      issues.push({ field: 'deadline', code: 'invalid_date' })
    }
  }

  if (issues.length > 0) return { success: false, issues }
  return {
    success: true,
    data: { title, targetWordCount, dailyWordGoal, deadline },
  }
}
