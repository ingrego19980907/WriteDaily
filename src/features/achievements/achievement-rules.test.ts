import { expect, test } from 'vitest'
import { en } from '../../app/i18n/en'
import sharedRules from '../../../tests/fixtures/achievement-rules.json'
import {
  ACHIEVEMENT_RULE_POLICY_VERSION,
  ACHIEVEMENT_RULES,
} from './achievement-rules'

test('native and frontend catalogs share permanent IDs, metrics and thresholds', () => {
  expect(
    Object.entries(ACHIEVEMENT_RULES).map(([id, rule]) => ({ id, ...rule })),
  ).toEqual(sharedRules)
})

test('keeps the eight product identities stable independently of display copy', () => {
  expect(Object.keys(ACHIEVEMENT_RULES).sort()).toEqual(
    [
      'first_words',
      'getting_started',
      'storyteller',
      'novelist',
      'consistency',
      'dedicated_writer',
      'goal_keeper',
      'the_end',
    ].sort(),
  )
})

test('every definition has a supported metric, version and usable threshold', () => {
  const metrics = new Set([
    'credited_words',
    'completed_scheduled_days',
    'completed_daily_goals',
    'explicitly_completed_books',
  ])
  for (const rule of Object.values(ACHIEVEMENT_RULES)) {
    expect(metrics.has(rule.metric)).toBe(true)
    expect(rule.policyVersion).toBe(ACHIEVEMENT_RULE_POLICY_VERSION)
    expect(Number.isSafeInteger(rule.threshold)).toBe(true)
    expect(rule.threshold).toBeGreaterThan(0)
  }
})

test('centralized copy covers every rule without orphaned or empty entries', () => {
  expect(Object.keys(en.achievementRules).sort()).toEqual(
    Object.keys(ACHIEVEMENT_RULES).sort(),
  )
  const names = new Set<string>()
  for (const copy of Object.values(en.achievementRules)) {
    expect(copy.name.trim()).not.toBe('')
    expect(copy.description.trim()).not.toBe('')
    names.add(copy.name)
  }
  expect(names.size).toBe(Object.keys(ACHIEVEMENT_RULES).length)
})
