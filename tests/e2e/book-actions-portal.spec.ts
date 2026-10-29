import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const width of [320, 1100]) {
  test(`book actions escape clipping and retain keyboard/dialog behavior at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 550 })
    await page.goto('/tests/fixtures/book-editing.html?grid')
    const card = page.getByRole('article').first()
    const trigger = card.getByRole('button', {
      name: 'Book actions',
      exact: true,
    })
    const clip = await page.addStyleTag({
      content: '.book-card{overflow:hidden;height:90px!important;}',
    })
    await trigger.scrollIntoViewIfNeeded()
    await trigger.focus()
    await page.keyboard.press('ArrowDown')
    const panel = page.getByRole('group', { name: 'Book actions', exact: true })
    const edit = panel.getByRole('button', { name: 'Edit book', exact: true })
    const remove = panel.getByRole('button', {
      name: 'Delete book',
      exact: true,
    })
    await expect(edit).toBeFocused()
    expect(await panel.getAttribute('id')).toBe(
      await trigger.getAttribute('aria-controls'),
    )
    expect(
      await panel.evaluate(
        (element) => element.parentElement === document.body,
      ),
    ).toBe(true)
    await expect(panel.getByRole('button')).toHaveCount(3)
    await expect(
      panel.getByRole('button', { name: /Duplicate|Archive/i }),
    ).toHaveCount(0)
    await expect(edit.locator('svg')).toHaveClass(/lucide-pencil/)
    await expect(remove.locator('svg')).toHaveClass(
      /lucide-trash2|lucide-trash-2/,
    )
    const color = await remove.evaluate(
      (element) => getComputedStyle(element).color,
    )
    const rgb = color.match(/\d+/g)!.map(Number)
    expect(rgb[0]).toBeGreaterThan(rgb[1] * 1.5)
    const menu = (await panel.boundingBox())!
    const cardBox = (await card.boundingBox())!
    expect(
      menu.y < cardBox.y || menu.y + menu.height > cardBox.y + cardBox.height,
    ).toBe(true)
    expect(menu.x).toBeGreaterThanOrEqual(8)
    expect(menu.x + menu.width).toBeLessThanOrEqual(width - 7)
    expect(menu.y).toBeGreaterThanOrEqual(8)
    expect(menu.y + menu.height).toBeLessThanOrEqual(543)
    expect(
      await page.evaluate(
        ({ x, y }) =>
          !!document.elementFromPoint(x, y)?.closest('.book-card__menu-panel'),
        { x: menu.x + menu.width / 2, y: menu.y + menu.height - 15 },
      ),
    ).toBe(true)
    await panel.screenshot({ path: testInfo.outputPath('actions-menu.png') })
    await clip.evaluate((element) => {
      element.parentNode?.removeChild(element)
    })
    await page.keyboard.press('End')
    await expect(remove).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(card.getByRole('heading')).toBeFocused()
    await expect(panel).toHaveCount(0)
    await trigger.focus()
    await page.keyboard.press('ArrowUp')
    await expect(remove).toBeFocused()
    await page.keyboard.press('Home')
    await expect(edit).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(trigger).toBeFocused()
    await expect(panel).toHaveCount(0)
    await trigger.click()
    await remove.click()
    const dialog = page.getByRole('dialog', {
      name: 'Delete book',
      exact: true,
    })
    await expect(
      dialog.getByRole('button', { name: 'Delete book', exact: true }),
    ).toBeDisabled()
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(trigger).toBeFocused()
    await page.addStyleTag({ content: 'html{font-size:200%}' })
    await trigger.click()
    const enlarged = (await panel.boundingBox())!
    expect(enlarged.x).toBeGreaterThanOrEqual(8)
    expect(enlarged.x + enlarged.width).toBeLessThanOrEqual(width - 7)
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
    ).toEqual([])
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' })
    await edit.focus()
    await expect(edit).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
    await trigger.click()
    await page.getByRole('heading', { name: 'My Library', level: 1 }).click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
}
