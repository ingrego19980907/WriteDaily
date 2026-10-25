import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const width of [320, 640, 1100]) {
  test(`book progress handles zero, missing and exceeded goals at ${width}px (presentation fixture)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 760 })
    await page.goto('/tests/fixtures/book-progress.html')
    await expect(
      page
        .getByRole('article', { name: 'Zero words', exact: true })
        .getByRole('progressbar'),
    ).toHaveAttribute('aria-valuenow', '0')
    await expect(
      page
        .getByRole('article', { name: 'Partial progress', exact: true })
        .getByRole('progressbar'),
    ).toHaveAttribute('aria-valuenow', '250')
    const exceeded = page.getByRole('article', {
      name: 'Above target',
      exact: true,
    })
    await expect(exceeded.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '1000',
    )
    await expect(exceeded.getByRole('progressbar')).toHaveAttribute(
      'aria-valuetext',
      '1,500 / 1,000 words · 100% of target',
    )
    await expect(exceeded.getByText('500 words above target')).toBeVisible()
    await expect(
      page
        .getByRole('article', { name: 'No target', exact: true })
        .getByRole('progressbar'),
    ).toHaveCount(0)
    await expect(
      page
        .getByRole('article', { name: 'Unknown count', exact: true })
        .getByRole('progressbar'),
    ).not.toHaveAttribute('aria-valuenow')
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(results.violations).toEqual([])
    for (const scale of [100, 200]) {
      await page.addStyleTag({ content: `html { font-size: ${scale}%; }` })
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true)
    }
  })
}
