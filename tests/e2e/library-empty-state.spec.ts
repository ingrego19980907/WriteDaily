import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const width of [320, 1100]) {
  test(`empty library and search results remain distinct and actionable at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 850 })
    await page.goto('/tests/fixtures/book-creation.html')
    const empty = page.getByRole('region', { name: 'Your story starts here' })
    const cta = empty.getByRole('button', { name: 'Create your first book' })
    const toolbarTrigger = page.getByRole('button', {
      name: 'New Book',
      exact: true,
    })
    const books = page.getByRole('list', { name: 'Books', exact: true })
    await expect(empty).toBeVisible()
    await expect(
      empty.getByText(
        'Create your first book and begin writing, one day at a time.',
      ),
    ).toBeVisible()
    await expect(empty.locator('svg.lucide-book-open')).toHaveCount(1)
    await expect(books.getByRole('listitem')).toHaveCount(0)
    expect(
      await page.evaluate(
        () => (window as unknown as { creationCalls: string[] }).creationCalls,
      ),
    ).toEqual([])
    const panel = await empty.boundingBox()
    for (const part of [
      empty.locator('.library-empty-state__art'),
      empty.getByRole('heading'),
      cta,
    ]) {
      const box = await part.boundingBox()
      expect(
        Math.abs(box!.x + box!.width / 2 - panel!.x - panel!.width / 2),
      ).toBeLessThan(2)
    }
    expect(
      await empty.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
    ).toBe('rgb(247, 243, 236)')
    await empty.screenshot({ path: testInfo.outputPath('empty-library.png') })
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
    ).toEqual([])
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%'
    })
    await cta.focus()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    expect(
      await empty.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
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
    expect(
      await cta.evaluate((element) => getComputedStyle(element).outlineStyle),
    ).not.toBe('none')
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Create New Book' })
    await expect(dialog).toHaveCount(1)
    await dialog
      .getByLabel('Book title', { exact: true })
      .fill('Перші сторінки')
    await page.keyboard.press('Escape')
    await expect(cta).toBeFocused()
    await toolbarTrigger.click()
    await expect(dialog.getByLabel('Book title', { exact: true })).toHaveValue(
      'Перші сторінки',
    )
    await page.keyboard.press('Escape')
    await expect(toolbarTrigger).toBeFocused()
    await page.evaluate(() => {
      document.documentElement.style.fontSize = ''
    })
    await page.emulateMedia({
      forcedColors: 'none',
      reducedMotion: 'no-preference',
    })
    await cta.click()
    await dialog
      .getByRole('button', { name: 'Create book', exact: true })
      .click()
    await expect(dialog).toHaveCount(0)
    await expect(empty).toHaveCount(0)
    await expect(
      books.getByRole('article', { name: 'Перші сторінки' }),
    ).toBeVisible()
    await expect(toolbarTrigger).toBeFocused()
    expect(
      await page.evaluate(
        () => (window as unknown as { creationCalls: string[] }).creationCalls,
      ),
    ).toEqual(['create_book'])

    await page.goto('/tests/fixtures/book-filters.html?search')
    const search = page.getByRole('searchbox', { name: 'Search books' })
    await search.fill('a title that does not exist')
    const noMatches = page.getByRole('region', { name: 'No books found' })
    await expect(noMatches).toBeVisible()
    await expect(noMatches.locator('svg.lucide-search')).toHaveCount(1)
    await expect(
      page.getByRole('region', { name: 'Your story starts here' }),
    ).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: 'Create your first book' }),
    ).toHaveCount(0)
    await noMatches.screenshot({
      path: testInfo.outputPath('empty-search.png'),
    })
    const clear = noMatches.getByRole('button', { name: 'Clear search' })
    await clear.focus()
    await page.keyboard.press('Space')
    await expect(search).toBeFocused()
    await expect(search).toHaveValue('')
    await expect(noMatches).toHaveCount(0)
    await expect(
      page
        .getByRole('list', { name: 'Books', exact: true })
        .getByRole('listitem'),
    ).toHaveCount(2)
    expect(
      await page.evaluate(() =>
        (window as unknown as { filterWrites: () => number }).filterWrites(),
      ),
    ).toBe(0)
  })
}
