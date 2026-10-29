import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const width of [320, 1100]) {
  test(`book filters preserve records and support keyboard/reflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 850 })
    await page.goto('/tests/fixtures/book-filters.html')
    const filters = page.getByRole('group', { name: 'Filter books' })
    const all = filters.getByRole('button', { name: 'All Books 2 books' })
    const completed = filters.getByRole('button', {
      name: 'Completed 1 book',
    })
    const progress = filters.getByRole('button', {
      name: 'In Progress 1 book',
    })
    const grid = page.getByRole('list', { name: 'Books' })
    await expect(all).toHaveAttribute('aria-pressed', 'true')
    await expect(grid.getByRole('listitem')).toHaveCount(2)
    await all.focus()
    await page.keyboard.press('Tab')
    await expect(progress).toBeFocused()
    await page.keyboard.press('Space')
    await expect(progress).toHaveAttribute('aria-pressed', 'true')
    await expect(grid.getByRole('listitem')).toHaveCount(1)
    await expect(grid).toContainText('A quiet story')
    await page.keyboard.press('Tab')
    await expect(completed).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(grid).toContainText('Another story')
    await expect(grid).not.toContainText('A quiet story')
    await expect(
      filters.getByRole('button', { name: 'Archived ? (count unavailable)' }),
    ).toBeDisabled()
    await all.click()
    await expect(grid.getByRole('listitem')).toHaveCount(2)
    expect(
      await page.evaluate(() =>
        (window as unknown as { filterWrites: () => number }).filterWrites(),
      ),
    ).toBe(0)
    await page.addStyleTag({ content: 'html{font-size:200%}' })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze()
      ).violations,
    ).toEqual([])
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' })
    await completed.click()
    await expect(completed).toHaveAttribute('aria-pressed', 'true')
    await expect(grid.getByRole('listitem')).toHaveCount(1)
  })
}
