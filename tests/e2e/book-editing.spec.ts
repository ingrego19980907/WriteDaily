import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const width of [320, 640, 1100]) {
  test(`editing validates, retains drafts and recovers from conflict at ${width}px (test IPC)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 480 })
    await page.goto('/tests/fixtures/book-editing.html')
    const menu = page.getByRole('button', { name: 'Book actions', exact: true })
    const trigger = page.getByRole('button', { name: 'Edit book', exact: true })
    await menu.click()
    await trigger.click()
    const title = page.getByLabel('Title', { exact: true })
    await expect(title).toHaveValue('A quiet story')
    await title.fill('')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(title).toBeFocused()
    await expect(title).toHaveAttribute('aria-invalid', 'true')
    await title.fill('Failed draft')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('alert')).toContainText(
      'Could not save changes',
    )
    await page.keyboard.press('Escape')
    await expect(menu).toBeFocused()
    await page
      .getByRole('button', { name: 'Achievements', exact: true })
      .click()
    await page.getByRole('button', { name: 'My Library', exact: true }).click()
    await menu.click()
    await trigger.click()
    await expect(title).toHaveValue('Failed draft')
    await title.fill('Conflict draft')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('alert')).toContainText('changed elsewhere')
    await expect(
      page.getByRole('button', { name: 'Save changes' }),
    ).toBeDisabled()
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
      .getByRole('button', { name: 'Replace draft with latest details' })
      .click()
    await expect(title).toHaveValue('Latest details')
    await title.fill('Оновлена історія')
    await page.getByLabel('Daily word goal (optional)').fill('')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(
      page.getByRole('heading', { name: 'Оновлена історія' }),
    ).toBeVisible()
    await menu.click()
    await trigger.click()
    await expect(title).toHaveValue('Оновлена історія')
    await expect(page.getByLabel('Daily word goal (optional)')).toHaveValue('')
  })
}
