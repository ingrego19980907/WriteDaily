import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const width of [320, 640, 1100]) {
  test(`confirmed deletion cancels safely and requires reconfirmation after conflict at ${width}px (test IPC)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 480 })
    await page.goto('/tests/fixtures/book-editing.html')
    const trigger = page.getByRole('button', {
      name: 'Delete book',
      exact: true,
    })
    await trigger.click()
    const dialog = page.getByRole('dialog', {
      name: 'Delete book',
      exact: true,
    })
    const remove = dialog.getByRole('button', {
      name: 'Delete book',
      exact: true,
    })
    await expect(dialog.getByText('A quiet story')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeFocused()
    await expect(remove).toBeDisabled()
    await page.keyboard.press('Enter')
    await expect(dialog).toHaveCount(0)
    await expect(trigger).toBeFocused()
    await trigger.click()
    await page.getByRole('checkbox').check()
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
    await trigger.click()
    await expect(page.getByRole('checkbox')).not.toBeChecked()
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(results.violations).toEqual([])
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
    await page.getByRole('checkbox').check()
    await remove.click()
    await expect(page.getByRole('alert')).toContainText('changed')
    await expect(remove).toBeDisabled()
    await expect(page.getByRole('checkbox')).not.toBeChecked()
    await page.getByRole('button', { name: 'Load latest details' }).click()
    await expect(dialog.getByText('Latest details')).toBeVisible()
    await expect(remove).toBeDisabled()
    await page.getByRole('checkbox').check()
    await remove.click()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByText('Book deleted: Latest details')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Books', exact: true }),
    ).toBeFocused()
    await expect(
      page.getByRole('list', { name: 'Books' }).getByRole('listitem'),
    ).toHaveCount(0)
  })
}
