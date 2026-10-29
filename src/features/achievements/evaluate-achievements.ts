import {
  isDailyStatisticsRange,
  type DailyStatistics,
  type DailyStatisticsRange,
} from '../activity/daily-statistics'
import type { Book } from '../library/book'
import { calendarDayNumber, isCalendarDate } from '../../utils/calendar-date'
import {
  ACHIEVEMENT_RULE_POLICY_VERSION,
  ACHIEVEMENT_RULES,
  type AchievementId,
  type AchievementMetric,
} from './achievement-rules'

/** All pages must be global committed statistics from one consistent snapshot. */
export type AchievementActivityEvidence = {
  /** Earliest recorded date; null means no recorded history, not an unknown date. */
  readonly historyStartDate: string | null
  readonly pages: readonly DailyStatisticsRange[]
  /** False for missing pages, unrecorded legacy history or a partial read. */
  readonly complete: boolean
}

/** Only persistence-owned completion fields are relevant; manuscript totals are not. */
export type BookCompletionEvidence = Pick<
  Book,
  'id' | 'createdAt' | 'updatedAt' | 'completedAt'
>

export type AchievementEvidence = {
  readonly today: string
  /** null means unavailable, never an empty successful read. */
  readonly activity: AchievementActivityEvidence | null
  readonly books: {
    readonly snapshots: readonly BookCompletionEvidence[]
    readonly complete: boolean
  } | null
}

export type AchievementCheck = {
  readonly id: AchievementId
  readonly status: 'eligible' | 'locked' | 'unavailable'
  /** Confirmed lower bound, capped at this rule's threshold; not a lifetime total. */
  readonly confirmedProgress: number | null
}

export type AchievementEvaluation = {
  readonly policyVersion: typeof ACHIEVEMENT_RULE_POLICY_VERSION
  readonly checks: readonly AchievementCheck[]
  /** Eligibility only. No unlock, persistence success or notification is implied. */
  readonly eligibleIds: readonly AchievementId[]
}

type MetricEvidence = { confirmed: number; complete: boolean } | null
type ActivityMetric = Exclude<AchievementMetric, 'explicitly_completed_books'>

const ruleIds = Object.keys(ACHIEVEMENT_RULES) as AchievementId[]
const limits: Record<AchievementMetric, number> = {
  credited_words: 0,
  completed_scheduled_days: 0,
  completed_daily_goals: 0,
  explicitly_completed_books: 0,
}
for (const rule of Object.values(ACHIEVEMENT_RULES)) {
  limits[rule.metric] = Math.max(limits[rule.metric], rule.threshold)
}

/** Saturate before adding so even several MAX_SAFE_INTEGER inputs remain safe. */
function add(total: number, value: number, limit: number): number {
  return total + Math.min(value, limit - total)
}

/** Compare repeated dates independently of book-goal display order. */
function daySignature(day: DailyStatistics): string {
  return JSON.stringify([
    day.addedWords,
    day.deletedWords,
    day.creditedWords,
    day.saveCount,
    day.active,
    day.writingDay ?? null,
    [...day.bookGoals]
      .sort((a, b) => a.sourceBookId.localeCompare(b.sourceBookId))
      .map((goal) => [
        goal.sourceBookId,
        goal.bookId,
        goal.dailyWordGoal,
        goal.scheduled,
        goal.creditedWords,
        goal.state,
        goal.remainingWords,
      ]),
  ])
}

