import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { activityBooks } from '../fixtures/activity-data'
test.use({ timezoneId: 'UTC' })

for (const width of [320, 1100]) {
  test(`current streak is visible in library, independent of viewed month and scoped at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 850 })
    await page.clock.install({ time: new Date('2026-10-28T23:59:40Z') })
    await page.clock.pauseAt(new Date('2026-10-28T23:59:50Z'))
    await page.goto('/tests/fixtures/activity-calendar.html?streak=exact')
    const summary = page.getByRole('group', {
      name: 'Current writing streak',
      exact: true,
    })
    await expect(summary).toContainText('3 completed days')
    await expect(summary).toContainText('50 credited words')
    await expect(summary).toContainText('until local midnight')
    await page
      .getByRole('button', { name: 'Activity Calendar', exact: true })
      .click()
    await expect(summary).toContainText('3 completed days')
    await page.getByRole('button', { name: 'Next month', exact: true }).click()
    await expect(
      page.getByRole('heading', { name: 'November 2026', exact: true }),
    ).toBeVisible()
    await expect(summary).toContainText('3 completed days')
    await page
      .getByLabel('Book', { exact: true })
      .selectOption(activityBooks[0].id)
    await expect(summary).toContainText('At least 2 completed days')
    await page.getByLabel('Book', { exact: true }).selectOption('')
    await expect(summary).toContainText('3 completed days')
    await page.clock.runFor(20000)
    await expect(summary).toContainText('0 completed days')
    await page.clock.resume()
    await page.addStyleTag({ content: 'html{font-size:200%;}' })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
    ).toEqual([])
  })
}
test('streak loading/failure does not become zero and explicit refresh can recover', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-28T12:00:00Z') })
  await page.goto('/tests/fixtures/activity-calendar.html?streak=loading')
  const summary = page.getByRole('group', {
    name: 'Current writing streak',
    exact: true,
  })
  await expect(summary).toContainText('Loading streak...')
  await expect(summary).not.toContainText('0 completed days')
  await page.goto('/tests/fixtures/activity-calendar.html?streak=failure')
  await expect(summary).toContainText('Streak could not be loaded')
  await summary
    .getByRole('button', { name: 'Refresh streak', exact: true })
    .click()
  await expect(summary).toContainText('3 completed days')
})
test('late global streak cannot overwrite a chosen book and missing history stays explicit', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-28T12:00:00Z') })
  await page.goto('/tests/fixtures/activity-calendar.html?streak=stale')
  await page
    .getByRole('button', { name: 'Activity Calendar', exact: true })
    .click()
  const summary = page.getByRole('group', {
    name: 'Current writing streak',
    exact: true,
  })
  await page
    .getByLabel('Book', { exact: true })
    .selectOption(activityBooks[0].id)
  await expect(summary).toContainText('At least 2 completed days')
  await page.evaluate(() =>
    (
      window as unknown as { completeStreakRead: () => void }
    ).completeStreakRead(),
  )
  await expect(summary).not.toContainText('3 completed days')
  await page
    .getByLabel('Book', { exact: true })
    .selectOption(activityBooks[1].id)
  await expect(summary).toContainText('Not enough recorded history')
  await expect(summary).not.toContainText('0 completed days')
})
