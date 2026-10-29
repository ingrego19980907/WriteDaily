import { expect, test } from '@playwright/test'

test('saved unlock dates follow the current display timezone without changing saved instants', async ({
  page,
  context,
}) => {
  // This target uses CDP only, without a competing Playwright timezone override.
  const session = await context.newCDPSession(page)
  await session.send('Emulation.setTimezoneOverride', { timezoneId: 'UTC' })
  await page.goto('/tests/fixtures/achievements-page.html')
  await page.getByRole('button', { name: 'Achievements', exact: true }).click()
  await expect(page.getByText('Achievements updated.')).toBeVisible()
  const time = page
    .getByRole('article', { name: 'First Words', exact: true })
    .locator('time')
  await expect(time).toHaveText('Unlocked Oct 28, 2026')
  await session.send('Emulation.setTimezoneOverride', {
    timezoneId: 'Pacific/Kiritimati',
  })
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByText('Achievements updated.')).toBeVisible()
  await expect(time).toHaveText('Unlocked Oct 29, 2026')
  await expect(time).toHaveAttribute('datetime', '2026-10-28T10:00:00.000Z')
})
