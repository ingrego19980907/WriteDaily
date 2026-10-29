import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const width of [320, 1100]) {
  test(`library loading, retry, confirmed empty and native validation work at ${width}px (test IPC)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 760 })
    await page.goto('/tests/fixtures/book-editing.html?state=loading')
    await expect(page.getByText('Loading books…')).toBeVisible()
    await expect(
      page.getByRole('list', { name: 'Books', exact: true }),
    ).toHaveAttribute('aria-busy', 'true')
    await expect(
      page.getByText(
        'Create your first book and begin writing, one day at a time.',
      ),
    ).toHaveCount(0)
    await page.goto('/tests/fixtures/book-editing.html?state=retry')
    await expect(page.getByRole('alert')).toContainText('Could not load')
    await expect(
      page.getByText(
        'Create your first book and begin writing, one day at a time.',
      ),
    ).toHaveCount(0)
    await page.getByRole('button', { name: 'Retry loading books' }).click()
    await expect(
      page.getByRole('heading', { name: 'Your story starts here' }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Books', exact: true }),
    ).toBeFocused()
    await page.getByRole('button', { name: 'New Book', exact: true }).click()
    const dialog = page.getByRole('dialog')
    const submit = dialog.getByRole('button', {
      name: 'Create book',
      exact: true,
    })
    await page.getByLabel('Book title', { exact: true }).fill('Preserved story')
    await page.getByLabel('Daily word goal (optional)').fill('-1')
    await submit.click()
    await expect(page.getByRole('alert')).toHaveText(
      'Check the highlighted fields before saving.',
    )
    await expect(page.getByLabel('Daily word goal (optional)')).toBeFocused()
    await page.getByLabel('Daily word goal (optional)').fill('500')
    await submit.click()
    await expect(
      page.getByLabel('Book title', { exact: true }),
    ).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByLabel('Book title', { exact: true })).toBeFocused()
    await expect(page.getByLabel('Book title', { exact: true })).toHaveValue(
      'Preserved story',
    )
    await expect(page.getByLabel('Daily word goal (optional)')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(scan.violations).toEqual([])
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'New Book', exact: true }).click()
    await expect(page.getByLabel('Book title', { exact: true })).toHaveValue(
      'Preserved story',
    )
  })
}
