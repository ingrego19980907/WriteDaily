/** Achievement semantics are independent of the activity credit policy version. */
export const ACHIEVEMENT_RULE_POLICY_VERSION = 1 as const

export type AchievementMetric =
  | 'credited_words'
  | 'completed_scheduled_days'
  | 'completed_daily_goals'
  | 'explicitly_completed_books'

export type AchievementRule = {
  readonly policyVersion: typeof ACHIEVEMENT_RULE_POLICY_VERSION
  readonly metric: AchievementMetric
  readonly threshold: number
}

/**
 * Stable IDs for future persisted unlocks; never identify a rule by its label or
 * position. Thresholds are inclusive and global to the local library.
 * Counting/evidence semantics: docs/ACHIEVEMENTS.md. See evaluate-achievements.ts.
 */
export const ACHIEVEMENT_RULES = {
  first_words: {
    policyVersion: ACHIEVEMENT_RULE_POLICY_VERSION,
    metric: 'credited_words',
    threshold: 100,
  },
  getting_started: {
    policyVersion: ACHIEVEMENT_RULE_POLICY_VERSION,
    metric: 'credited_words',
    threshold: 1_000,
  },
  storyteller: {
    policyVersion: ACHIEVEMENT_RULE_POLICY_VERSION,
    metric: 'credited_words',
    threshold: 10_000,
  },
  novelist: {
    policyVersion: ACHIEVEMENT_RULE_POLICY_VERSION,
    metric: 'credited_words',
    threshold: 50_000,
  },
  consistency: {
    policyVersion: ACHIEVEMENT_RULE_POLICY_VERSION,
    metric: 'completed_scheduled_days',
    threshold: 7,
  },
  dedicated_writer: {
    policyVersion: ACHIEVEMENT_RULE_POLICY_VERSION,
    metric: 'completed_scheduled_days',
    threshold: 30,
  },
  goal_keeper: {
    policyVersion: ACHIEVEMENT_RULE_POLICY_VERSION,
    metric: 'completed_daily_goals',
    threshold: 10,
  },
  the_end: {
    policyVersion: ACHIEVEMENT_RULE_POLICY_VERSION,
    metric: 'explicitly_completed_books',
    threshold: 1,
  },
} as const satisfies Readonly<Record<string, AchievementRule>>

export type AchievementId = keyof typeof ACHIEVEMENT_RULES
