import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { startWriting, previewChapter } from './editor-mode'

for (const width of [320, 640, 1100]) {
  test(`chapter preview blocks edits and Start writing preserves the session at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 850 })
    await page.goto('/tests/fixtures/chapters.html')
    await page.getByRole('button', { name: 'Open book', exact: true }).click()
    await page
      .getByRole('button', { name: 'Edit chapter text', exact: true })
      .last()
      .click()
    const field = page.getByRole('textbox', { name: 'Chapter manuscript' })
    await expect(field).toHaveAttribute('contenteditable', 'false')
    await expect(field).toHaveAttribute('aria-readonly', 'true')
    await expect(page.getByRole('toolbar')).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: 'Save chapter text', exact: true }),
    ).toHaveCount(0)
    await expect(
      page.getByRole('combobox', { name: 'Manuscript font family' }),
    ).toHaveCount(0)
    const original = await field.textContent()
    await field.focus()
    await page.keyboard.type('Forbidden edit')
    await field.evaluate((element) => {
      const data = new DataTransfer()
      data.setData('text/plain', 'Forbidden paste')
      element.dispatchEvent(
        new ClipboardEvent('paste', {
          clipboardData: data,
          bubbles: true,
          cancelable: true,
        }),
      )
    })
    await expect(field).toHaveText(original ?? '')
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
    ).toEqual([])
    await startWriting(page)
    await expect(field).toHaveAttribute('aria-readonly', 'false')
    await field.fill('Keep this draft')
    await previewChapter(page)
    await expect(field).toHaveText('Keep this draft')
    await expect(page.getByRole('toolbar')).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: 'Save chapter text', exact: true }),
    ).toHaveCount(0)
    await startWriting(page)
    await expect(field).toHaveText('Keep this draft')
    await field.press('Control+s')
    await expect(
      page.getByRole('status', { name: 'Save status', exact: true }),
    ).toHaveText('Chapter text saved.')
    await previewChapter(page)
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Close', exact: true })
      .click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
}
