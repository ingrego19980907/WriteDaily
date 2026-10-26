import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import type { Editor } from '@tiptap/core'

const first = '00000000-0000-4000-8000-000000000001'
const second = '00000000-0000-4000-8000-000000000002'
async function open(page: Page, scenario = '') {
  await page.goto(`/tests/fixtures/chapters.html?scenario=${scenario}`)
  await page.getByRole('button', { name: 'Open book', exact: true }).click()
  await page
    .getByRole('button', { name: 'Edit chapter text', exact: true })
    .first()
    .click()
  const field = page.getByRole('textbox', { name: 'Chapter manuscript' })
  await expect(field).toHaveAttribute('contenteditable', 'true')
  return {
    field,
    choose: page.getByRole('combobox', { name: 'Choose chapter' }),
  }
}

for (const width of [320, 640, 1100]) {
  test(`navigation saves both duplicate-title chapters and restores formatting at ${width}px (test IPC)`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 850 })
    const { field, choose } = await open(page)
    await expect(
      page.getByRole('button', { name: 'Previous chapter' }),
    ).toBeDisabled()
    await expect(choose).toHaveValue(first)
    await field.fill('First chapter Україна é')
    await field.press('Control+a')
    await field.press('Control+b')
    await page.getByRole('button', { name: 'Next chapter' }).click()
    await expect(choose).toHaveValue(second)
    await expect(field).toHaveAttribute('contenteditable', 'true')
    await expect(field).toHaveText('')
    await expect(
      page.getByRole('button', { name: 'Next chapter' }),
    ).toBeDisabled()
    await field.fill('Second chapter writing')
    await page.getByRole('button', { name: 'Previous chapter' }).click()
    await expect(choose).toHaveValue(first)
    await expect(field.locator('strong')).toHaveText('First chapter Україна é')
    await expect(
      page.getByRole('dialog').getByRole('heading', { level: 3 }),
    ).toBeFocused()
    await choose.selectOption(second)
    await expect(field).toHaveText('Second chapter writing')
    expect(
      await page.evaluate(() =>
        (
          window as unknown as { testSaveAttempts: () => number }
        ).testSaveAttempts(),
      ),
    ).toBe(2)
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
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true)
    expect(
      await choose.evaluate(
        (element) =>
          element.getBoundingClientRect().width <=
          element.parentElement!.clientWidth,
      ),
    ).toBe(true)
    await choose.screenshot({
      path: testInfo.outputPath('chapter-selector.png'),
    })
  })
}

test('navigation waits for a pending commit before reading or enabling the target (test IPC)', async ({
  page,
}) => {
  const { field, choose } = await open(page, 'editor-pending')
  await field.fill('Await this commit')
  await page.getByRole('button', { name: 'Next chapter' }).click()
  await expect(choose).toBeDisabled()
  await expect(field).toHaveAttribute('contenteditable', 'false')
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { testChapterReads: () => string[] }
      ).testChapterReads(),
    ),
  ).toEqual([first])
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.evaluate(() =>
    (window as unknown as { completeTestSave: () => void }).completeTestSave(),
  )
  await expect(choose).toHaveValue(second)
  await page.getByRole('button', { name: 'Previous chapter' }).click()
  await expect(field).toHaveText('Await this commit')
})

test('failed navigation save retains writing and retries without an empty target (test IPC)', async ({
  page,
}) => {
  const { field, choose } = await open(page, 'editor-failure')
  await field.fill('Retry this writing')
  await page.getByRole('button', { name: 'Next chapter' }).click()
  await expect(page.getByRole('alert')).toContainText('Could not save')
  await expect(choose).toHaveValue(first)
  await expect(field).toHaveText('Retry this writing')
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { testChapterReads: () => string[] }
      ).testChapterReads(),
    ),
  ).toEqual([first])
  await page.getByRole('button', { name: 'Next chapter' }).click()
  await expect(choose).toHaveValue(second)
  await page.getByRole('button', { name: 'Previous chapter' }).click()
  await expect(field).toHaveText('Retry this writing')
})

test('conflict cancels navigation and retains the original editor document (test IPC)', async ({
  page,
}) => {
  const { field, choose } = await open(page, 'editor-conflict')
  await field.fill('Do not overwrite my draft')
  await choose.selectOption(second)
  await expect(page.getByRole('alert')).toContainText('changed elsewhere')
  await expect(choose).toHaveValue(first)
  await expect(field).toHaveText('Do not overwrite my draft')
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { testChapterReads: () => string[] }
      ).testChapterReads(),
    ),
  ).toEqual([first])
})

test('target read failure keeps current content and retry does not resave committed writing (test IPC)', async ({
  page,
}) => {
  const { field, choose } = await open(page, 'navigation-failure')
  await field.fill('Committed before target failure')
  await page.getByRole('button', { name: 'Next chapter' }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Could not open the selected chapter',
  )
  await expect(field).toHaveText('Committed before target failure')
  await expect(field).toHaveAttribute('contenteditable', 'true')
  await page.getByRole('button', { name: 'Retry opening chapter' }).click()
  await expect(choose).toHaveValue(second)
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { testSaveAttempts: () => number }
      ).testSaveAttempts(),
    ),
  ).toBe(1)
})

test('rapid next clicks are serialized and a slow read cannot mix documents (test IPC)', async ({
  page,
}) => {
  const { field, choose } = await open(page, 'navigation-slow')
  const original = await field.evaluate((element) =>
    (element as HTMLElement & { editor: Editor }).editor.getJSON(),
  )
  await page.getByRole('button', { name: 'Next chapter' }).dblclick()
  await expect(choose).toBeDisabled()
  await expect(field).toHaveAttribute('contenteditable', 'false')
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { testChapterReads: () => string[] }
      ).testChapterReads(),
    ),
  ).toEqual([first, second])
  expect(
    await field.evaluate((element) =>
      (element as HTMLElement & { editor: Editor }).editor.getJSON(),
    ),
  ).toEqual(original)
  await page.evaluate(() =>
    (window as unknown as { completeTestRead: () => void }).completeTestRead(),
  )
  await expect(choose).toHaveValue(second)
  await expect(field).toHaveText('')
})

test('unsupported target content does not replace the current chapter (test IPC)', async ({
  page,
}) => {
  const { field, choose } = await open(page, 'navigation-invalid')
  const original = await field.evaluate((element) =>
    (element as HTMLElement & { editor: Editor }).editor.getJSON(),
  )
  await choose.selectOption(second)
  await expect(page.getByRole('alert')).toContainText('cannot be safely opened')
  await expect(choose).toHaveValue(first)
  expect(
    await field.evaluate((element) =>
      (element as HTMLElement & { editor: Editor }).editor.getJSON(),
    ),
  ).toEqual(original)
})
