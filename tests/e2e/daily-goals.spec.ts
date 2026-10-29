import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const width of [320, 640, 1100]) {
  test(`daily goals validate, commit, clear and reflect in editor at ${width}px (test IPC)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 650 })
    await page.goto('/tests/fixtures/book-editing.html?daily-goals')
    const card = page.getByRole('article')
    await expect(card.locator('details')).toHaveCount(0)
    const edit = async () => {
      await card
        .getByRole('button', { name: 'Book actions', exact: true })
        .click()
      await page.getByRole('button', { name: 'Edit book', exact: true }).click()
    }
    await edit()
    const input = page.getByLabel('Daily word goal (optional)', { exact: true })
    await expect(input).toHaveValue('')
    await expect(input).toHaveAttribute('aria-describedby', /hint/)
    for (const invalid of ['0', '-1', '1.5', '9007199254740992']) {
      await input.fill(invalid)
      await page
        .getByRole('button', { name: 'Save changes', exact: true })
        .click()
      await expect(input).toHaveAttribute('aria-invalid', 'true')
      await expect(input).toBeFocused()
    }
    await input.fill('1500')
    await page.keyboard.press('Escape')
    await expect(
      card.getByText('Writing details', { exact: true }),
    ).toHaveCount(0)
    await edit()
    await expect(input).toHaveValue('1500')
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
    ).toEqual([])
    await page
      .getByRole('button', { name: 'Save changes', exact: true })
      .click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.getByRole('button', { name: 'Open book', exact: true }).click()
    await expect(
      page
        .getByRole('region', { name: 'A quiet story', exact: true })
        .getByText('Daily goal: 1,500 words', { exact: true }),
    ).toBeVisible()
    await page
      .getByRole('button', { name: 'Back to library', exact: true })
      .click()
    await edit()
    await expect(input).toHaveValue('1500')
    await expect(page.getByLabel('Target word count (optional)')).toHaveValue(
      '50000',
    )
    await expect(page.getByLabel('Deadline (optional)')).toHaveValue(
      '2027-01-01',
    )
    await input.fill('')
    await page
      .getByRole('button', { name: 'Save changes', exact: true })
      .click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.getByRole('button', { name: 'Open book', exact: true }).click()
    await expect(
      page
        .getByRole('region', { name: 'A quiet story', exact: true })
        .getByText('No daily goal', { exact: true }),
    ).toBeVisible()
    await page.addStyleTag({ content: 'html { font-size: 200%; }' })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
  })
}
