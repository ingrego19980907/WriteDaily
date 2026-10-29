import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const width of [320, 640, 1100]) {
  test(`book cards render titles, cover states and unknown progress at ${width}px (test IPC)`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 760 })
    await page.goto('/tests/fixtures/book-editing.html?cards')
    await expect(page.getByRole('article')).toHaveCount(3)
    await expect(page.getByText('No cover yet', { exact: true })).toBeVisible()
    await expect(page.getByRole('img', { name: 'Book cover' })).toBeVisible()
    await expect(page.getByRole('alert')).toHaveText(
      'The saved cover could not be loaded.',
    )
    await expect(
      page.getByText('No word target', { exact: true }),
    ).toBeVisible()
    await expect(
      page
        .getByRole('list', { name: 'Books' })
        .getByText('Completed', { exact: true }),
    ).toBeVisible()
    for (const progress of await page.getByRole('progressbar').all()) {
      await expect(progress).not.toHaveAttribute('aria-valuenow')
      await expect(progress).toHaveAttribute(
        'aria-valuetext',
        'Word count unavailable',
      )
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(scan.violations).toEqual([])
    await page.screenshot({
      path: testInfo.outputPath('cards.png'),
      fullPage: true,
    })
    await page.addStyleTag({ content: 'html { font-size: 200%; }' })
    const overflows = await page.locator('body *').evaluateAll((elements) =>
      elements
        .filter(
          (element) => element.getBoundingClientRect().right > innerWidth + 1,
        )
        .map((element) => ({
          tag: element.tagName,
          class: element.className,
          width: element.getBoundingClientRect().width,
        })),
    )
    expect(overflows).toEqual([])
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
    const first = page.getByRole('article').first()
    await first
      .getByRole('button', { name: 'Book actions', exact: true })
      .click()
    const manage = page.getByRole('button', {
      name: 'Manage cover',
      exact: true,
    })
    await manage.focus()
    await page.keyboard.press('Enter')
    await expect(
      page
        .getByRole('dialog', { name: 'Manage cover' })
        .getByLabel('Cover image', { exact: true }),
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await first
      .getByRole('button', { name: 'Book actions', exact: true })
      .click()
    await page.getByRole('button', { name: 'Edit book', exact: true }).click()
    await expect(page.getByLabel('Title', { exact: true })).toHaveValue(
      'ДовгаНазва'.repeat(22),
    )
    await page.keyboard.press('Escape')
    await expect(
      first.getByRole('button', { name: 'Book actions', exact: true }),
    ).toBeFocused()
  })
}
