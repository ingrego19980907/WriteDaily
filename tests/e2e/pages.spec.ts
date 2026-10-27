import { expect, test } from '@playwright/test'
import type { Editor } from '@tiptap/core'
import { startWriting } from './editor-mode'

for (const width of [320, 1100]) {
  test(`A4 pages wrap long paragraphs without changing text at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 850 })
    await page.goto('/tests/fixtures/chapters.html')
    await page.getByRole('button', { name: 'Open book', exact: true }).click()
    await page
      .getByRole('button', { name: 'Edit chapter text', exact: true })
      .last()
      .click()
    await startWriting(page)
    await page.clock.install()
    await page.clock.pauseAt(new Date())
    const field = page.getByRole('textbox', { name: 'Chapter manuscript' })
    const text = 'Alpha beta gamma delta. '.repeat(120).trim()
    await field.fill(text)
    const before = await field.evaluate((element) =>
      (element as HTMLElement & { editor: Editor }).editor.getJSON(),
    )
    await page.clock.runFor(100)
    expect(await page.locator('.manuscript-sheet').count()).toBeGreaterThan(1)
    const sheet = await page.locator('.manuscript-sheet').first().boundingBox()
    expect(sheet!.height / sheet!.width).toBeCloseTo(297 / 210, 2)
    expect(
      await field.evaluate((element) =>
        (element as HTMLElement & { editor: Editor }).editor.getJSON(),
      ),
    ).toEqual(before)
    await expect(field).toHaveText(text)
    const outside = await field.evaluate((element) => {
      const root = element as HTMLElement
      const top = root.getBoundingClientRect().top
      const height = parseFloat(
        getComputedStyle(root.parentElement!.parentElement!).getPropertyValue(
          '--paper-height',
        ),
      )
      const padding = parseFloat(getComputedStyle(root).paddingTop)
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      let node: Node | null
      const wrong: number[] = []
      while ((node = walker.nextNode())) {
        const range = document.createRange()
        range.selectNodeContents(node)
        for (const rect of Array.from(range.getClientRects())) {
          const y = rect.top - top
          const index = Math.floor(y / (height + 24))
          if (
            y < index * (height + 24) + padding - 3 ||
            rect.bottom - top > index * (height + 24) + height - padding + 3
          )
            wrong.push(y)
        }
      }
      return wrong
    })
    expect(outside).toEqual([])
    if (width === 1100) {
      const oldCount = await page.locator('.manuscript-sheet').count()
      await page.clock.resume()
      await page.addStyleTag({ content: 'html { font-size: 200%; }' })
      await expect
        .poll(() => page.locator('.manuscript-sheet').count())
        .toBeGreaterThan(oldCount)
      expect(
        await field.evaluate((element) =>
          (element as HTMLElement & { editor: Editor }).editor.getJSON(),
        ),
      ).toEqual(before)
    }

    await page.screenshot({ path: testInfo.outputPath('a4-pages.png') })
  })
}

test('Add page preserves writing, moves the cursor and persists manual sheets', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 850 })
  await page.goto('/tests/fixtures/chapters.html')
  await page.getByRole('button', { name: 'Open book', exact: true }).click()
  await page
    .getByRole('button', { name: 'Edit chapter text', exact: true })
    .last()
    .click()
  await startWriting(page)
  const field = page.getByRole('textbox', { name: 'Chapter manuscript' })
  await field.fill('First page')
  await field.press('Control+End')
  await page
    .getByRole('combobox', { name: 'Manuscript font family' })
    .selectOption('Arial')
  await page.getByRole('button', { name: 'Add page', exact: true }).click()
  await expect(page.locator('.manuscript-sheet')).toHaveCount(2)
  await expect(field).toBeFocused()
  const caretVisible = await field.evaluate((element) => {
    const editor = (element as HTMLElement & { editor: Editor }).editor
    const caret = editor.view.coordsAtPos(editor.state.selection.head)
    const body = element.closest('.modal-body')!.getBoundingClientRect()
    return caret.top >= body.top && caret.bottom <= body.bottom
  })
  expect(caretVisible).toBe(true)
  await page.keyboard.insertText('Second page')
  await expect(field.locator('p').first()).toHaveText('First page')
  await expect(field.locator('p').last()).toHaveText('Second page')
  await expect(
    field.locator('p').last().locator('span[data-font-family="Arial"]'),
  ).toHaveText('Second page')
  await field.press('Control+s')
  await expect(
    page.getByRole('status', { name: 'Save status', exact: true }),
  ).toHaveText('Chapter text saved.')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Close', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Edit chapter text', exact: true })
    .last()
    .click()
  await expect(field).toHaveAttribute('contenteditable', 'false')
  await expect(page.locator('.manuscript-sheet')).toHaveCount(2)
  await expect(field.locator('p').first()).toHaveText('First page')
  await expect(field.locator('p').last()).toHaveText('Second page')
  await expect(
    field.locator('p').last().locator('span[data-font-family="Arial"]'),
  ).toHaveText('Second page')
  await expect(
    page.getByRole('button', { name: 'Add page', exact: true }),
  ).toHaveCount(0)
})