function activityMetrics(
  evidence: AchievementActivityEvidence | null,
  today: string,
): Record<ActivityMetric, MetricEvidence> {
  const unavailable = {
    credited_words: null,
    completed_scheduled_days: null,
    completed_daily_goals: null,
  }
  if (
    !evidence ||
    typeof evidence.complete !== 'boolean' ||
    !Array.isArray(evidence.pages) ||
    !(
      evidence.historyStartDate === null ||
      isCalendarDate(evidence.historyStartDate)
    )
  )
    return unavailable

  const days = new Map<string, { day: DailyStatistics; signature: string }>()
  for (const page of evidence.pages) {
    if (
      !isDailyStatisticsRange(page) ||
      page.bookId !== null ||
      evidence.historyStartDate === null ||
      page.startDate < evidence.historyStartDate
    )
      return unavailable
    for (const day of page.days) {
      if (day.date > today) continue
      const signature = daySignature(day)
      const previous = days.get(day.date)
      // Conflicting repeats indicate mixed snapshots; never choose a larger value.
      if (previous && previous.signature !== signature) return unavailable
      days.set(day.date, { day, signature })
    }
  }

  const expectedDays =
    evidence.historyStartDate === null || evidence.historyStartDate > today
      ? 0
      : calendarDayNumber(today) -
        calendarDayNumber(evidence.historyStartDate) +
        1
  const complete = evidence.complete && days.size === expectedDays
  let words = 0
  let completedDays = 0
  let goals = 0
  for (const { day } of days.values()) {
    words = add(words, day.creditedWords, limits.credited_words)
    const reached = day.bookGoals.filter(
      (goal) => goal.state === 'reached',
    ).length
    goals = add(goals, reached, limits.completed_daily_goals)
    if (reached > 0)
      completedDays = add(completedDays, 1, limits.completed_scheduled_days)
  }
  return {
    credited_words: { confirmed: words, complete },
    completed_scheduled_days: { confirmed: completedDays, complete },
    completed_daily_goals: { confirmed: goals, complete },
  }
}

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
    isCalendarDate(value.slice(0, 10)) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  )
}

function completedBooks(
  evidence: AchievementEvidence['books'],
): MetricEvidence {
  if (
    !evidence ||
    typeof evidence.complete !== 'boolean' ||
    !Array.isArray(evidence.snapshots)
  )
    return null
  const seen = new Map<string, string>()
  let completed = 0
  for (const book of evidence.snapshots) {
    if (
      !book ||
      typeof book.id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        book.id,
      ) ||
      !isTimestamp(book.createdAt) ||
      !isTimestamp(book.updatedAt) ||
      book.updatedAt < book.createdAt ||
      !(
        book.completedAt === null ||
        (isTimestamp(book.completedAt) &&
          book.completedAt >= book.createdAt &&
          book.completedAt <= book.updatedAt)
      )
    )
      return null
    const signature = JSON.stringify([
      book.createdAt,
      book.updatedAt,
      book.completedAt,
    ])
    const previous = seen.get(book.id)
    if (previous !== undefined) {
      if (previous !== signature) return null
      continue
    }
    seen.set(book.id, signature)
    if (book.completedAt !== null)
      completed = add(completed, 1, limits.explicitly_completed_books)
  }
  return { confirmed: completed, complete: evidence.complete }
}

/** Pure committed-evidence calculation. No clock, IO, UI state or unlock mutation. */
export function evaluateAchievements(
  evidence: AchievementEvidence,
): AchievementEvaluation {
  const validDate = isCalendarDate(evidence.today)
  const metrics: Record<AchievementMetric, MetricEvidence> = {
    ...activityMetrics(validDate ? evidence.activity : null, evidence.today),
    explicitly_completed_books: validDate
      ? completedBooks(evidence.books)
      : null,
  }
  const checks = ruleIds.map((id): AchievementCheck => {
    const rule = ACHIEVEMENT_RULES[id]
    const metric = metrics[rule.metric]
    const confirmedProgress =
      metric === null ? null : Math.min(metric.confirmed, rule.threshold)
    return {
      id,
      confirmedProgress,
      status:
        confirmedProgress !== null && confirmedProgress >= rule.threshold
          ? 'eligible'
          : metric?.complete
            ? 'locked'
            : 'unavailable',
    }
  })
  return {
    policyVersion: ACHIEVEMENT_RULE_POLICY_VERSION,
    checks,
    eligibleIds: checks
      .filter((check) => check.status === 'eligible')
      .map((check) => check.id),
  }
}
