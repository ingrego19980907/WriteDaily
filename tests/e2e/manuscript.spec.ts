import { startWriting } from './editor-mode'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import type { Editor } from '@tiptap/core'

async function openEditor(page: Page, scenario = '') {
  await page.goto(`/tests/fixtures/chapters.html?scenario=${scenario}`)
  await page.getByRole('button', { name: 'Open book', exact: true }).click()
  await page
    .getByRole('button', { name: 'Edit chapter text', exact: true })
    .first()
    .click()
  if (scenario !== 'editor-invalid') await startWriting(page)
  return page.getByRole('textbox', { name: 'Chapter manuscript' })
}

for (const width of [320, 640, 1100]) {
  test(`Tiptap edits and roundtrips saved JSON at ${width}px (test IPC)`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 850 })
    const field = await openEditor(page)
    await expect(field).toHaveAttribute('contenteditable', 'true')
    const bounds = await page.getByRole('dialog').boundingBox()
    expect(bounds!.x).toBeCloseTo(0, 0)
    expect(bounds!.y).toBeCloseTo(0, 0)
    expect(bounds!.width).toBeCloseTo(width, 0)
    expect(bounds!.height).toBeCloseTo(850, 0)
    const baseline = await field.evaluate((element) =>
      (element as HTMLElement & { editor: Editor }).editor.getJSON(),
    )
    await expect(field.locator('h6')).toHaveCount(1)
    await expect(field.locator('ol')).toHaveAttribute(
      'start',
      '9007199254740991',
    )
    await field.click()
    await field.evaluate((element) => {
      const editor = (element as HTMLElement & { editor: Editor }).editor
      editor.commands.setTextSelection(editor.state.doc.content.size - 1)
    })
    await page.keyboard.insertText(' Український текст é <tag>')
    await page.keyboard.press('Control+b')
    await page.keyboard.insertText(' bold')
    await page.keyboard.press('Control+b')
    await expect(field.locator('strong').last()).toContainText('bold')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeVisible()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Close', exact: true })
      .click()
    await expect(page.getByRole('alert')).toContainText(
      'There is unsaved writing',
    )
    await startWriting(page)
    await page
      .getByRole('button', { name: 'Save chapter text', exact: true })
      .click()
    await expect(
      page.getByRole('status').filter({ hasText: 'Chapter text saved.' }),
    ).toBeVisible()
    const committed = await field.evaluate((element) =>
      (element as HTMLElement & { editor: Editor }).editor.getJSON(),
    )
    expect(committed.content?.slice(0, 3)).toEqual(
      baseline.content?.slice(0, 3),
    )
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Close', exact: true })
      .click()
    await page
      .getByRole('button', { name: 'Edit chapter text', exact: true })
      .first()
      .click()
    await startWriting(page)
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
      await page
        .locator('.modal-body')
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true)
    expect(
      await field.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true)
    expect(
      await page
        .locator('.modal-body')
        .evaluate((element) => element.clientHeight > 80),
    ).toBe(true)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await page.screenshot({
      path: testInfo.outputPath('manuscript.png'),
      fullPage: true,
    })
  })
}

test('failed save retains text and allows manual retry (test IPC)', async ({
  page,
}) => {
  const field = await openEditor(page, 'editor-failure')
  await field.fill('Keep this text')
  await page
    .getByRole('button', { name: 'Save chapter text', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText('Could not save')
  await expect(field).toHaveText('Keep this text')
  await page
    .getByRole('button', { name: 'Save chapter text', exact: true })
    .click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Chapter text saved.' }),
  ).toBeVisible()
})

test('conflict preserves writing and discard requires explicit acknowledgement (test IPC)', async ({
  page,
}) => {
  const field = await openEditor(page, 'editor-conflict')
  await field.fill('My conflict draft')
  await page
    .getByRole('button', { name: 'Save chapter text', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText('changed elsewhere')
  await expect(field).toHaveText('My conflict draft')
  await expect(
    page.getByRole('button', { name: 'Save chapter text', exact: true }),
  ).toBeDisabled()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Close', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Discard changes and close' }),
  ).toBeDisabled()
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Discard changes and close' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('unsupported stored content is refused before Tiptap opens (test IPC)', async ({
  page,
}) => {
  await openEditor(page, 'editor-invalid')
  await expect(page.getByRole('alert')).toContainText('cannot be safely opened')
  await expect(
    page.getByRole('textbox', { name: 'Chapter manuscript' }),
  ).toHaveCount(0)
})

test('pending save blocks editing and repeated save or close (test IPC)', async ({
  page,
}) => {
  const field = await openEditor(page, 'editor-pending')
  await field.fill('Pending text')
  await page
    .getByRole('button', { name: 'Save chapter text', exact: true })
    .click()
  await expect(field).toHaveAttribute('contenteditable', 'false')
  for (const button of await page
    .getByRole('toolbar', { name: 'Text formatting' })
    .getByRole('button')
    .all())
    await expect(button).toBeDisabled()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Close', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText('save is in progress')
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { testSaveAttempts: () => number }
      ).testSaveAttempts(),
    ),
  ).toBe(1)
  await page.evaluate(() =>
    (window as unknown as { completeTestSave: () => void }).completeTestSave(),
  )
  await expect(
    page.getByRole('status').filter({ hasText: 'Chapter text saved.' }),
  ).toBeVisible()
})

test('native close request is blocked for dirty text and released after save (test IPC)', async ({
  page,
}) => {
  const field = await openEditor(page)
  await field.fill('Retain on window close')
  await page.evaluate(() =>
    (
      window as unknown as { requestTestClose: () => Promise<void> }
    ).requestTestClose(),
  )
  await expect(page.getByRole('alert')).toContainText(
    'There is unsaved writing',
  )
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { testWindowDestroyed: () => boolean }
      ).testWindowDestroyed(),
    ),
  ).toBe(false)
  await page
    .getByRole('button', { name: 'Save chapter text', exact: true })
    .click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Chapter text saved.' }),
  ).toBeVisible()
  await page.evaluate(() =>
    (
      window as unknown as { requestTestClose: () => Promise<void> }
    ).requestTestClose(),
  )
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as unknown as { testWindowDestroyed: () => boolean }
        ).testWindowDestroyed(),
      ),
    )
    .toBe(true)
})

test('paste preserves literal plain text and refuses files without changing existing writing (test IPC)', async ({
  page,
}) => {
  const field = await openEditor(page)
  await field.fill('Before ')
  await field.press('Control+End')
  await field.evaluate((element) => {
    const data = new DataTransfer()
    data.setData('text/plain', '  <strong>literal</strong> é\n\ttext  ')
    data.setData('text/html', '<strong>interpreted HTML</strong>')
    element.dispatchEvent(
      new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: data,
      }),
    )
  })
  const text = await field.evaluate(
    (element) =>
      (element as HTMLElement & { editor: Editor }).editor.state.doc
        .textContent,
  )
  expect(text).toBe('Before   <strong>literal</strong> é\n\ttext  ')
  await expect(field.locator('strong')).toHaveCount(0)
  await field.evaluate((element) => {
    const data = new DataTransfer()
    data.items.add(
      new File(['not an image'], 'file.png', { type: 'image/png' }),
    )
    element.dispatchEvent(
      new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: data,
      }),
    )
  })
  await expect(page.getByRole('alert')).toContainText(
    'Only plain text can be pasted',
  )
  expect(
    await field.evaluate(
      (element) =>
        (element as HTMLElement & { editor: Editor }).editor.state.doc
          .textContent,
    ),
  ).toBe(text)
})
