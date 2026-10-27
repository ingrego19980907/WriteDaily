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
  return {
    field,
    counts: page.locator('.manuscript-counts'),
  }
}

for (const width of [320, 640, 1100]) {
  test(`live and committed word counts remain distinct at ${width}px (test IPC)`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 850 })
    const { field, counts } = await open(page)
    expect(
      await counts.locator('[aria-hidden="true"]').allTextContents(),
    ).toEqual(['0', '/', '\u2014'])

    await expect(counts).toContainText('0 words in current text')
    await expect(counts).toContainText('Saved word count unavailable')
    await field.fill("п'ять foo-bar 12,500.75 😀 é")
    await expect(counts).toContainText('4 words in current text')
    await field.press('Control+a')
    await field.press('Control+b')
    await expect(counts).toContainText('4 words in current text')
    await field.fill('one')
    await expect(counts).toContainText('1 word in current text')
    await field.fill('')
    await expect(counts).toContainText('0 words in current text')
    await field.fill("п'ять foo-bar 12,500.75 😀 é")
    await page
      .getByRole('button', { name: 'Save chapter text', exact: true })
      .click()
    await expect(counts).toContainText('4 saved words')
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Close', exact: true })
      .click()
    await page
      .getByRole('button', { name: 'Edit chapter text', exact: true })
      .last()
      .click()
    await startWriting(page)
    await expect(counts).toContainText('4 saved words')
    await expect(counts).toContainText('4 words in current text')
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
    await page
      .locator('.manuscript-footer')
      .screenshot({ path: testInfo.outputPath('word-count.png') })
  })
}

test('pending commit cannot advance the saved counter (test IPC)', async ({
  page,
}) => {
  const { field, counts } = await open(page, 'editor-pending')
  await field.fill('one two')
  await page
    .getByRole('button', { name: 'Save chapter text', exact: true })
    .click()
  await expect(field).toHaveAttribute('contenteditable', 'false')
  await expect(counts).toContainText('2 words in current text')
  await expect(counts).toContainText('Saved word count unavailable')
  await page.evaluate(() =>
    (window as unknown as { completeTestSave: () => void }).completeTestSave(),
  )
  await expect(counts).toContainText('2 saved words')
})

test('failed save retains the live count and the last committed count (test IPC)', async ({
  page,
}) => {
  const { field, counts } = await open(page, 'editor-failure')
  await field.fill('one two')
  await page
    .getByRole('button', { name: 'Save chapter text', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText('Could not save')
  await expect(counts).toContainText('2 words in current text')
  await expect(counts).toContainText('Saved word count unavailable')
  await page
    .getByRole('button', { name: 'Save chapter text', exact: true })
    .click()
  await expect(counts).toContainText('2 saved words')
  await field.fill('one two three')
  await expect(counts).toContainText('3 words in current text')
  await expect(counts).toContainText('2 saved words')
})

test('literal markup, block changes and list markers follow the word policy (test IPC)', async ({
  page,
}) => {
  const { field, counts } = await open(page)
  await field.fill('<tag> one')
  await expect(counts).toContainText('2 words in current text')
  await field.press('Control+End')
  await field.press('Enter')
  await page.keyboard.insertText('two')
  await expect(counts).toContainText('3 words in current text')
  const toolbar = page.getByRole('toolbar', { name: 'Text formatting' })
  await toolbar.getByRole('button', { name: 'H3', exact: true }).click()
  await expect(counts).toContainText('3 words in current text')
  await toolbar.getByRole('button', { name: 'H3', exact: true }).click()
  await toolbar
    .getByRole('button', { name: 'Numbered list', exact: true })
    .click()
  await expect(counts).toContainText('3 words in current text')
})
