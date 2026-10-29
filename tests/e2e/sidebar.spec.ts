import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const width of [320, 640, 1100]) {
  test(`cozy sidebar preserves routes and disabled destinations at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 850 })
    await page.goto('/')
    const brand = page.getByRole('banner')
    const sidebar = page.getByRole('complementary', {
      name: 'Application navigation',
    })
    const nav = sidebar.getByRole('navigation', { name: 'Main navigation' })
    const main = page.getByRole('main')
    await expect(
      nav.getByRole('button', { name: 'Statistics', exact: true }),
    ).toBeDisabled()
    const goals = nav.getByRole('button', {
      name: 'Goals & Deadlines',
      exact: true,
    })
    await expect(goals).toHaveText('Goals')
    await expect(
      nav.getByRole('button', { name: 'Activity Calendar', exact: true }),
    ).toHaveText('Activity')
    const bounds = await sidebar.boundingBox()
    const brandBounds = await brand.boundingBox()
    const mainBounds = await main.boundingBox()
    expect(bounds).not.toBeNull()
    expect(brandBounds).not.toBeNull()
    expect(mainBounds).not.toBeNull()
    if (width >= 768) {
      expect(bounds!.width).toBeCloseTo(220, 0)
      expect(brandBounds!.x).toBeCloseTo(bounds!.x, 0)
      expect(brandBounds!.width).toBeCloseTo(bounds!.width, 0)
      expect(mainBounds!.x).toBeGreaterThanOrEqual(bounds!.x + bounds!.width)
      expect(mainBounds!.y).toBe(0)
    } else {
      expect(bounds!.width).toBe(width)
      expect(mainBounds!.y).toBeGreaterThanOrEqual(bounds!.y + bounds!.height)
    }
    await goals.focus()
    await page.keyboard.press('Enter')
    await expect(
      page.getByRole('heading', { name: 'Goals & Deadlines', exact: true }),
    ).toBeFocused()
    await expect(goals).toHaveAttribute('aria-current', 'page')
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1)
    await page.screenshot({
      path: testInfo.outputPath('sidebar.png'),
      fullPage: true,
    })
    await page.addStyleTag({ content: 'html{font-size:200%;}' })
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
    expect(
      await goals.evaluate((element) => getComputedStyle(element).borderStyle),
    ).toBe('double')
    await goals.focus()
    expect(
      await goals.evaluate((element) => getComputedStyle(element).outlineStyle),
    ).toBe('solid')
  })
}
