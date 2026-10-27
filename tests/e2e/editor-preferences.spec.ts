import { startWriting } from './editor-mode'
// Range font formatting replaces the former global font-preference product controls.
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
  await startWriting(page)
  const field = page.getByRole('textbox', { name: 'Chapter manuscript' })
  await expect(field).toHaveAttribute('contenteditable', 'true')
  await page.clock.install({ time: new Date('2026-10-27T10:00:00Z') })
  await page.clock.pauseAt(new Date('2026-10-27T10:01:00Z'))
  return {
    field,
    size: page.getByRole('combobox', { name: 'Manuscript text size' }),
  }
}
async function select(page: Page, from: number, to: number) {
  await page.getByRole('textbox', { name: 'Chapter manuscript' }).evaluate(
    (element, range) => {
      ;(
        element as HTMLElement & { editor: Editor }
      ).editor.commands.setTextSelection(range)
    },
    { from, to },
  )
}
async function autosave(page: Page) {
  await page.clock.runFor(2000)
  await expect(
    page.getByRole('status', { name: 'Save status', exact: true }),
  ).toHaveText('Chapter text saved.')
}

for (const width of [320, 640, 1100]) {
  test(`font size affects only selection or future typing and roundtrips at ${width}px (test IPC)`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 850 })
    const { field, size } = await open(page)
    const family = page.getByRole('combobox', {
      name: 'Manuscript font family',
    })
    await expect(family.locator('option:not(:disabled)')).toHaveCount(20)
    const bullets = page.getByRole('button', {
      name: 'Bullet list',
      exact: true,
    })
    const numbers = page.getByRole('button', {
      name: 'Numbered list',
      exact: true,
    })
    await expect(bullets.locator('svg')).toHaveAttribute('aria-hidden', 'true')
    await expect(numbers.locator('svg')).toHaveAttribute('aria-hidden', 'true')
    if (width >= 640) {
      const fontBox = await size.boundingBox()
      for (const button of [bullets, numbers]) {
        const box = await button.boundingBox()
        expect(Math.abs(box!.y - fontBox!.y)).toBeLessThan(3)
        expect(box!.x).toBeGreaterThan(fontBox!.x + fontBox!.width)
      }
    }
    await field.fill('Alpha beta gamma')
    await select(page, 1, 6)
    await page
      .getByRole('toolbar')
      .getByRole('button', { name: 'Bold', exact: true })
      .click()
    await page.clock.runFor(20)
    await page.getByRole('button', { name: 'Underline', exact: true }).click()
    await expect(field.locator('u')).toHaveText('Alpha')
    await page.clock.runFor(20)
    await size.selectOption('24')
    await family.selectOption('Arial')
    await expect(field.locator('span[data-font-family="Arial"]')).toHaveText(
      'Alpha',
    )
    await expect(field.locator('span[data-font-size="24"]')).toHaveText('Alpha')
    await expect(field.locator('u')).toHaveText('Alpha')
    await expect(field.locator('span[data-font-size="24"]')).toHaveCSS(
      'font-size',
      '24px',
    )
    expect(
      await field.evaluate((element) => {
        const json = (
          element as HTMLElement & { editor: Editor }
        ).editor.getJSON()
        return json.content?.[0].content?.[1].marks ?? []
      }),
    ).toEqual([])
    await expect(
      page.getByRole('button', { name: 'Save editor settings', exact: true }),
    ).toHaveCount(0)
    await expect(
      page.getByRole('status', { name: 'Editor settings status' }),
    ).toHaveCount(0)
    await autosave(page)
    await select(page, 17, 17)
    await size.selectOption('32')
    await family.selectOption('Consolas')
    await page.clock.runFor(20)
    await page.keyboard.insertText(' delta')
    await expect(field.locator('span[data-font-size="32"]')).toHaveText(
      ' delta',
    )
    await expect(field.locator('span[data-font-size="24"]')).toHaveText('Alpha')
    await expect(field.locator('u')).toHaveText('Alpha')
    await autosave(page)
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Close', exact: true })
      .click()
    await page
      .getByRole('button', { name: 'Edit chapter text', exact: true })
      .last()
      .click()
    await startWriting(page)
    await expect(field.locator('span[data-font-size="24"]')).toHaveText('Alpha')
    await expect(field.locator('u')).toHaveText('Alpha')
    await expect(field.locator('span[data-font-size="32"]')).toHaveText(
      ' delta',
    )
    await expect(field.locator('span[data-font-family="Arial"]')).toHaveText(
      'Alpha',
    )
    await expect(field.locator('span[data-font-family="Consolas"]')).toHaveText(
      ' delta',
    )
    await startWriting(page)
    await select(page, 7, 11)
    await size.selectOption('20')
    await family.selectOption('Calibri')
    await expect(field.locator('span[data-font-family="Calibri"]')).toHaveText(
      'beta',
    )
    await expect(field.locator('span[data-font-family="Arial"]')).toHaveText(
      'Alpha',
    )
    await expect(field.locator('span[data-font-size="20"]')).toHaveText('beta')
    await expect(field.locator('span[data-font-size="24"]')).toHaveText('Alpha')
    await expect(field.locator('u')).toHaveText('Alpha')
    await autosave(page)
    expect(
      await page.evaluate(() =>
        (
          window as unknown as { testPreferenceWrites: () => number }
        ).testPreferenceWrites(),
      ),
    ).toBe(0)
    await page.clock.resume()
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
    ).toEqual([])
    await page.addStyleTag({ content: 'html{font-size:200%;}' })
    await expect(field.locator('span[data-font-size="20"]')).toHaveCSS(
      'font-size',
      '40px',
    )
    await page
      .locator('.editor-style-panel')
      .screenshot({ path: testInfo.outputPath('inline-font.png') })
  })
}

test('mixed selection reports mixed sizes and formatting keeps word counts unchanged (test IPC)', async ({
  page,
}) => {
  const { field, size } = await open(page)
  await field.fill('Alpha beta')
  await select(page, 1, 6)
  await size.selectOption('24')
  await select(page, 1, 11)
  await expect(size).toHaveValue('')
  await size.selectOption('20')
  await expect(field.locator('span[data-font-size="20"]')).toHaveText(
    'Alpha beta',
  )
  await autosave(page)
  await expect(page.locator('.manuscript-counts')).toContainText(
    '2 saved words',
  )
})

test('pending content write locks font controls and never reports a settings success (test IPC)', async ({
  page,
}) => {
  const { field, size } = await open(page, 'editor-pending')
  await field.fill('Alpha beta')
  await select(page, 1, 6)
  await size.selectOption('24')
  await page.clock.runFor(2000)
  await expect(size).toBeDisabled()
  await expect(field).toHaveAttribute('contenteditable', 'false')
  await page.evaluate(() =>
    (window as unknown as { completeTestSave: () => void }).completeTestSave(),
  )
  await expect(size).toBeEnabled()
  await expect(
    page.getByText('Editor settings saved.', { exact: true }),
  ).toHaveCount(0)
})

test('failed font-content save retains formatting and safely retries through Ctrl+S (test IPC)', async ({
  page,
}) => {
  const { field, size } = await open(page, 'editor-failure')
  await field.fill('Alpha beta')
  await select(page, 1, 6)
  await size.selectOption('24')
  await page.clock.runFor(2000)
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(field.locator('span[data-font-size="24"]')).toHaveText('Alpha')
  await field.press('Control+s')
  await expect(
    page.getByRole('status', { name: 'Save status', exact: true }),
  ).toHaveText('Chapter text saved.')
  await expect(
    page.getByText('Editor settings saved.', { exact: true }),
  ).toHaveCount(0)
})
