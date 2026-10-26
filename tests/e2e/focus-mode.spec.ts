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
  await expect(field).toHaveAttribute('contenteditable', 'true')
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
      name: 'Enter focus mode',
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
    await expect(page.getByRole('combobox')).toHaveCount(0)
    await expect(page.getByRole('toolbar')).toHaveCount(0)
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
    await field.fill('focused writing')
    await field.press('Control+a')
    await field.press('Control+b')
    await expect(field.locator('strong')).toHaveText('focused writing')
    await page.clock.runFor(2000)
    await expect(page.getByRole('status', { name: 'Save status' })).toHaveText(
      'Chapter text saved.',
    )
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
  await page
    .getByRole('button', { name: 'Enter focus mode', exact: true })
    .click()
  await field.fill('pending focus writing')
  await page.clock.runFor(2000)
  await expect(field).toHaveAttribute('contenteditable', 'false')
  await page
    .getByRole('button', { name: 'Exit focus mode', exact: true })
    .click()
  await expect(page.getByRole('combobox')).toBeDisabled()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Close', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText('A save is in progress')
  await page.evaluate(() =>
    (window as unknown as { completeTestSave: () => void }).completeTestSave(),
  )
  await expect(field).toHaveAttribute('contenteditable', 'true')
  await expect(page.getByRole('status', { name: 'Save status' })).toHaveText(
    'Chapter text saved.',
  )
})

test('focus mode exposes failed saves and allows explicit retry (test IPC)', async ({
  page,
}) => {
  const field = await open(page, 'editor-failure')
  await page
    .getByRole('button', { name: 'Enter focus mode', exact: true })
    .click()
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
  await page
    .getByRole('button', { name: 'Enter focus mode', exact: true })
    .click()
  await field.fill('unsaved focus draft')
  await field.press('Escape')
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Enter focus mode', exact: true })
    .click()
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
    page.getByRole('button', { name: 'Enter focus mode', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('dialog')).not.toHaveClass(
    /modal-content--fullscreen/,
  )
})
