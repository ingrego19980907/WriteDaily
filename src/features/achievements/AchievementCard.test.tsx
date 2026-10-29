import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { en } from '../../app/i18n/en'
import { AchievementCard } from './AchievementCard'
import { ACHIEVEMENT_RULES, type AchievementId } from './achievement-rules'
import type { AchievementUnlock } from './achievement-unlocks'
import type { AchievementCheck } from './evaluate-achievements'

const saved: AchievementUnlock = {
  achievementId: 'first_words',
  rulePolicyVersion: 1,
  unlockedAt: '2026-10-29T10:00:00.000Z',
}
const locked: AchievementCheck = {
  id: 'first_words',
  status: 'locked',
  confirmedProgress: 25,
}

test('all product cards have named articles, requirements and text status', () => {
  for (const id of Object.keys(ACHIEVEMENT_RULES) as AchievementId[]) {
    const { unmount } = render(
      <AchievementCard achievementId={id} unlocks={[]} />,
    )
    const article = screen.getByRole('article', {
      name: en.achievementRules[id].name,
    })
    expect(article).toHaveAccessibleDescription(
      en.achievementRules[id].description,
    )
    expect(
      within(article).getByRole('heading', { level: 3 }),
    ).toHaveTextContent(en.achievementRules[id].name)
    expect(within(article).getByText('Locked', { exact: true })).toBeVisible()
    expect(within(article).getByText('Progress unavailable.')).toBeVisible()
    expect(within(article).queryByRole('progressbar')).not.toBeInTheDocument()
    expect(article).not.toHaveAttribute('tabindex')
    expect(within(article).queryByRole('button')).not.toBeInTheDocument()
    for (const icon of article.querySelectorAll('svg')) {
      expect(icon).toHaveAttribute('aria-hidden', 'true')
      expect(icon).toHaveAttribute('focusable', 'false')
    }
    unmount()
  }
})

test('a persisted unlock supplies its original date despite reduced or unknown progress', () => {
  const { rerender } = render(
    <AchievementCard
      achievementId="first_words"
      unlocks={[saved]}
      check={{ ...locked, confirmedProgress: 0 }}
    />,
  )
  expect(screen.getByText('Unlocked', { exact: true })).toBeVisible()
  const date = screen.getByText(/^Unlocked /)
  expect(date.tagName).toBe('TIME')
  expect(date).toHaveAttribute('datetime', saved.unlockedAt)
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  rerender(
    <AchievementCard
      achievementId="first_words"
      unlocks={[saved]}
      check={{ ...locked, status: 'unavailable', confirmedProgress: null }}
    />,
  )
  expect(screen.getByText('Unlocked', { exact: true })).toBeVisible()
  expect(screen.queryByText('Progress unavailable.')).not.toBeInTheDocument()
})

test('eligible evidence shows pending confirmation and never fabricates a saved unlock', () => {
  render(
    <AchievementCard
      achievementId="first_words"
      unlocks={[]}
      check={{ ...locked, status: 'eligible', confirmedProgress: 100 }}
    />,
  )
  expect(screen.getByText('Locked', { exact: true })).toBeVisible()
  expect(
    screen.getByText('Requirements met. Unlock has not been confirmed.'),
  ).toBeVisible()
  expect(
    screen.getByRole('progressbar', { name: 'First Words progress' }),
  ).toHaveAttribute('aria-valuenow', '100')
  expect(
    screen.queryByText('Unlocked', { exact: true }),
  ).not.toBeInTheDocument()
  expect(screen.queryByText(/^Unlocked /)).not.toBeInTheDocument()
})

test.each([0, 25, 99])(
  'known progress %s has an accessible value and readable counts',
  (confirmedProgress) => {
    render(
      <AchievementCard
        achievementId="first_words"
        unlocks={[]}
        check={{ ...locked, confirmedProgress }}
      />,
    )
    const bar = screen.getByRole('progressbar', {
      name: 'First Words progress',
    })
    expect(bar).toHaveAttribute('aria-valuenow', String(confirmedProgress))
    expect(bar).toHaveAttribute('aria-valuemax', '100')
    expect(bar).toHaveAttribute(
      'aria-valuetext',
      `${confirmedProgress} / 100 credited words`,
    )
    expect(bar).toHaveAccessibleDescription(
      `${confirmedProgress} / 100 credited words`,
    )
  },
)

