import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

test.use({ timezoneId: 'UTC' })
async function open(page: Page, mode = '') {
  await page.goto(
    `/tests/fixtures/achievements-page.html${mode ? `?state=${mode}` : ''}`,
  )
  await page.getByRole('button', { name: 'Achievements', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Achievements', level: 1 }),
  ).toBeFocused()
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  for (const card of await page.getByRole('article').all())
    expect(
      await card.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true)
}

for (const width of [320, 640, 1440]) {
  test(`Achievements page loads saved SQLite DTOs and reflows at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await open(page)
    await expect(page.getByText('1 / 8 unlocked')).toBeVisible()
    await expect(page.getByText('Achievements updated.')).toBeVisible()
    await expect(
      page
        .getByRole('list', { name: 'Achievement milestones' })
        .getByRole('article'),
    ).toHaveCount(8)
    const first = page.getByRole('article', {
      name: 'First Words',
      exact: true,
    })
    await expect(first.getByText('Unlocked', { exact: true })).toBeVisible()
    await expect(first.locator('time')).toHaveText('Unlocked Oct 28, 2026')
    await expect(page.getByText('Coming soon')).toHaveCount(0)
    await expect(page.getByRole('progressbar')).toHaveCount(0)
    await page
      .getByRole('main')
      .screenshot({ path: testInfo.outputPath('achievements.png') })
    for (const scale of [100, 200]) {
      await page.addStyleTag({ content: `html { font-size: ${scale}%; }` })
      await noOverflow(page)
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
            .analyze()
        ).violations,
      ).toEqual([])
    }
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' })
    await noOverflow(page)
    const refresh = page.getByRole('button', { name: 'Refresh achievements' })
    await page.getByRole('heading', { name: 'Achievements', level: 1 }).focus()
    await page.keyboard.press('Tab')
    await expect(refresh).toBeFocused()
    await expect(refresh).toHaveCSS('outline-style', 'solid')
  })
}

test('confirmed empty data and initial read failure remain distinct and keyboard retry recovers', async ({
  page,
}) => {
  await open(page, 'empty')
  await expect(page.getByText('0 / 8 unlocked')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Your next milestone awaits' }),
  ).toBeVisible()
  await expect(page.getByText('Locked', { exact: true })).toHaveCount(8)
  await open(page, 'initial-failure')
  await expect(page.getByRole('alert')).toContainText(
    'Could not load or refresh saved achievements.',
  )
  await expect(page.getByText('Unlock count unavailable.')).toBeVisible()
  await expect(
    page.getByText('Status unavailable', { exact: true }),
  ).toHaveCount(8)
  await expect(page.getByText('Your next milestone awaits')).toHaveCount(0)
  const retry = page.getByRole('button', { name: 'Retry achievements' })
  await retry.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText('Achievements updated.')).toBeVisible()
  await expect(page.getByText('1 / 8 unlocked')).toBeVisible()
})

test('pending reads/commits cannot announce empty success or unlocks', async ({
  page,
}) => {
  await open(page, 'pending-read')
  await expect(page.getByRole('status')).toContainText('Loading achievements…')
  await expect(page.getByRole('article')).toHaveCount(0)
  await expect(page.getByText('0 / 8 unlocked')).toHaveCount(0)
  await page.evaluate(() =>
    (
      window as unknown as { completeAchievementRead: () => void }
    ).completeAchievementRead(),
  )
  await expect(page.getByText('1 / 8 unlocked')).toBeVisible()
  await open(page, 'pending-refresh')
  await expect(page.getByRole('status')).toContainText(
    'Refreshing achievements…',
  )
  await expect(page.getByText('Unlocked', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Your next milestone awaits')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Refresh achievements' }),
  ).toBeDisabled()
  await page.evaluate(() =>
    (
      window as unknown as { completeAchievementRefresh: () => void }
    ).completeAchievementRefresh(),
  )
  await expect(page.getByText('1 / 8 unlocked')).toBeVisible()
  await expect(page.getByText('Unlocked', { exact: true })).toHaveCount(1)
})

test('lost commit response retries without duplicate cards or changed unlock time', async ({
  page,
}) => {
  await open(page, 'lost-response')
  await expect(page.getByRole('alert')).toContainText(
    'Showing the last confirmed achievements.',
  )
  await expect(page.getByText('0 / 8 unlocked')).toBeVisible()
  await expect(page.getByText('Your next milestone awaits')).toHaveCount(0)
  await page.getByRole('button', { name: 'Retry achievements' }).click()
  await expect(page.getByText('Achievements updated.')).toBeVisible()
  await expect(page.getByText('1 / 8 unlocked')).toBeVisible()
  const first = page.getByRole('article', { name: 'First Words', exact: true })
  await expect(first.locator('time')).toHaveAttribute(
    'datetime',
    '2026-10-28T10:00:00.000Z',
  )
  await page.getByRole('button', { name: 'Refresh achievements' }).click()
  await expect(page.getByText('Achievements updated.')).toBeVisible()
  await expect(page.getByText('Unlocked', { exact: true })).toHaveCount(1)
  await expect(page.getByRole('article')).toHaveCount(8)
})

test('malformed refresh data keeps the validated prior snapshot and can recover', async ({
  page,
}) => {
  await open(page, 'malformed')
  await expect(page.getByRole('alert')).toContainText(
    'Saved achievement data could not be verified.',
  )
  await expect(page.getByText('1 / 8 unlocked')).toBeVisible()
  await expect(page.getByText('Unlocked', { exact: true })).toHaveCount(1)
  await page.getByRole('button', { name: 'Retry achievements' }).click()
  await expect(page.getByText('Achievements updated.')).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('late reads and hidden navigation do not overwrite confirmed data or launch background requests', async ({
  page,
}) => {
  await open(page, 'late-read')
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByText('Achievements updated.')).toBeVisible()
  await expect(page.getByText('1 / 8 unlocked')).toBeVisible()
  await page.evaluate(() =>
    (
      window as unknown as { completeAchievementRead: () => void }
    ).completeAchievementRead(),
  )
  await expect(page.getByText('1 / 8 unlocked')).toBeVisible()
  await page.getByRole('button', { name: 'My Library', exact: true }).click()
  const before = await page.evaluate(() =>
    (
      window as unknown as { achievementRequests: () => unknown }
    ).achievementRequests(),
  )
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { achievementRequests: () => unknown }
      ).achievementRequests(),
    ),
  ).toEqual(before)
  await page.evaluate(() =>
    (
      window as unknown as { failAchievementReads: () => void }
    ).failAchievementReads(),
  )
  await page.getByRole('button', { name: 'Achievements', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Showing the last confirmed achievements.',
  )
  await expect(page.getByText('1 / 8 unlocked')).toBeVisible()
})

test('midnight refreshes active achievements and browser preview remains native-only', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-29T23:59:59.500Z') })
  await page.clock.pauseAt(new Date('2026-10-29T23:59:59.500Z'))
  await open(page)
  await expect(page.getByText('Achievements updated.')).toBeVisible()
  const before = await page.evaluate(
    () =>
      (
        window as unknown as { achievementRequests: () => { reads: number } }
      ).achievementRequests().reads,
  )
  await page.clock.fastForward(2_000)
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as unknown as {
              achievementRequests: () => { reads: number }
            }
          ).achievementRequests().reads,
      ),
    )
    .toBeGreaterThan(before)
  await page.goto('/')
  await page.getByRole('button', { name: 'Achievements', exact: true }).click()
  await expect(
    page.getByText(
      'Open the desktop app to view and refresh your saved achievements.',
    ),
  ).toBeVisible()
  await expect(page.getByText('0 / 8 unlocked')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Refresh achievements' }),
  ).toBeDisabled()
})
