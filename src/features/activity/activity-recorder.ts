import { localCalendarDate } from '../../utils/calendar-date'
import {
  ACTIVITY_POLICY_VERSION,
  type ActivityContext,
  type ActivitySegment,
  type ActivitySubmission,
} from './activity'

export const ACTIVITY_FLUSH_SEGMENTS = 64
export const ACTIVITY_MAX_SEGMENTS = 128

export function captureActivityContext(
  dailyWordGoal: number | null,
  now = new Date(),
): ActivityContext {
  const localDate = localCalendarDate(now)
  if (!localDate) throw new Error('Invalid local activity date')
  let timeZone: string | null = null
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || null
  } catch {
    /* Offset-only context is supported. */
  }
  return {
    localDate,
    timeZone,
    utcOffsetMinutes: -now.getTimezoneOffset(),
    dailyWordGoal,
    scheduled: true,
  }
}

/** Memory-only edit batches; taking a payload does not acknowledge persistence. */
export class ActivityRecorder {
  private before: number | null
  private segments: ActivitySegment[] = []
  constructor(beforeWords: number | null) {
    this.before = beforeWords
  }
  get size() {
    return this.segments.length
  }

  record(
    afterWords: number | null,
    context: ActivityContext,
    now = new Date(),
  ) {
    if (
      this.before === null ||
      afterWords === null ||
      !Number.isSafeInteger(afterWords) ||
      afterWords < 0
    )
      throw new Error('Unavailable activity baseline')
    const instant = now.toISOString()
    const last = this.segments.at(-1)
    if (last && JSON.stringify(last.context) === JSON.stringify(context)) {
      this.segments[this.segments.length - 1] = {
        ...last,
        afterWords,
        lastEditedAt: instant,
      }
    } else {
      if (this.size >= ACTIVITY_MAX_SEGMENTS)
        throw new Error('Activity batch limit')
      this.segments.push({
        context: { ...context },
        firstEditedAt: instant,
        lastEditedAt: instant,
        beforeWords: this.before,
        afterWords,
      })
    }
    this.before = afterWords
  }

  take(): ActivitySubmission {
    if (!this.segments.length) throw new Error('Missing activity batch')
    const operationId = crypto.randomUUID()
    const segments = this.segments
    this.segments = []
    return {
      policyVersion: ACTIVITY_POLICY_VERSION,
      operationId,
      origin: 'editor',
      segments,
    }
  }
}
