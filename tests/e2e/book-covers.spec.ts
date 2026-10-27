import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const width of [320, 640, 1100]) {
  test(`cover controls reject invalid input, display committed images and remove at ${width}px (test IPC)`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 480 })
    await page.goto('/tests/fixtures/book-editing.html')
    await page
      .getByRole('button', { name: 'Book actions', exact: true })
      .click()
    await page.getByText('Manage cover', { exact: true }).click()
    const input = page.getByLabel('Cover image', { exact: true })
    const save = page.getByRole('button', { name: 'Save cover', exact: true })
    await expect(input).toBeVisible()
    await expect(save).toBeDisabled()
    const picker = page.locator('.cover-picker')
    for (const position of [
      { x: 8, y: 8 },
      { x: 100, y: 90 },
    ]) {
      const chooser = page.waitForEvent('filechooser')
      await picker.click({ position })
      await (await chooser).setFiles([])
    }
    await input.focus()
    const keyboardChooser = page.waitForEvent('filechooser')
    await input.press('Space')
    await (await keyboardChooser).setFiles([])
    await expect(input).toBeFocused()
    expect(
      await picker.evaluate(
        (element) => getComputedStyle(element).outlineStyle,
      ),
    ).not.toBe('none')
    expect(
      await page
        .locator('.cover-picker__hint')
        .evaluate((element) => parseFloat(getComputedStyle(element).fontSize)),
    ).toBeLessThan(
      await page
        .locator('.cover-picker__title')
        .evaluate((element) => parseFloat(getComputedStyle(element).fontSize)),
    )
    await page
      .getByRole('dialog')
      .screenshot({ path: testInfo.outputPath('cover-picker.png') })

    await input.setInputFiles({
      name: 'invalid.png',
      mimeType: 'image/png',
      buffer: Buffer.from('invalid image'),
    })
    await save.click()
    await expect(page.getByRole('alert')).toContainText('valid PNG')
    await expect(page.getByRole('img', { name: 'Book cover' })).toHaveCount(0)
    await input.setInputFiles('src-tauri/icons/32x32.png')
    await expect(page.getByText('32x32.png', { exact: true })).toBeVisible()
    const draft = page.getByRole('img', { name: 'Unsaved cover preview' })
    await expect(draft).toBeVisible()
    await expect(draft).toHaveJSProperty('naturalWidth', 32)
    await expect(page.getByText('Cover saved.', { exact: true })).toHaveCount(0)
    // Discarding the first selection leaves a book without a cover unchanged.
    await page.keyboard.press('Escape')
    await expect(page.getByRole('article').getByRole('img')).toHaveCount(0)
    await page
      .getByRole('button', { name: 'Book actions', exact: true })
      .click()
    await page
      .getByRole('button', { name: 'Manage cover', exact: true })
      .click()
    await expect(draft).toHaveCount(0)
    await input.setInputFiles('src-tauri/icons/32x32.png')
    await expect(draft).toBeVisible()

    await save.click()
    await expect(page.getByText('Cover saved.', { exact: true })).toBeVisible()
    const image = page
      .getByRole('dialog', { name: 'Manage cover' })
      .getByRole('img', { name: 'Book cover' })
    await expect(image).toBeVisible()
    const notice = page.getByRole('dialog').getByRole('status')
    await expect(notice).toHaveText('Cover saved.')
    expect(await notice.locator('svg').getAttribute('aria-hidden')).toBe('true')
    const noticeBounds = await notice.boundingBox()
    const imageBounds = await image.boundingBox()
    const controlsBounds = await page
      .locator('.book-cover-controls')
      .boundingBox()
    expect(
      Math.abs(
        imageBounds!.x +
          imageBounds!.width / 2 -
          (controlsBounds!.x + controlsBounds!.width / 2),
      ),
    ).toBeLessThanOrEqual(1)
    expect(noticeBounds!.y + noticeBounds!.height).toBeLessThanOrEqual(
      imageBounds!.y,
    )
    expect(
      await notice.evaluate((element) =>
        parseFloat(getComputedStyle(element).fontSize),
      ),
    ).toBeLessThan(16)
    await notice.scrollIntoViewIfNeeded()
    await page
      .getByRole('dialog')
      .screenshot({ path: testInfo.outputPath('cover-saved.png') })

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
    const committedSource = await image.getAttribute('src')
    await input.setInputFiles('src-tauri/icons/128x128.png')
    await expect(draft).toBeVisible()
    await expect(draft).toHaveJSProperty('naturalWidth', 128)
    await expect(image).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(
      page.getByRole('article').getByRole('img', { name: 'Book cover' }),
    ).toHaveAttribute('src', committedSource!)
    await page
      .getByRole('button', { name: 'Book actions', exact: true })
      .click()
    await page
      .getByRole('button', { name: 'Manage cover', exact: true })
      .click()
    await expect(draft).toHaveCount(0)
    await expect(image).toHaveAttribute('src', committedSource!)
    await page
      .getByRole('button', { name: 'Remove cover', exact: true })
      .click()
    await expect(
      page.getByText('Cover removed.', { exact: true }),
    ).toBeVisible()
    await expect(image).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: 'Book actions', exact: true }),
    ).toBeFocused()
  })
}
