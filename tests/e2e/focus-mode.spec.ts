import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import type { Editor } from '@tiptap/core'

async function open(page: Page, scenario = '') {
  await page.goto(`/tests/fixtures/chapters.html?scenario=${scenario}`)
  await page.getByRole('button', { name: 'Open book', exact: true }).click()
  await page
    .getByRole('button', { name: 'Edit chapter text', exact: true })
    .last()
    .click()
  const field = page.getByRole('textbox', { name: 'Chapter manuscript' })
  await expect(field).toHaveAttribute('contenteditable', 'false')
  await page.clock.install({ time: new Date('2026-10-26T10:00:00Z') })
  await page.clock.pauseAt(new Date('2026-10-26T10:01:00Z'))
  return field
}

for (const width of [320, 640, 1100]) {
  test(`focus mode preserves editing and keyboard exit at ${width}px (test IPC)`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: width === 640 ? 480 : 850 })
    const field = await open(page)
    const enter = page.getByRole('button', {
      name: 'Start writing',
      exact: true,
    })
    await enter.focus()
    await page.keyboard.press('Enter')
    const exit = page.getByRole('button', {
      name: 'Exit focus mode',
      exact: true,
    })
    await expect(exit).toBeFocused()
    await expect(exit).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('dialog')).toHaveClass(
      /modal-content--fullscreen/,
    )
    await expect(
      page.getByRole('combobox', { name: 'Manuscript text size' }),
    ).toBeVisible()
    await expect(page.getByRole('toolbar').getByRole('button')).toHaveCount(15)
    await expect(
      page.getByRole('group', { name: 'Word count', exact: true }),
    ).toHaveCount(0)
    await page.keyboard.press('Tab')
    await expect(
      page
        .getByRole('dialog')
        .getByRole('button', { name: 'Close', exact: true }),
    ).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(field).toBeFocused()
    await page
      .getByRole('button', { name: 'Decrease text size', exact: true })
      .focus()
    await expect(
      page.getByRole('button', { name: 'Decrease text size', exact: true }),
    ).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(
      page.getByRole('combobox', { name: 'Manuscript text size' }),
    ).toBeFocused()
    await field.focus()
    await field.fill('focused writing')
    await field.press('Control+a')
    await field.press('Control+b')
    await expect(field.locator('strong')).toHaveText('focused writing')
    await page.getByRole('button', { name: 'Underline', exact: true }).click()
    await expect(field.locator('u')).toHaveText('focused writing')
    const undo = page.getByRole('button', { name: 'Undo', exact: true })
    const redo = page.getByRole('button', { name: 'Redo', exact: true })
    await expect(undo.locator('svg')).toHaveAttribute('aria-hidden', 'true')
    await undo.click()
    await expect(field.locator('u')).toHaveCount(0)
    await expect(redo).toBeEnabled()
    await redo.click()
    await expect(field.locator('strong')).toHaveText('focused writing')
    await expect(field.locator('u')).toHaveText('focused writing')
    await page.clock.runFor(2000)
    await expect(page.getByRole('status', { name: 'Save status' })).toHaveText(
      'Chapter text saved.',
    )
    for (const level of [1, 2, 3, 4]) {
      await page.getByRole('button', { name: `H${level}`, exact: true }).click()
      await expect(field.locator(`h${level}`)).toHaveText('focused writing')
    }
    await page.clock.runFor(2000)
    for (const [name, alignment] of [
      ['Align center', 'center'],
      ['Align right', 'right'],
      ['Justify', 'justify'],
      ['Align left', 'left'],
    ]) {
      const button = page.getByRole('button', { name, exact: true })
      await button.click()
      await expect(button).toHaveAttribute('aria-pressed', 'true')
      await expect(field.locator('h4')).toHaveCSS('text-align', alignment)
    }
    await page.clock.runFor(2000)
    const written = await field.evaluate((element) =>
      (element as HTMLElement & { editor: Editor }).editor.getJSON(),
    )
    await page.clock.resume()
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
    ).toEqual([])
    await page.addStyleTag({ content: 'html{font-size:200%;}' })
    expect(
      await page
        .locator('.modal-body')
        .evaluate(
          (element) =>
            element.scrollWidth <= element.clientWidth &&
            element.clientHeight > 80,
        ),
    ).toBe(true)
    expect(
      await page
        .getByRole('dialog')
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true)
    await expect(exit).toBeVisible()
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' })
    await page.screenshot({ path: testInfo.outputPath('focus-mode.png') })
    await field.press('Escape')
    await expect(enter).toBeFocused()
    await expect(page.getByRole('dialog')).not.toHaveClass(
      /modal-content--fullscreen/,
    )
    await expect(page.getByRole('toolbar')).toBeVisible()
    expect(
      await field.evaluate((element) =>
        (element as HTMLElement & { editor: Editor }).editor.getJSON(),
      ),
    ).toEqual(written)
    await expect(
      page.getByRole('group', { name: 'Word count', exact: true }),
    ).toContainText('2 saved words')
  })
}

