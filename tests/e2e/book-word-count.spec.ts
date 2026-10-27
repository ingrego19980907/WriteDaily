import { startWriting, previewChapter } from './editor-mode'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const width of [320, 640, 1100]) {
  test(`book totals track committed content, empty chapters and deletion at ${width}px (test IPC)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 850 })
    await page.goto('/tests/fixtures/chapters.html')
    await expect(page.getByRole('progressbar')).not.toHaveAttribute(
      'aria-valuenow',
    )
    await page.getByRole('button', { name: 'Open book', exact: true }).click()
    const total = page.locator('[aria-label="Book word count"]')
    await expect(total).toHaveText('Word count unavailable')
    await page
      .getByRole('button', { name: 'Edit chapter text', exact: true })
      .last()
      .click()
    await startWriting(page)
    const field = page.getByRole('textbox', { name: 'Chapter manuscript' })
    await field.fill('one two')
    await page
      .getByRole('button', { name: 'Save chapter text', exact: true })
      .click()
    await expect(page.locator('.manuscript-counts')).toContainText(
      '2 saved words',
    )
    // The other legacy chapter is still unknown: never present a partial sum.
    await expect(total).toHaveText('Word count unavailable')
    await previewChapter(page)
    await page
      .getByRole('button', { name: 'Previous chapter', exact: true })
      .click()
    await startWriting(page)
    await field.fill('alpha beta gamma')
    await page
      .getByRole('button', { name: 'Save chapter text', exact: true })
      .click()
    await expect(total).toHaveText('Saved book words: 5')
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Close', exact: true })
      .click()
    const list = page.getByRole('list', { name: 'Chapters', exact: true })
    await list
      .getByRole('button', { name: 'Rename chapter', exact: true })
      .first()
      .click()
    await page.getByRole('dialog').getByRole('textbox').fill('Renamed chapter')
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Save title', exact: true })
      .click()
    await expect(total).toHaveText('Saved book words: 5')
    await page
      .getByRole('button', { name: 'Create chapter', exact: true })
      .click()
    await page.getByRole('dialog').getByRole('textbox').fill('Empty chapter')
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Create chapter', exact: true })
      .click()
    await expect(total).toHaveText('Saved book words: 5')
    await list
      .getByRole('button', { name: 'Delete chapter', exact: true })
      .first()
      .click()
    await page.getByRole('dialog').getByRole('checkbox').check()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Delete chapter', exact: true })
      .click()
    await expect(total).toHaveText('Saved book words: 2')
    await page
      .getByRole('button', { name: 'Back to library', exact: true })
      .click()
    await expect(page.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '2',
    )
    await expect(page.getByRole('progressbar')).toHaveAttribute(
      'aria-valuemax',
      '2000',
    )
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
    ).toEqual([])
    await page.getByRole('button', { name: 'Open book', exact: true }).click()
    await list
      .getByRole('button', { name: 'Delete chapter', exact: true })
      .first()
      .click()
    await page.getByRole('dialog').getByRole('checkbox').check()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Delete chapter', exact: true })
      .click()
    await expect(total).toHaveText('Saved book words: 0')
    await page
      .getByRole('button', { name: 'Back to library', exact: true })
      .click()
    await expect(page.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '0',
    )
  })
}

for (const scenario of ['book-count-pending', 'book-count-failure']) {
  test(`book total advances only after a successful commit: ${scenario} (test IPC)`, async ({
    page,
  }) => {
    await page.goto(`/tests/fixtures/chapters.html?scenario=${scenario}`)
    await expect(page.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '0',
    )
    await page.getByRole('button', { name: 'Open book', exact: true }).click()
    const total = page.locator('[aria-label="Book word count"]')
    await expect(total).toHaveText('Saved book words: 0')
    await page
      .getByRole('button', { name: 'Edit chapter text', exact: true })
      .last()
      .click()
    await startWriting(page)
    await page
      .getByRole('textbox', { name: 'Chapter manuscript' })
      .fill('one two')
    await page
      .getByRole('button', { name: 'Save chapter text', exact: true })
      .click()
    await expect(total).toHaveText('Saved book words: 0')
    if (scenario === 'book-count-pending') {
      await expect(
        page.getByRole('textbox', { name: 'Chapter manuscript' }),
      ).toHaveAttribute('contenteditable', 'false')
      await page.evaluate(() =>
        (
          window as unknown as { completeTestSave: () => void }
        ).completeTestSave(),
      )
    } else {
      await expect(page.getByRole('alert')).toBeVisible()
      await page
        .getByRole('button', { name: 'Save chapter text', exact: true })
        .click()
    }
    await expect(total).toHaveText('Saved book words: 2')
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Close', exact: true })
      .click()
    await page
      .getByRole('button', { name: 'Back to library', exact: true })
      .click()
    await expect(page.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '2',
    )
  })
}
