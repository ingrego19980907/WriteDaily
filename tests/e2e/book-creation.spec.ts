import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const width of [320, 640, 1100]) {
  test(`creation form is accessible and preserves unsaved input at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 480 })
    await page.goto('/')
    const trigger = page.getByRole('button', {
      name: 'Create book',
      exact: true,
    })
    await trigger.click()
    const dialog = page.getByRole('dialog')
    await dialog
      .getByRole('button', { name: 'Create book', exact: true })
      .click()
    await expect(page.getByLabel('Title', { exact: true })).toBeFocused()
    await expect(page.getByLabel('Title', { exact: true })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    await page.getByLabel('Title', { exact: true }).fill('My story')
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
    await expect(page.getByLabel('Title', { exact: true })).toHaveValue(
      'My story',
    )
  })
}
