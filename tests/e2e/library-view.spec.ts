import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const width of [320, 1100]) {
  test(`Unicode search and both book views preserve actions and reflow at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 850 })
    await page.goto('/tests/fixtures/book-filters.html?search')
    const search = page.getByRole('searchbox', { name: 'Search books' })
    const books = page.getByRole('list', { name: 'Books' })
    const grid = page.getByRole('button', { name: 'Grid view', exact: true })
    const list = page.getByRole('button', { name: 'List view', exact: true })
    await expect(books.getByRole('listitem')).toHaveCount(2)
    await expect(grid).toHaveAttribute('aria-pressed', 'true')
    await search.fill('CAFE\u0301')
    await expect(books.getByRole('listitem')).toHaveCount(1)
    await expect(books).toContainText('Українська історія Café')
    await search.fill('ІСТОРІЯ')
    await page.getByRole('button', { name: 'Completed 1 book' }).click()
    await expect(books.getByRole('listitem')).toHaveCount(1)
    await expect(books).toContainText('Історія 東京')
    await search.focus()
    await page.keyboard.press('Tab')
    await expect(grid).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(list).toBeFocused()
    await page.keyboard.press('Space')
    await expect(list).toHaveAttribute('aria-pressed', 'true')
    await expect(grid).toHaveAttribute('aria-pressed', 'false')
    await expect(books).toHaveClass('library-list')
    await books
      .getByRole('button', { name: 'Book actions', exact: true })
      .click()
    await page.getByRole('button', { name: 'Edit book', exact: true }).click()
    await expect(
      page.getByRole('dialog').getByLabel('Title', { exact: true }),
    ).toHaveValue('Історія 東京')
    await page.keyboard.press('Escape')
    await search.fill('no matching title')
    await expect(
      page.getByRole('heading', { name: 'No books found' }),
    ).toBeVisible()
    await expect(books.getByRole('listitem')).toHaveCount(0)
    await search.fill('')
    await page.getByRole('button', { name: 'All Books 2 books' }).click()
    await expect(books.getByRole('listitem')).toHaveCount(2)
    await books.screenshot({ path: testInfo.outputPath('list-view.png') })
    if (width === 1100) {
      const cover = await books
        .locator('.book-cover-image')
        .first()
        .boundingBox()
      const title = await books.getByRole('heading').first().boundingBox()
      expect(title!.x).toBeGreaterThan(cover!.x + cover!.width)
    }
    await page.addStyleTag({ content: 'html{font-size:200%}' })
    await list.hover()
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
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' })
    await list.focus()
    await expect(list).toBeFocused()
    await grid.focus()
    await page.keyboard.press('Enter')
    await expect(books).toHaveClass('library-grid')
    await expect(books.getByRole('listitem')).toHaveCount(2)
    expect(
      await page.evaluate(() =>
        (window as unknown as { filterWrites: () => number }).filterWrites(),
      ),
    ).toBe(0)
  })
}
