import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const width of [320, 1440]) {
  test(`compact horizontal cards preserve covers, full titles and actions at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/tests/fixtures/book-editing.html?cards')
    const cards = page.getByRole('list', { name: 'Books' }).getByRole('article')
    await expect(cards).toHaveCount(3)
    const first = cards.first()
    const cover = first.locator('.book-cover-image')
    const title = first.getByRole('heading')
    const text = await title.textContent()
    const titleBox = (await title.boundingBox())!
    const coverBox = (await cover.boundingBox())!
    expect(titleBox.x).toBeGreaterThan(coverBox.x + coverBox.width)
    const styles = await first.evaluate((element) => {
      const style = getComputedStyle(element)
      return {
        radius: style.borderRadius,
        padding: style.padding,
        border: style.borderTopWidth,
      }
    })
    expect(styles).toEqual({ radius: '16px', padding: '14px', border: '1px' })
    if (width === 1440) {
      expect(coverBox.width).toBeCloseTo(140, 0)
      expect(coverBox.height / coverBox.width).toBeCloseTo(4 / 3, 1)
      expect((await first.boundingBox())!.height).toBeLessThan(400)
      const image = cards.nth(1).getByRole('img', { name: 'Book cover' })
      await expect(image).toBeVisible()
      const actualCover = (await cards
        .nth(1)
        .locator('.book-cover-image')
        .boundingBox())!
      expect(actualCover.width).toBeCloseTo(140, 0)
      expect(actualCover.height / actualCover.width).toBeCloseTo(4 / 3, 1)
    }
    const collapsed = titleBox.height
    await title.focus()
    await expect(title).toBeFocused()
    expect((await title.boundingBox())!.height).toBeGreaterThan(collapsed)
    expect(await title.textContent()).toBe(text)
    await first
      .getByRole('button', { name: 'Book actions', exact: true })
      .focus()
    await page.keyboard.press('Enter')
    await expect(
      page.getByRole('button', { name: 'Manage cover', exact: true }),
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(
      first.getByRole('button', { name: 'Book actions', exact: true }),
    ).toBeFocused()
    await page.screenshot({
      path: testInfo.outputPath('compact-cards.png'),
      fullPage: true,
    })
    await page.addStyleTag({ content: 'html{font-size:200%}' })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
    ).toEqual([])
    await page.emulateMedia({ forcedColors: 'active' })
    await title.focus()
    await expect(title).toBeFocused()
  })
}
