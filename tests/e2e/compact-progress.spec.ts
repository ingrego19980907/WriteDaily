import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const width of [320, 1440]) {
  test(`compact writing hierarchy without Writing details handles boundaries at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/tests/fixtures/book-progress.html')
    const zero = page.getByRole('article', { name: 'Zero words', exact: true })
    const partial = page.getByRole('article', {
      name: 'Partial progress',
      exact: true,
    })
    const reached = page.getByRole('article', {
      name: 'Above target',
      exact: true,
    })
    await expect(zero.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '0',
    )
    await expect(zero.locator('.book-card-progress__percentage')).toHaveText(
      '0%',
    )
    await expect(
      zero.getByText('0 / 1,000 words', { exact: true }),
    ).toBeVisible()
    await expect(zero.getByLabel('Book deadline')).toHaveText('No deadline')
    await expect(partial.locator('.book-card-progress__percentage')).toHaveText(
      '25%',
    )
    await expect(reached.locator('.book-card-progress__percentage')).toHaveText(
      '100%',
    )
    await expect(
      reached.getByText('1,500 / 1,000 words', { exact: true }),
    ).toBeVisible()
    const fill = partial.locator('.progress-bar__fill')
    const normalColor = await fill.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    )
    const reachedColor = await reached
      .locator('.progress-bar__fill')
      .evaluate((element) => getComputedStyle(element).backgroundColor)
    expect(normalColor).not.toBe(reachedColor)
    const bar = (await partial.getByRole('progressbar').boundingBox())!
    const percentage = (await partial
      .locator('.book-card-progress__percentage')
      .boundingBox())!
    expect(bar.height).toBe(6)
    expect(
      Math.abs(bar.y + bar.height / 2 - percentage.y - percentage.height / 2),
    ).toBeLessThan(2)
    expect(percentage.x).toBeGreaterThan(bar.x + bar.width)
    await expect(
      page
        .getByRole('article', { name: 'No target', exact: true })
        .getByRole('progressbar'),
    ).toHaveCount(0)
    const unknown = page.getByRole('article', {
      name: 'Unknown count',
      exact: true,
    })
    await expect(unknown.locator('.book-card-progress__percentage')).toHaveText(
      '—',
    )
    await expect(unknown.getByRole('progressbar')).not.toHaveAttribute(
      'aria-valuenow',
    )
    await expect(
      page
        .getByRole('article', { name: 'Very large count', exact: true })
        .getByText('9,007,199,254,740,991 / 9,007,199,254,740,991 words', {
          exact: true,
        }),
    ).toBeVisible()
    await expect(
      page
        .getByRole('article', { name: 'Overdue', exact: true })
        .getByLabel('Book deadline'),
    ).toContainText('overdue')
    await expect(
      zero.getByRole('group', { name: 'Required writing pace' }),
    ).toHaveCount(0)
    await expect(
      page.getByText('Writing details', { exact: true }),
    ).toHaveCount(0)
    await expect(page.getByRole('article').locator('details')).toHaveCount(0)
    await expect(zero.getByRole('progressbar')).toHaveCount(1)
    await expect(
      zero.getByRole('group', { name: 'Required writing pace' }),
    ).toHaveCount(0)
    await partial.screenshot({
      path: testInfo.outputPath('compact-progress.png'),
    })
    await reached.screenshot({
      path: testInfo.outputPath('reached-progress.png'),
    })
    await page.addStyleTag({ content: 'html{font-size:200%}' })
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
    await zero.getByRole('heading').focus()
    await expect(zero.getByRole('heading')).toBeFocused()
  })
}
