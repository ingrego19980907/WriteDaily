import { startWriting } from './editor-mode'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function open(page: Page, scenario = '') {
  await page.goto(`/tests/fixtures/chapters.html?scenario=${scenario}`)
  await page.getByRole('button', { name: 'Open book', exact: true }).click()
  await page
    .getByRole('button', { name: 'Edit chapter text', exact: true })
    .last()
    .click()
  await startWriting(page)
  const field = page.getByRole('textbox', { name: 'Chapter manuscript' })
  await expect(field).toHaveAttribute('contenteditable', 'true')
  await page.clock.install({ time: new Date('2026-10-26T10:00:00Z') })
  await page.clock.pauseAt(new Date('2026-10-26T10:01:00Z'))
  return {
    field,
    status: page.getByRole('status', { name: 'Save status', exact: true }),
  }
}

for (const width of [320, 640, 1100]) {
  test(`save status follows autosave, edits and reopening at ${width}px (test IPC)`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 850 })
    const { field, status } = await open(page)
    await expect(status).toHaveText('No unsaved changes.')
    await expect(status).toHaveAttribute('aria-live', 'polite')
    await expect(status).toHaveAttribute('aria-atomic', 'true')
    await field.fill('automatic draft')
    await expect(status).toHaveText('Unsaved changes: waiting to save.')
    await page.clock.runFor(1999)
    await expect(status).not.toContainText('Chapter text saved.')
    await page.clock.runFor(1)
    await expect(status).toHaveText('Chapter text saved.')
    await field.fill('new draft')
    await expect(status).toHaveText('Unsaved changes: waiting to save.')
    await page
      .getByRole('button', { name: 'Save chapter text', exact: true })
      .click()
    await expect(status).toHaveText('Chapter text saved.')
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Close', exact: true })
      .click()
    await page
      .getByRole('button', { name: 'Edit chapter text', exact: true })
      .last()
      .click()
    await startWriting(page)
    await expect(status).toHaveText('No unsaved changes.')
    await expect(field).toHaveText('new draft')
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
      await status.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true)
    expect(
      await page
        .locator('.modal-body')
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true)
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' })
    await expect(status).toHaveText('No unsaved changes.')
    await status.screenshot({ path: testInfo.outputPath('save-status.png') })
  })
}

test('pending status cannot become saved before commit and clears stale close feedback (test IPC)', async ({
  page,
}) => {
  const { field, status } = await open(page, 'editor-pending')
  await field.fill('pending write')
  await page.clock.runFor(2000)
  await expect(status).toHaveText('Saving chapter text…')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Close', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText('A save is in progress')
  await page.clock.runFor(10000)
  await expect(status).not.toContainText('Chapter text saved.')
  await page.evaluate(() =>
    (window as unknown as { completeTestSave: () => void }).completeTestSave(),
  )
  await expect(status).toHaveText('Chapter text saved.')
  await expect(page.getByRole('alert')).toHaveCount(0)
})

for (const scenario of ['editor-failure', 'editor-conflict']) {
  test(`${scenario} retains error status through edits and close attempts (test IPC)`, async ({
    page,
  }) => {
    const { field, status } = await open(page, scenario)
    await field.fill('keep writing')
    await page.clock.runFor(2000)
    const expected =
      scenario === 'editor-failure'
        ? 'Not saved: automatic saving is paused.'
        : 'Not saved: saving is blocked.'
    await expect(status).toHaveText(expected)
    const error = await page.getByRole('alert').innerText()
    await field.fill('keep these new edits')
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Close', exact: true })
      .click()
    await expect(page.getByRole('alert')).toContainText(error)
    await expect(page.getByRole('alert')).toContainText(
      'There is unsaved writing',
    )
    await page.clock.runFor(10000)
    await expect(status).toHaveText(expected)
    if (scenario === 'editor-failure') {
      await page
        .getByRole('button', { name: 'Save chapter text', exact: true })
        .click()
      await expect(status).toHaveText('Chapter text saved.')
      await expect(page.getByRole('alert')).toHaveCount(0)
    } else
      await expect(
        page.getByRole('button', { name: 'Save chapter text', exact: true }),
      ).toBeDisabled()
  })
}
