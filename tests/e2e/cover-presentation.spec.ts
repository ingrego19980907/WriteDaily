import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const width of [320, 1440]) {
  test(`local and CSS default covers keep portrait frames at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    const remoteRequests: string[] = []
    page.on('request', (request) => {
      if (
        !request.url().startsWith('http://127.0.0.1:5174/') &&
        !request.url().startsWith('data:')
      )
        remoteRequests.push(request.url())
    })
    await page.goto('/tests/fixtures/book-editing.html?cards')
    const cards = page.getByRole('list', { name: 'Books' }).getByRole('article')
    await expect(cards).toHaveCount(3)
    await expect(
      cards.nth(1).getByRole('img', { name: 'Book cover' }),
    ).toBeVisible()
    for (const frame of await cards.locator('.library-cover__frame').all()) {
      const box = (await frame.boundingBox())!
      expect(box.height / box.width).toBeCloseTo(4 / 3, 1)
      expect(
        await frame.evaluate(
          (element) => getComputedStyle(element).borderRadius,
        ),
      ).toBe('10px')
    }
    const uploaded = cards.nth(1).getByRole('img', { name: 'Book cover' })
    await expect(uploaded).toHaveAttribute('src', /^data:image\/png;base64,/)
    expect(
      await uploaded.evaluate((element) => getComputedStyle(element).objectFit),
    ).toBe('cover')
    const art = cards.first().locator('.library-cover__frame--default')
    await expect(art).toBeVisible()
    expect(
      await art.evaluate(
        (element) => getComputedStyle(element).backgroundImage,
      ),
    ).toContain('gradient')
    const coverTitle = art.locator('.library-cover__title')
    await expect(coverTitle).toHaveText(
      (await cards.first().getByRole('heading').textContent())!,
    )
    if (width === 1440) await expect(coverTitle).toBeVisible()
    else await expect(coverTitle).toBeHidden()
    const failure = cards.nth(2).getByRole('alert')
    await expect(failure).toHaveText('The saved cover could not be loaded.')
    const frame = (await cards
      .nth(2)
      .locator('.library-cover__frame')
      .boundingBox())!
    expect((await failure.boundingBox())!.y).toBeGreaterThanOrEqual(
      frame.y + frame.height,
    )
    await cards
      .first()
      .screenshot({ path: testInfo.outputPath('default-cover.png') })
    await cards
      .nth(1)
      .screenshot({ path: testInfo.outputPath('uploaded-cover.png') })
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
    await expect(art).toBeVisible()
    expect(remoteRequests).toEqual([])
  })
}
