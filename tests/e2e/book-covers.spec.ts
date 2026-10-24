import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const width of [320, 640, 1100]) {
  test(`cover controls reject invalid input, display committed images and remove at ${width}px (test IPC)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 480 })
    await page.goto('/tests/fixtures/book-editing.html')
    const input = page.getByLabel('Cover image', { exact: true })
    const save = page.getByRole('button', { name: 'Save cover', exact: true })
    await expect(input).toBeVisible()
    await expect(save).toBeDisabled()
    await input.setInputFiles({
      name: 'invalid.png',
      mimeType: 'image/png',
      buffer: Buffer.from('invalid image'),
    })
    await save.click()
    await expect(page.getByRole('alert')).toContainText('valid PNG')
    await expect(page.getByRole('img', { name: 'Book cover' })).toHaveCount(0)
    await input.setInputFiles('src-tauri/icons/32x32.png')
    await save.click()
    await expect(page.getByText('Cover saved.', { exact: true })).toBeVisible()
    const image = page.getByRole('img', { name: 'Book cover' })
    await expect(image).toBeVisible()
    expect(
      await image.evaluate(
        (element) => (element as HTMLImageElement).naturalWidth,
      ),
    ).toBeGreaterThan(0)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(results.violations).toEqual([])
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
    await page
      .getByRole('button', { name: 'Remove cover', exact: true })
      .click()
    await expect(
      page.getByText('Cover removed.', { exact: true }),
    ).toBeVisible()
    await expect(image).toHaveCount(0)
  })
}
