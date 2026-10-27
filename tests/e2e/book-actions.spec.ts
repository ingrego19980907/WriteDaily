import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const width of [320, 640, 1100]) {
  test(`card dots expose scoped actions and restore keyboard focus at ${width}px (test IPC)`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 850 })
    await page.goto('/tests/fixtures/book-editing.html?grid')
    const card = page.getByRole('article').nth(1)
    const trigger = card.getByRole('button', {
      name: 'Book actions',
      exact: true,
    })
    await expect(
      card.getByRole('button', { name: 'Edit book', exact: true }),
    ).toHaveCount(0)
    const bounds = await card.boundingBox()
    const dots = await trigger.boundingBox()
    expect(dots!.x + dots!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width)
    expect(dots!.y - bounds!.y).toBeLessThan(16)
    await trigger.focus()
    await page.keyboard.press('Enter')
    const actions = card.getByRole('group', {
      name: 'Book actions',
      exact: true,
    })
    await expect(actions.getByRole('button')).toHaveCount(3)
    await page.keyboard.press('Tab')
    await expect(
      actions.getByRole('button', { name: 'Edit book', exact: true }),
    ).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(
      actions.getByRole('button', { name: 'Manage cover', exact: true }),
    ).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(
      actions.getByRole('button', { name: 'Delete book', exact: true }),
    ).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await trigger.click()
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
    ).toEqual([])
    await actions
      .getByRole('button', { name: 'Edit book', exact: true })
      .click()
    await expect(page.getByLabel('Target word count (optional)')).toHaveValue(
      '2000',
    )
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await trigger.click()
    await actions
      .getByRole('button', { name: 'Delete book', exact: true })
      .click()
    await expect(
      page
        .getByRole('dialog')
        .getByRole('button', { name: 'Delete book', exact: true }),
    ).toBeDisabled()
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(trigger).toBeFocused()
    await expect(page.getByRole('article')).toHaveCount(3)
    await trigger.click()
    await page.getByRole('heading', { name: 'My Library', level: 1 }).click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await page.addStyleTag({ content: 'html{font-size:200%;}' })
    await trigger.click()
    const panel = await actions.boundingBox()
    expect(panel!.x).toBeGreaterThanOrEqual(0)
    expect(panel!.x + panel!.width).toBeLessThanOrEqual(width)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' })
    await card.screenshot({ path: testInfo.outputPath('book-actions.png') })
  })
}
