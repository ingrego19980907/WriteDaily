import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import type { Editor } from '@tiptap/core'

async function openEditor(page: Page) {
  await page.goto('/tests/fixtures/chapters.html')
  await page.getByRole('button', { name: 'Open book', exact: true }).click()
  await page
    .getByRole('button', { name: 'Edit chapter text', exact: true })
    .last()
    .click()
  const field = page.getByRole('textbox', { name: 'Chapter manuscript' })
  await expect(field).toHaveAttribute('contenteditable', 'true')
  return {
    field,
    toolbar: page.getByRole('toolbar', { name: 'Text formatting' }),
  }
}

for (const width of [320, 640, 1100]) {
  test(`toolbar preserves selection and saves formatting at ${width}px (test IPC)`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 850 })
    const { field, toolbar } = await openEditor(page)
    await expect(
      toolbar.getByRole('button', { name: 'Undo', exact: true }),
    ).toBeDisabled()
    await expect(
      toolbar.getByRole('button', { name: 'Redo', exact: true }),
    ).toBeDisabled()
    await field.fill('Alpha beta')
    await field.locator('p').dblclick({ position: { x: 15, y: 10 } })
    const selected = await field.evaluate((element) => ({
      from: (element as HTMLElement & { editor: Editor }).editor.state.selection
        .from,
      to: (element as HTMLElement & { editor: Editor }).editor.state.selection
        .to,
      selected: window.getSelection()?.toString(),
    }))
    expect(selected.selected?.trim()).toBe('Alpha')
    expect(selected.to).toBeGreaterThan(selected.from)
    await toolbar.getByRole('button', { name: 'Bold', exact: true }).click()
    await expect(field).toBeFocused()
    expect(
      await field.evaluate((element) => ({
        from: (element as HTMLElement & { editor: Editor }).editor.state
          .selection.from,
        to: (element as HTMLElement & { editor: Editor }).editor.state.selection
          .to,
      })),
    ).toEqual({ from: selected.from, to: selected.to })
    await expect(field.locator('strong')).toHaveText('Alpha')
    await toolbar.getByRole('button', { name: 'Italic', exact: true }).click()
    await expect(field.locator('strong em, em strong')).toHaveText('Alpha')
    await expect(
      toolbar.getByRole('button', { name: 'Bold', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true')
    // Selection-only transactions must refresh the toolbar without changing writing.
    await field.press('Control+End')
    await expect(
      toolbar.getByRole('button', { name: 'Bold', exact: true }),
    ).toHaveAttribute('aria-pressed', 'false')
    for (const level of [1, 2, 3, 4, 5, 6]) {
      await toolbar
        .getByRole('button', { name: `Heading ${level}`, exact: true })
        .click()
      await expect(field.locator(`h${level}`)).toHaveText('Alpha beta')
      await expect(
        toolbar.getByRole('button', { name: `Heading ${level}`, exact: true }),
      ).toHaveAttribute('aria-pressed', 'true')
    }
    await toolbar
      .getByRole('button', { name: 'Paragraph', exact: true })
      .click()
    await toolbar
      .getByRole('button', { name: 'Bullet list', exact: true })
      .click()
    await expect(field.locator('ul li')).toHaveText('Alpha beta')
    await toolbar
      .getByRole('button', { name: 'Numbered list', exact: true })
      .click()
    await expect(field.locator('ol li')).toHaveText('Alpha beta')
    const beforeUndo = await field.evaluate((element) =>
      (element as HTMLElement & { editor: Editor }).editor.getJSON(),
    )
    await toolbar.getByRole('button', { name: 'Undo', exact: true }).click()
    expect(
      await field.evaluate((element) =>
        (element as HTMLElement & { editor: Editor }).editor.getJSON(),
      ),
    ).not.toEqual(beforeUndo)
    await expect(field).toHaveText('Alpha beta')
    await toolbar.getByRole('button', { name: 'Redo', exact: true }).click()
    expect(
      await field.evaluate((element) =>
        (element as HTMLElement & { editor: Editor }).editor.getJSON(),
      ),
    ).toEqual(beforeUndo)
    await expect(field.locator('ol li')).toHaveText('Alpha beta')
    await page
      .getByRole('button', { name: 'Save chapter text', exact: true })
      .click()
    await expect(
      page.getByRole('status').filter({ hasText: 'Chapter text saved.' }),
    ).toBeVisible()
    const committed = await field.evaluate((element) =>
      (element as HTMLElement & { editor: Editor }).editor.getJSON(),
    )
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Close', exact: true })
      .click()
    await page
      .getByRole('button', { name: 'Edit chapter text', exact: true })
      .last()
      .click()
    await expect(field).toHaveAttribute('contenteditable', 'true')
    expect(
      await field.evaluate((element) =>
        (element as HTMLElement & { editor: Editor }).editor.getJSON(),
      ),
    ).toEqual(committed)
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
    ).toEqual([])
    await page.addStyleTag({ content: 'html {font-size:200%;}' })
    expect(
      await toolbar.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true)
    expect(
      await page
        .locator('.modal-body')
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true)
    await toolbar.screenshot({ path: testInfo.outputPath('toolbar.png') })
  })
}

test('toolbar keyboard navigation has one Tab stop, skips disabled controls and applies with Enter (test IPC)', async ({
  page,
}) => {
  const { field, toolbar } = await openEditor(page)
  await field.fill('Keyboard formatting')
  await field.press('Control+a')
  await toolbar.getByRole('button', { name: 'Bold', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(
    toolbar.getByRole('button', { name: 'Italic', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(field).toBeFocused()
  await expect(field.locator('em')).toHaveText('Keyboard formatting')
  await field.press('Shift+Tab')
  await expect(
    toolbar.getByRole('button', { name: 'Italic', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('Home')
  await expect(
    toolbar.getByRole('button', { name: 'Bold', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('End')
  await expect(
    toolbar.getByRole('button', { name: 'Undo', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(
    toolbar.getByRole('button', { name: 'Bold', exact: true }),
  ).toBeFocused()
  expect(
    await toolbar
      .getByRole('button')
      .evaluateAll(
        (buttons) => buttons.filter((button) => button.tabIndex === 0).length,
      ),
  ).toBe(1)
  await page.emulateMedia({ forcedColors: 'active' })
  await toolbar.getByRole('button', { name: 'Italic', exact: true }).click()
  // Toggle twice to leave a pressed control for the forced-colors indication.
  await toolbar.getByRole('button', { name: 'Italic', exact: true }).click()
  const pressed = toolbar.getByRole('button', { name: 'Italic', exact: true })
  await expect(pressed).toHaveAttribute('aria-pressed', 'true')
  expect(
    await pressed.evaluate(
      (element) => getComputedStyle(element).borderTopStyle,
    ),
  ).toBe('double')
})
