import { expect, test } from '@playwright/test'
import { activityBooks } from '../fixtures/activity-data'

test.use({ timezoneId: 'UTC' })

test('longest record loading, failure and refresh never invent a zero', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-28T12:00:00Z') })
  await page.goto(
    '/tests/fixtures/activity-calendar.html?streak=exact&longest=loading',
  )
  const longest = page.getByRole('group', {
    name: 'Longest recorded writing streak',
    exact: true,
  })
  await expect(longest).toContainText('Loading longest streak...')
  await expect(longest).not.toContainText('0 completed days')
  await page.goto(
    '/tests/fixtures/activity-calendar.html?streak=exact&longest=failure',
  )
  await expect(longest).toContainText('Longest streak could not be loaded')
  await page
    .getByRole('button', { name: 'Refresh streak', exact: true })
    .click()
  await expect(longest).toContainText('3 completed days')
})

test('late longest record cannot overwrite a changed book scope', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-28T12:00:00Z') })
  await page.goto(
    '/tests/fixtures/activity-calendar.html?streak=exact&longest=stale',
  )
  await page
    .getByRole('button', { name: 'Activity Calendar', exact: true })
    .click()
  const longest = page.getByRole('group', {
    name: 'Longest recorded writing streak',
    exact: true,
  })
  await page
    .getByLabel('Book', { exact: true })
    .selectOption(activityBooks[0].id)
  await expect(longest).toContainText('At least 2 completed days')
  await page.evaluate(() =>
    (
      window as unknown as { completeLongestRead: () => void }
    ).completeLongestRead(),
  )
  await expect(longest).not.toContainText('3 completed days')
  await page
    .getByLabel('Book', { exact: true })
    .selectOption(activityBooks[1].id)
  await expect(longest).toContainText('1 completed day')
})
