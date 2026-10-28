/** Design contract for 5.2; no activity is recorded by this module. */
export const ACTIVITY_POLICY_VERSION = 1 as const

export type ActivityOrigin = 'editor' | 'import' | 'restore'

/** Captured at edit time, never reconstructed from the eventual commit date. */
export type ActivityContext = {
  readonly localDate: string
  /** IANA name when available; null means offset-only context. */
  readonly timeZone: string | null
  /** Minutes east of UTC (the negative of Date.getTimezoneOffset()). */
  readonly utcOffsetMinutes: number
  readonly dailyWordGoal: number | null
  readonly scheduled: boolean
}

/** One contiguous local-day/timezone/goal context within a submitted save. */
export type ActivitySegment = {
  readonly context: ActivityContext
  readonly firstEditedAt: string
  readonly lastEditedAt: string
  readonly beforeWords: number
  readonly afterWords: number
}

export type ActivityDelta = {
  readonly addedWords: number
  readonly deletedWords: number
  readonly creditedWords: number
}

/** UUID operationId is retained, with the same payload, until commit is known. */
export type ActivitySubmission = {
  readonly policyVersion: typeof ACTIVITY_POLICY_VERSION
  readonly operationId: string
  readonly origin: ActivityOrigin
  readonly segments: readonly ActivitySegment[]
}

/** Persisted event projection; manuscript text and titles are not copied here. */
export type WritingActivity = ActivitySegment &
  ActivityDelta & {
    readonly policyVersion: typeof ACTIVITY_POLICY_VERSION
    readonly operationId: string
    readonly segmentIndex: number
    readonly origin: ActivityOrigin
    /** Immutable source IDs survive deletion and support receipt verification. */
    readonly sourceBookId: string
    readonly sourceChapterId: string
    /** Live foreign keys detach via SET NULL when the source is removed. */
    readonly bookId: string | null
    readonly chapterId: string | null
    readonly committedRevision: number
    readonly committedAt: string
  }

/** Net change within a batch, not keystrokes, diffed tokens or lifetime words. */
export function calculateActivityDelta(
  beforeWords: unknown,
  afterWords: unknown,
  origin: ActivityOrigin = 'editor',
): ActivityDelta | null {
  if (
    typeof beforeWords !== 'number' ||
    !Number.isSafeInteger(beforeWords) ||
    beforeWords < 0 ||
    typeof afterWords !== 'number' ||
    !Number.isSafeInteger(afterWords) ||
    afterWords < 0 ||
    !['editor', 'import', 'restore'].includes(origin)
  )
    return null
  const addedWords = Math.max(0, afterWords - beforeWords)
  return {
    addedWords,
    deletedWords: Math.max(0, beforeWords - afterWords),
    creditedWords: origin === 'editor' ? addedWords : 0,
  }
}
