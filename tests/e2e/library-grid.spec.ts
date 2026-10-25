import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const [width, columns] of [
  [320, 1],
  [640, 1],
  [1100, 2],
  [1440, 3],
] as const) {
  test(`library has ${columns} columns and opens the correct duplicate title at ${width}px (test IPC)`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 760 })
    await page.goto('/tests/fixtures/book-editing.html?grid')
    const list = page.getByRole('list', { name: 'Books', exact: true })
    await expect(list.getByRole('article')).toHaveCount(3)
    expect(
      await list.evaluate(
        (element) =>
          getComputedStyle(element).gridTemplateColumns.split(' ').length,
      ),
    ).toBe(columns)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(scan.violations).toEqual([])
    await page.screenshot({
      path: testInfo.outputPath('grid.png'),
      fullPage: true,
    })
    const open = list
      .getByRole('article')
      .nth(1)
      .getByRole('button', { name: 'Open book', exact: true })
    await open.focus()
    await page.keyboard.press('Enter')
    await expect(
      page.getByRole('heading', { name: 'Writing Editor', exact: true }),
    ).toBeFocused()
    const selected = page.getByRole('region', {
      name: 'A quiet story',
      exact: true,
    })
    await expect(selected).toContainText('Target: 2,000 words')
    await expect(selected).toContainText('Chapter editing is coming soon.')
    await page.getByRole('button', { name: 'Back to library' }).click()
    await expect(list.getByRole('article')).toHaveCount(3)
    await page.addStyleTag({ content: 'html { font-size: 200%; }' })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
  })
}
