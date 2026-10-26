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
  await page.getByText('Editor settings', { exact: true }).click()
  return {
    field,
    size: page.getByRole('combobox', { name: 'Manuscript text size' }),
  }
}
async function save(page: Page) {
  await page
    .getByRole('button', { name: 'Save editor settings', exact: true })
    .click()
  await expect(
    page.getByRole('status', { name: 'Editor settings status' }),
  ).toHaveText('Editor settings saved.')
}

for (const width of [320, 640, 1100]) {
  test(`committed size survives editor reopening and focus mode at ${width}px (test IPC)`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 850 })
    const { field, size } = await open(page)
    await expect(size).toHaveValue('18')
    const before = await field.evaluate((element) =>
      (element as HTMLElement & { editor: Editor }).editor.getJSON(),
    )
    await size.selectOption('12')
    await expect(field).toHaveCSS('font-size', '18px')
    await save(page)
    await expect(field).toHaveCSS('font-size', '12px')
    await size.selectOption('32')
    await save(page)
    await expect(field).toHaveCSS('font-size', '32px')
    expect(
      await field.evaluate((element) =>
        (element as HTMLElement & { editor: Editor }).editor.getJSON(),
      ),
    ).toEqual(before)
    expect(
      await page.evaluate(() =>
        (
          window as unknown as { testSaveAttempts: () => number }
        ).testSaveAttempts(),
      ),
    ).toBe(0)
    await expect(
      page.getByRole('status', { name: 'Save status', exact: true }),
    ).toHaveText('No unsaved changes.')
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
    ).toEqual([])
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Close', exact: true })
      .click()
    await page
      .getByRole('button', { name: 'Edit chapter text', exact: true })
      .last()
      .click()
    await expect(field).toHaveCSS('font-size', '32px')
    await page
      .getByRole('button', { name: 'Previous chapter', exact: true })
      .click()
    await expect(field.locator('h6')).toHaveCount(1)
    await expect(field).toHaveCSS('font-size', '32px')
    await page
      .getByRole('button', { name: 'Enter focus mode', exact: true })
      .click()
    await expect(field).toHaveCSS('font-size', '32px')
    await expect(
      page.getByText('Editor settings', { exact: true }),
    ).toBeHidden()
    await field.press('Escape')
    await page.getByText('Editor settings', { exact: true }).click()
    await page.addStyleTag({ content: 'html{font-size:200%;}' })
    await expect(field).toHaveCSS('font-size', '64px')
    expect(
      await page
        .locator('.modal-body')
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true)
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' })
    await field.scrollIntoViewIfNeeded()
    await page.screenshot({ path: testInfo.outputPath('editor-size.png') })
  })
}

test('preference read failure keeps the display and allows explicit reload (test IPC)', async ({
  page,
}) => {
  const { field, size } = await open(page, 'preferences-read-failure')
  await expect(page.getByRole('alert')).toContainText(
    'Could not load saved editor settings',
  )
  await expect(size).toHaveCount(0)
  await expect(field).toHaveCSS('font-size', '18px')
  await page
    .getByRole('button', { name: 'Load saved settings', exact: true })
    .click()
  await expect(size).toHaveValue('18')
})

test('failed preference write keeps prior font and draft until retry commits (test IPC)', async ({
  page,
}) => {
  const { field, size } = await open(page, 'preferences-save-failure')
  await size.selectOption('24')
  await page
    .getByRole('button', { name: 'Save editor settings', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText(
    'Could not save editor settings',
  )
  await expect(field).toHaveCSS('font-size', '18px')
  await expect(size).toHaveValue('24')
  await save(page)
  await expect(field).toHaveCSS('font-size', '24px')
})

test('stale preferences require explicit reload instead of overwriting another revision (test IPC)', async ({
  page,
}) => {
  const { field, size } = await open(page, 'preferences-conflict')
  await size.selectOption('24')
  await page
    .getByRole('button', { name: 'Save editor settings', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText('changed elsewhere')
  await expect(size).toBeDisabled()
  await expect(field).toHaveCSS('font-size', '18px')
  await page
    .getByRole('button', { name: 'Load saved settings', exact: true })
    .click()
  await expect(size).toHaveValue('22')
  await expect(field).toHaveCSS('font-size', '22px')
  await size.selectOption('24')
  await save(page)
  await expect(field).toHaveCSS('font-size', '24px')
})

test('pending preference commit blocks navigation and native/window dismissal without changing writing (test IPC)', async ({
  page,
}) => {
  const { field, size } = await open(page, 'preferences-pending')
  await size.selectOption('24')
  await page
    .getByRole('button', { name: 'Save editor settings', exact: true })
    .click()
  await expect(
    page.getByRole('status', { name: 'Editor settings status' }),
  ).toContainText('Saving editor settings')
  await expect(
    page.getByRole('combobox', { name: 'Choose chapter' }),
  ).toBeDisabled()
  await expect(
    page.getByRole('button', { name: 'Enter focus mode', exact: true }),
  ).toBeDisabled()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Close', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.evaluate(() =>
    (
      window as unknown as { requestTestClose: () => Promise<void> }
    ).requestTestClose(),
  )
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { testWindowDestroyed: () => boolean }
      ).testWindowDestroyed(),
    ),
  ).toBe(false)
  await expect(field).toHaveCSS('font-size', '18px')
  await page.evaluate(() =>
    (
      window as unknown as { completePreferenceSave: () => void }
    ).completePreferenceSave(),
  )
  await expect(field).toHaveCSS('font-size', '24px')
  await expect(
    page.getByRole('combobox', { name: 'Choose chapter' }),
  ).toBeEnabled()
  await expect(page.getByRole('alert')).toHaveCount(0)
})