test('a partial positive lower bound is labelled while an uncertain zero is not shown as zero progress', () => {
  const { rerender } = render(
    <AchievementCard
      achievementId="first_words"
      unlocks={[]}
      check={{ ...locked, status: 'unavailable', confirmedProgress: 25 }}
    />,
  )
  expect(screen.getByRole('progressbar')).toHaveAttribute(
    'aria-valuetext',
    'At least 25 / 100 credited words',
  )
  rerender(
    <AchievementCard
      achievementId="first_words"
      unlocks={[]}
      check={{ ...locked, status: 'unavailable', confirmedProgress: 0 }}
    />,
  )
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  expect(screen.getByText('Progress unavailable.')).toBeVisible()
})

test('a failed or pending unlock read stays distinct even when evaluation is eligible', () => {
  render(
    <AchievementCard
      achievementId="first_words"
      unlocks={null}
      check={{ ...locked, status: 'eligible', confirmedProgress: 100 }}
    />,
  )
  expect(screen.getByText('Status unavailable')).toBeVisible()
  expect(
    screen.getByText('Saved achievement status could not be confirmed.'),
  ).toBeVisible()
  expect(screen.queryByText('Locked', { exact: true })).not.toBeInTheDocument()
  expect(
    screen.queryByText('Unlocked', { exact: true }),
  ).not.toBeInTheDocument()
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
})

test.each([
  { ...locked, id: 'getting_started' },
  { ...locked, confirmedProgress: -1 },
  { ...locked, confirmedProgress: 1.5 },
  { ...locked, confirmedProgress: NaN },
  { ...locked, confirmedProgress: Number.MAX_SAFE_INTEGER },
  { ...locked, confirmedProgress: 100 },
  { ...locked, status: 'eligible', confirmedProgress: 99 },
])(
  'mismatched or malformed progress never creates a false count (%#)',
  (check) => {
    render(
      <AchievementCard
        achievementId="first_words"
        unlocks={[]}
        check={check as AchievementCheck}
      />,
    )
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.getByText('Progress unavailable.')).toBeVisible()
  },
)

test('malformed persisted data is unavailable rather than a false unlock or empty result', () => {
  render(
    <AchievementCard
      achievementId="first_words"
      unlocks={[{ ...saved, unlockedAt: 'invalid' }]}
    />,
  )
  expect(screen.getByText('Status unavailable')).toBeVisible()
})

test('progress units follow the rule and very large safe targets retain full separators', () => {
  const samples = [
    { id: 'novelist', current: 49_999, text: '49,999 / 50,000 credited words' },
    { id: 'consistency', current: 6, text: '6 / 7 scheduled writing days' },
    { id: 'goal_keeper', current: 9, text: '9 / 10 book daily goals' },
  ] as const
  for (const sample of samples) {
    const { unmount } = render(
      <AchievementCard
        achievementId={sample.id}
        unlocks={[]}
        check={{
          id: sample.id,
          status: 'locked',
          confirmedProgress: sample.current,
        }}
      />,
    )
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuetext',
      sample.text,
    )
    unmount()
  }
})

test('explicit completion dependency is explained without a nonfunctional action', () => {
  render(<AchievementCard achievementId="the_end" unlocks={[]} />)
  expect(
    screen.getByText('Marking a book as completed is not available yet.'),
  ).toBeVisible()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
})

test('loading, confirmed empty and committed results transition without generating live notifications', () => {
  const { rerender } = render(
    <AchievementCard achievementId="first_words" unlocks={null} />,
  )
  expect(screen.getByText('Status unavailable')).toBeVisible()
  rerender(
    <AchievementCard achievementId="first_words" unlocks={[]} check={locked} />,
  )
  expect(screen.getByText('Locked', { exact: true })).toBeVisible()
  rerender(<AchievementCard achievementId="first_words" unlocks={[saved]} />)
  expect(screen.getByText('Unlocked', { exact: true })).toBeVisible()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
