import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.use({ timezoneId: 'UTC' })
for (const width of [320, 1100]) {
  test(`preferred days persist across views, update pace and show empty rest days at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 850 })
    await page.clock.install({ time: new Date('2026-10-28T12:00:00Z') })
    await page.goto('/tests/fixtures/writing-schedule.html')
    await expect(page.getByText('20 words per writing day')).toBeVisible()
    await page
      .getByRole('button', { name: 'Goals & Deadlines', exact: true })
      .click()
    await page.getByRole('checkbox', { name: 'Sunday', exact: true }).focus()
    await page.keyboard.press('Space')
    await page
      .getByRole('checkbox', { name: 'Saturday', exact: true })
      .uncheck()
    await page
      .getByRole('button', { name: 'Save writing days', exact: true })
      .click()
    await expect(page.getByRole('status')).toHaveText(
      'Writing days saved. Applies from Oct 29, 2026.',
    )
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
    await page.getByRole('button', { name: 'My Library', exact: true }).click()
    await expect(page.getByText('34 words per writing day')).toBeVisible()
    await page
      .getByRole('button', { name: 'Goals & Deadlines', exact: true })
      .click()
    await expect(
      page.getByRole('checkbox', { name: 'Saturday', exact: true }),
    ).not.toBeChecked()
    await page
      .getByRole('button', { name: 'Activity Calendar', exact: true })
      .click()
    await page
      .getByRole('button', { name: /October 31, 2026|Oct 31, 2026/ })
      .click()
    const details = page.getByRole('region', {
      name: 'Activity for Oct 31, 2026',
    })
    await expect(details).toContainText('Rest day.')
    await expect(details).toContainText('This was not a scheduled writing day.')
  })
}
test('pending and failed writes retain selection without false success; retry and pause work', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-28T12:00:00Z') })
  await page.goto('/tests/fixtures/writing-schedule.html?state=pending')
  await page
    .getByRole('button', { name: 'Goals & Deadlines', exact: true })
    .click()
  await page.getByRole('checkbox', { name: 'Sunday', exact: true }).uncheck()
  await page
    .getByRole('button', { name: 'Save writing days', exact: true })
    .click()
  await expect(
    page.getByRole('checkbox', { name: 'Monday', exact: true }),
  ).toBeDisabled()
  await expect(page.getByText(/Writing days saved/)).toHaveCount(0)
  await page.evaluate(() =>
    (
      window as unknown as { completeScheduleSave: () => void }
    ).completeScheduleSave(),
  )
  await expect(page.getByRole('status')).toContainText('Writing days saved')
  await page.goto('/tests/fixtures/writing-schedule.html?state=failure')
  await page
    .getByRole('button', { name: 'Goals & Deadlines', exact: true })
    .click()
  for (const checkbox of await page.getByRole('checkbox').all())
    await checkbox.uncheck()
  await page
    .getByRole('button', { name: 'Save writing days', exact: true })
    .click()
  await expect(page.getByRole('status')).toContainText('could not be saved')
  await expect(
    page.getByRole('checkbox', { name: 'Monday', exact: true }),
  ).not.toBeChecked()
  await page
    .getByRole('button', { name: 'Save writing days', exact: true })
    .click()
  await expect(page.getByRole('status')).toContainText('Writing days saved')
  await expect(
    page.getByText(
      'No writing days selected. Writing remains available; scheduled goals are paused.',
    ),
  ).toBeVisible()
  await page.getByRole('button', { name: 'My Library', exact: true }).click()
  await page.clock.fastForward(24 * 60 * 60 * 1000)
  await expect(
    page.getByText('No scheduled writing days remain before the deadline.'),
  ).toBeVisible()
})
test('load errors and conflicts require explicit reload without silently replacing draft days', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-28T12:00:00Z') })
  await page.goto('/tests/fixtures/writing-schedule.html?state=load-failure')
  await page
    .getByRole('button', { name: 'Goals & Deadlines', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText(
    'Writing schedule could not be loaded',
  )
  await page
    .getByRole('button', { name: 'Reload writing days', exact: true })
    .click()
  await expect(
    page.getByRole('checkbox', { name: 'Monday', exact: true }),
  ).toBeEnabled()
  await page.goto('/tests/fixtures/writing-schedule.html?state=conflict')
  await page
    .getByRole('button', { name: 'Goals & Deadlines', exact: true })
    .click()
  await page.getByRole('checkbox', { name: 'Sunday', exact: true }).uncheck()
  await page
    .getByRole('button', { name: 'Save writing days', exact: true })
    .click()
  await expect(page.getByRole('status')).toContainText('changed elsewhere')
  await expect(
    page.getByRole('checkbox', { name: 'Monday', exact: true }),
  ).toBeChecked()
  await page
    .getByRole('button', { name: 'Reload writing days', exact: true })
    .click()
  await expect(
    page.getByRole('checkbox', { name: 'Monday', exact: true }),
  ).not.toBeChecked()
})
