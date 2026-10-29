import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.use({ timezoneId: 'UTC' })
for (const width of [320, 1100]) {
  test(`header statistics show native response values and reflow at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 850 })
    await page.clock.install({ time: new Date('2026-10-28T12:00:00Z') })
    await page.goto('/tests/fixtures/writing-statistics.html')
    const summary = page.getByRole('group', {
      name: 'Writing statistics',
      exact: true,
    })
    const items = summary.locator('dl > div')
    await expect(items.nth(0)).toContainText('3 days')
    await expect(items.nth(1).locator('dd')).toHaveText('50')
    await expect(items.nth(2).locator('dd')).toHaveText('2 today')
    expect(
      await page.evaluate(() =>
        (
          window as unknown as { currentStatisticsReads: () => number }
        ).currentStatisticsReads(),
      ),
    ).toBe(1)
    const first = (await items.nth(0).boundingBox())!
    const second = (await items.nth(1).boundingBox())!
    const title = page.getByRole('heading', { name: 'My Library', exact: true })
    const titleBounds = (await title.boundingBox())!
    const summaryBounds = (await summary.boundingBox())!
    if (width === 1100) {
      expect(first.y).toBeCloseTo(second.y, 0)
      const firstValue = (await items.nth(0).locator('dd').boundingBox())!
      const secondValue = (await items.nth(1).locator('dd').boundingBox())!
      expect(firstValue.y).toBeCloseTo(secondValue.y, 0)
      expect(summaryBounds.x).toBeGreaterThanOrEqual(
        titleBounds.x + titleBounds.width,
      )
      expect(summaryBounds.y).toBeCloseTo(titleBounds.y, 0)
    } else {
      expect(second.y).toBeGreaterThan(first.y)
      expect(summaryBounds.y).toBeGreaterThan(
        titleBounds.y + titleBounds.height,
      )
    }
    expect(
      await page
        .locator('.library-page-header__subtitle')
        .evaluate((element) => getComputedStyle(element).fontStyle),
    ).toBe('italic')
    await page
      .locator('.library-page-header')
      .screenshot({ path: testInfo.outputPath('header.png') })
    await summary.screenshot({ path: testInfo.outputPath('statistics.png') })
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
    await page.emulateMedia({ forcedColors: 'active' })
    await expect(summary).toBeVisible()
    await expect(items.nth(2)).toContainText('2 today')
  })
}
test('loading, failures and genuine empty data never become invented examples', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-28T12:00:00Z') })
  await page.goto('/tests/fixtures/writing-statistics.html?state=pending')
  const summary = page.getByRole('group', {
    name: 'Writing statistics',
    exact: true,
  })
  await expect(
    summary.locator('dd').filter({ hasText: 'Loading…' }),
  ).toHaveCount(3)
  await page.evaluate(() =>
    (
      window as unknown as { completeWritingStatistics: () => void }
    ).completeWritingStatistics(),
  )
  await expect(summary.locator('dd').nth(1)).toHaveText('50')
  await page.goto('/tests/fixtures/writing-statistics.html?state=failed')
  await expect(
    summary.locator('dd').filter({ hasText: 'Unavailable' }),
  ).toHaveCount(3)
  await expect(summary.locator('dd').filter({ hasText: /^0/ })).toHaveCount(0)
  await page.goto('/tests/fixtures/writing-statistics.html?state=empty')
  await expect(summary.locator('dd').nth(0)).toHaveText('0 days')
  await expect(summary.locator('dd').nth(1)).toHaveText('0')
  await expect(summary.locator('dd').nth(2)).toHaveText('0 today')
})
test('lower-bound and unknown streaks stay explicit; daily failures can retry', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-28T12:00:00Z') })
  const summary = page.getByRole('group', {
    name: 'Writing statistics',
    exact: true,
  })
  await page.goto('/tests/fixtures/writing-statistics.html?state=partial')
  await expect(summary.locator('dd').nth(0)).toContainText('≥')
  await expect(summary.locator('dd').nth(0)).toContainText(
    'Confirmed days only',
  )
  await page.goto('/tests/fixtures/writing-statistics.html?state=unknown')
  await expect(summary.locator('dd').nth(0)).toContainText('Unavailable')
  await expect(summary.locator('dd').nth(1)).toHaveText('50')
  await page.goto('/tests/fixtures/writing-statistics.html?state=day-failure')
  await expect(summary.locator('dd').nth(1)).toContainText('Unavailable')
  await page
    .getByRole('button', { name: 'Refresh streak', exact: true })
    .click()
  await expect(summary.locator('dd').nth(1)).toHaveText('50')
})
test('a late yesterday response is ignored, and hidden library summaries stop reading', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-28T23:59:40Z') })
  await page.clock.pauseAt(new Date('2026-10-28T23:59:50Z'))
  await page.goto('/tests/fixtures/writing-statistics.html?state=stale')
  const summary = page.getByRole('group', {
    name: 'Writing statistics',
    exact: true,
  })
  await expect(summary.locator('dd').nth(1)).toHaveText('Loading…')
  await page.clock.runFor(20000)
  await expect(summary.locator('dd').nth(1)).toHaveText('0')
  await page.evaluate(() =>
    (
      window as unknown as { completeWritingStatistics: () => void }
    ).completeWritingStatistics(),
  )
  await expect(summary.locator('dd').nth(1)).toHaveText('0')
  await page
    .getByRole('button', { name: 'Goals & Deadlines', exact: true })
    .click()
  const reads = await page.evaluate(() =>
    (
      window as unknown as { dailyStatisticsReads: () => number }
    ).dailyStatisticsReads(),
  )
  await page.clock.runFor(120000)
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { dailyStatisticsReads: () => number }
      ).dailyStatisticsReads(),
    ),
  ).toBe(reads)
  await page.getByRole('button', { name: 'My Library', exact: true }).click()
  await expect(summary.locator('dd').nth(1)).toHaveText('0')
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { dailyStatisticsReads: () => number }
      ).dailyStatisticsReads(),
    ),
  ).toBeGreaterThan(reads)
})