test('focus mode can exit during a pending write without releasing pending-close protection (test IPC)', async ({
  page,
}) => {
  const field = await open(page, 'editor-pending')
  await page.getByRole('button', { name: 'Start writing', exact: true }).click()
  await field.fill('pending focus writing')
  await page.clock.runFor(2000)
  await expect(field).toHaveAttribute('contenteditable', 'false')
  await page
    .getByRole('button', { name: 'Exit focus mode', exact: true })
    .click()
  await expect(
    page.getByRole('combobox', { name: 'Choose chapter', exact: true }),
  ).toBeDisabled()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Close', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText('A save is in progress')
  await page.evaluate(() =>
    (window as unknown as { completeTestSave: () => void }).completeTestSave(),
  )
  await expect(field).toHaveAttribute('contenteditable', 'false')
  await page.getByRole('button', { name: 'Start writing', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Save status' })).toHaveText(
    'Chapter text saved.',
  )
})

test('focus mode exposes failed saves and allows explicit retry (test IPC)', async ({
  page,
}) => {
  const field = await open(page, 'editor-failure')
  await page.getByRole('button', { name: 'Start writing', exact: true }).click()
  await field.fill('retain focus draft')
  await page.clock.runFor(2000)
  await expect(page.getByRole('alert')).toContainText('Could not save')
  await expect(page.getByRole('status', { name: 'Save status' })).toContainText(
    'paused',
  )
  await page
    .getByRole('button', { name: 'Save chapter text', exact: true })
    .click()
  await expect(page.getByRole('status', { name: 'Save status' })).toHaveText(
    'Chapter text saved.',
  )
  await expect(
    page.getByRole('button', { name: 'Exit focus mode', exact: true }),
  ).toBeVisible()
})

test('focus Escape only exits the mode, and explicit close still requires acknowledged dirty discard (test IPC)', async ({
  page,
}) => {
  const field = await open(page)
  await page.getByRole('button', { name: 'Start writing', exact: true }).click()
  await field.fill('unsaved focus draft')
  await field.press('Escape')
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.getByRole('button', { name: 'Start writing', exact: true }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Close', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText(
    'There is unsaved writing',
  )
  await expect(
    page.getByRole('button', {
      name: 'Discard changes and close',
      exact: true,
    }),
  ).toBeDisabled()
  await page.getByRole('checkbox').check()
  await page
    .getByRole('button', { name: 'Discard changes and close', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Edit chapter text', exact: true })
    .last()
    .click()
  await expect(
    page.getByRole('button', { name: 'Start writing', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('dialog')).not.toHaveClass(
    /modal-content--fullscreen/,
  )
})

for (const width of [320, 1100]) {
  test(`focus formatting stays pinned while scrolling and adding paragraphs at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 850 })
    const field = await open(page)
    await page
      .getByRole('button', { name: 'Start writing', exact: true })
      .click()
    await field.evaluate((element) => {
      const editor = (element as HTMLElement & { editor: Editor }).editor
      editor.commands.setContent({
        type: 'doc',
        content: Array.from({ length: 100 }, (_, index) => ({
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: `Paragraph ${index + 1} of a long manuscript.`,
            },
          ],
        })),
      })
      editor.commands.focus('end')
    })
    await page.clock.runFor(20)
    const body = page.locator('.modal-content--fullscreen .modal-body')
    const panel = page.locator('.editor-style-panel')
    const assertPinned = async () => {
      const header = page.locator('.modal-header')
      const headerBox = await header.boundingBox()
      const panelBox = await panel.boundingBox()
      expect(
        Math.abs(panelBox!.x + panelBox!.width / 2 - width / 2),
      ).toBeLessThan(2)
      expect(panelBox!.y).toBeGreaterThanOrEqual(headerBox!.y)
      expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(
        headerBox!.y + headerBox!.height,
      )
      await expect(header.getByRole('toolbar')).toBeVisible()
      await expect(header.getByRole('heading')).not.toHaveText('Chapter text')
      const footer = page.locator('.chapter-editor-footer')
      const saveBox = await footer
        .getByRole('button', { name: 'Save chapter text', exact: true })
        .boundingBox()
      const statusBox = await footer
        .getByRole('status', { name: 'Save status', exact: true })
        .boundingBox()
      expect(saveBox!.x).toBeLessThan(40)
      expect(statusBox!.x + statusBox!.width).toBeGreaterThan(width - 40)
      await expect(
        page.getByRole('button', { name: 'Bold', exact: true }),
      ).toBeInViewport()
      await expect(
        page.getByRole('combobox', { name: 'Manuscript text size' }),
      ).toBeInViewport()
    }
    await body.evaluate((element) => {
      element.scrollTop = element.scrollHeight / 2
    })
    await assertPinned()
    await field.press('Control+End')
    await field.press('Enter')
    await page.keyboard.insertText('New paragraph at the end')
    await page.clock.runFor(20)
    await expect(field.locator('p').last()).toHaveText(
      'New paragraph at the end',
    )
    await assertPinned()
    expect(await body.evaluate((element) => element.scrollTop)).toBeGreaterThan(
      1000,
    )
  })
}

test('focused alignment autosaves and reopens in regular and focused editing', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 850 })
  const field = await open(page)
  await page.getByRole('button', { name: 'Start writing', exact: true }).click()
  await field.fill('Aligned manuscript')
  await field.press('Control+a')
  await page.getByRole('button', { name: 'Align center', exact: true }).click()
  await expect(field.locator('p')).toHaveCSS('text-align', 'center')
  await page.clock.runFor(2000)
  await expect(
    page.getByRole('status', { name: 'Save status', exact: true }),
  ).toHaveText('Chapter text saved.')
  await page
    .getByRole('button', { name: 'Exit focus mode', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Close', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Edit chapter text', exact: true })
    .last()
    .click()
  await expect(field.locator('p')).toHaveCSS('text-align', 'center')
  await expect(field).toHaveText('Aligned manuscript')
  await page.getByRole('button', { name: 'Start writing', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Align center', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
})
