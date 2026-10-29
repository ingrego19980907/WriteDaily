import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const width of [320, 640, 1100]) {
  test(`creation form is accessible and preserves unsaved input at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 480 })
    await page.goto('/')
    const trigger = page.getByRole('button', {
      name: 'New Book',
      exact: true,
    })
    const toolbar = page.locator('.library-primary-toolbar')
    const triggerBox = await trigger.boundingBox()
    const toolbarBox = await toolbar.boundingBox()
    expect(
      Math.abs(
        triggerBox!.x + triggerBox!.width - toolbarBox!.x - toolbarBox!.width,
      ),
    ).toBeLessThan(2)
    await expect(trigger.locator('svg.lucide-plus')).toHaveCount(1)
    await trigger.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Create New Book' })
    const columns = await page
      .locator('.create-book-form')
      .evaluate(
        (element) =>
          getComputedStyle(element).gridTemplateColumns.split(' ').length,
      )
    expect(columns).toBe(width >= 768 ? 2 : 1)
    await dialog
      .getByRole('button', { name: 'Create book', exact: true })
      .click()
    await expect(page.getByLabel('Book title', { exact: true })).toBeFocused()
    await expect(
      page.getByLabel('Book title', { exact: true }),
    ).toHaveAttribute('aria-invalid', 'true')
    await page.getByLabel('Book title', { exact: true }).fill('My story')
    await dialog
      .getByRole('button', { name: 'Create book', exact: true })
      .click()
    await expect(page.getByRole('alert')).toHaveText(
      'Open the desktop app to save books to your library.',
    )
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(results.violations).toEqual([])
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
    await trigger.click()
    await expect(page.getByLabel('Book title', { exact: true })).toHaveValue(
      'My story',
    )
    // Enlarged text reflows to one column, preserving scrolling and modal focus.
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%'
    })
    expect(
      await page
        .locator('.create-book-form')
        .evaluate(
          (element) =>
            getComputedStyle(element).gridTemplateColumns.split(' ').length,
        ),
    ).toBe(1)
    expect(
      await dialog.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true)
    await page.getByLabel('Cover image', { exact: true }).focus()
    expect(
      (await dialog.locator('.modal-body').boundingBox())!.height,
    ).toBeGreaterThan(100)
    await expect(page.getByLabel('Cover image', { exact: true })).toBeFocused()
    const enlarged = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(enlarged.violations).toEqual([])
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' })
    await dialog.getByRole('button', { name: 'Close' }).focus()
    expect(
      await dialog
        .getByRole('button', { name: 'Close' })
        .evaluate((element) => getComputedStyle(element).outlineStyle),
    ).not.toBe('none')
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
  })
}
