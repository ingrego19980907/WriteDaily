import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { activityBooks } from '../fixtures/activity-data'

test.use({ timezoneId: 'UTC' })
async function open(page: Page, state = '') {
  await page.clock.install({ time: new Date('2026-10-28T12:00:00Z') })
  await page.goto(`/tests/fixtures/activity-calendar.html?state=${state}`)
  await page
    .getByRole('button', { name: 'Activity Calendar', exact: true })
    .click()
}
const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

for (const width of [320, 640, 1100]) {
  test(`activity calendar shows real day details, filters and reflows at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 850 })
    await open(page)
    const totals = page.getByRole('group', { name: 'Month totals' })
    await expect(totals).toContainText('1,905')
    const today = page.getByRole('button', { name: /^Oct 28, 2026:/ })
    await expect(today).toHaveAttribute('aria-current', 'date')
    await today.focus()
    await page.keyboard.press('ArrowLeft')
    await expect(
      page.getByRole('button', { name: /^Oct 27, 2026:/ }),
    ).toBeFocused()
    const details = page.getByRole('region', { name: /^Activity for / })
    await expect(details).toContainText('500 words remaining')
    await page.keyboard.press('Home')
    await expect(
      page.getByRole('button', { name: /^Oct 1, 2026:/ }),
    ).toBeFocused()
    await page.keyboard.press('End')
    await expect(
      page.getByRole('button', { name: /^Oct 31, 2026:/ }),
    ).toBeFocused()
    await page.getByRole('button', { name: /^Oct 12, 2026:/ }).click()
    await expect(details).toContainText('Removed book 1')
    await expect(details).toContainText('Daily goal reached')
    await page.getByRole('button', { name: /^Oct 3, 2026:/ }).click()
    await expect(details).toContainText('250 / 500 credited words')
    await expect(
      page.getByRole('button', { name: /^Oct 3, 2026:/ }),
    ).toHaveAttribute('data-level', '2')
    await page
      .getByLabel('Book', { exact: true })
      .selectOption(activityBooks[0].id)
    await expect(totals).toContainText('850')
    await page.getByRole('button', { name: 'Next month', exact: true }).click()
    await expect(
      page.getByText('No writing activity recorded this month.', {
        exact: true,
      }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Today', exact: true }).click()
    await expect(today).toHaveAttribute('aria-pressed', 'true')
    expect(
      (await new AxeBuilder({ page }).withTags(tags).analyze()).violations,
    ).toEqual([])
    await page.addStyleTag({ content: 'html{font-size:200%;}' })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await expect(
      page.getByRole('table', { name: 'October 2026' }),
    ).toBeAttached()
    await today.focus()
    await page.keyboard.press('End')
    await expect(
      page.getByRole('button', { name: /^Oct 31, 2026:/ }),
    ).toBeInViewport()
    expect(
      (await new AxeBuilder({ page }).withTags(tags).analyze()).violations,
    ).toEqual([])
    await page.screenshot({
      path: testInfo.outputPath('activity-calendar.png'),
      fullPage: true,
    })
  })
}

test('loading, read failures, malformed data and removed scope do not masquerade as empty history', async ({
  page,
}) => {
  await open(page, 'loading')
  await expect(
    page.getByText('Loading activity...', { exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('group', { name: 'Month totals' })).toHaveCount(0)
  await page.goto('/tests/fixtures/activity-calendar.html?state=failure')
  await page
    .getByRole('button', { name: 'Activity Calendar', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText('Could not load activity')
  await page
    .getByRole('button', { name: 'Refresh activity', exact: true })
    .click()
  await expect(page.getByRole('group', { name: 'Month totals' })).toContainText(
    '1,905',
  )
  await page.goto('/tests/fixtures/activity-calendar.html?state=invalid')
  await page
    .getByRole('button', { name: 'Activity Calendar', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText(
    'could not be read safely',
  )
  await expect(page.getByRole('table')).toHaveCount(0)
  await page.goto('/tests/fixtures/activity-calendar.html?state=removed-book')
  await page
    .getByRole('button', { name: 'Activity Calendar', exact: true })
    .click()
  await page
    .getByLabel('Book', { exact: true })
    .selectOption(activityBooks[0].id)
  await expect(page.getByRole('alert')).toContainText('no longer available')
  await page.getByLabel('Book', { exact: true }).selectOption('')
  await expect(page.getByRole('group', { name: 'Month totals' })).toContainText(
    '1,905',
  )
})

test('late data cannot overwrite the chosen month; bounds and focus refresh remain usable', async ({
  page,
}) => {
  await open(page, 'stale')
  await page.getByRole('button', { name: 'Next month', exact: true }).click()
  await expect(page.getByRole('table', { name: 'November 2026' })).toBeVisible()
  await page.evaluate(() =>
    (
      window as unknown as { completeActivityRead: () => void }
    ).completeActivityRead(),
  )
  await expect(page.getByRole('table', { name: 'October 2026' })).toHaveCount(0)
  await page.getByLabel('Month', { exact: true }).fill('0001-01')
  await expect(
    page.getByRole('button', { name: 'Previous month', exact: true }),
  ).toBeDisabled()
  await expect(page.getByRole('table', { name: 'January 1' })).toBeVisible()
  await page.getByLabel('Month', { exact: true }).fill('9999-12')
  await expect(
    page.getByRole('button', { name: 'Next month', exact: true }),
  ).toBeDisabled()
  await expect(page.getByRole('table', { name: 'December 9999' })).toBeVisible()
  const before = await page.evaluate(() =>
    (
      window as unknown as { activityReadCount: () => number }
    ).activityReadCount(),
  )
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as unknown as { activityReadCount: () => number }
        ).activityReadCount(),
      ),
    )
    .toBeGreaterThan(before)
})

test('forced colors preserve selection and intensity bars without color-only meaning', async ({
  page,
}) => {
  await open(page)
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' })
  const high = page.getByRole('button', { name: /^Oct 12, 2026:/ })
  const low = page.getByRole('button', { name: /^Oct 6, 2026:/ })
  await high.click()
  await expect(high).toHaveAttribute('aria-pressed', 'true')
  expect(
    await high
      .locator('.activity-calendar-bar')
      .evaluate((element) => element.getBoundingClientRect().width),
  ).toBeGreaterThan(
    await low
      .locator('.activity-calendar-bar')
      .evaluate((element) => element.getBoundingClientRect().width),
  )
  await expect(
    page.getByRole('region', { name: /^Activity for / }),
  ).toContainText('1,000 / 1,000 credited words')
})
