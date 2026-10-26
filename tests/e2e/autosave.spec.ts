import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

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
const attempts = (page: Page) =>
  page.evaluate(() =>
    (
      window as unknown as { testSaveAttempts: () => number }
    ).testSaveAttempts(),
  )

for (const width of [320, 640, 1100]) {
  test(`autosave debounces and reopens committed writing at ${width}px (test IPC)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 850 })
    const field = await open(page)
    await field.fill('first')
    await page.clock.runFor(1500)
    expect(await attempts(page)).toBe(0)
    await field.fill('latest two')
    await page.clock.runFor(1999)
    expect(await attempts(page)).toBe(0)
    await page.clock.runFor(1)
    await expect(
      page.getByRole('group', { name: 'Word count', exact: true }),
    ).toContainText('2 saved words')
    expect(await attempts(page)).toBe(1)
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Close', exact: true })
      .click()
    await page
      .getByRole('button', { name: 'Edit chapter text', exact: true })
      .last()
      .click()
    await expect(field).toHaveText('latest two')
    await page.clock.resume()
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
    ).toEqual([])
  })
}

test('slow autosave locks edits and navigation until commit (test IPC)', async ({
  page,
}) => {
  const field = await open(page, 'editor-pending')
  await field.fill('keep pending')
  await page.clock.runFor(2000)
  await expect(field).toHaveAttribute('contenteditable', 'false')
  await expect(page.getByRole('combobox')).toBeDisabled()
  await page.clock.runFor(10000)
  expect(await attempts(page)).toBe(1)
  await expect(
    page.getByText('Chapter text saved.', { exact: true }),
  ).toHaveCount(0)
  await page.evaluate(() =>
    (window as unknown as { completeTestSave: () => void }).completeTestSave(),
  )
  await expect(field).toHaveAttribute('contenteditable', 'true')
  await expect(page.getByRole('combobox')).toBeEnabled()
})

test('failed autosave pauses until explicit retry, then resumes (test IPC)', async ({
  page,
}) => {
  const field = await open(page, 'editor-failure')
  await field.fill('retain this')
  await page.clock.runFor(2000)
  await expect(page.getByRole('alert')).toContainText(
    'Automatic saving is paused',
  )
  await field.fill('retain these edits')
  await page.clock.runFor(10000)
  expect(await attempts(page)).toBe(1)
  await expect(page.getByRole('alert')).toContainText(
    'Automatic saving is paused',
  )
  await page
    .getByRole('button', { name: 'Save chapter text', exact: true })
    .click()
  await expect(
    page.getByText('Chapter text saved.', { exact: true }),
  ).toBeVisible()
  await field.fill('resumed')
  await page.clock.runFor(2000)
  await expect(
    page.getByRole('group', { name: 'Word count', exact: true }),
  ).toContainText('1 saved word')
  expect(await attempts(page)).toBe(3)
})

test('navigation flushes the debounce once and old timers cannot write the next chapter (test IPC)', async ({
  page,
}) => {
  const field = await open(page)
  await field.fill('outgoing')
  await page
    .getByRole('button', { name: 'Previous chapter', exact: true })
    .click()
  await expect(field).toHaveAttribute('contenteditable', 'true')
  await expect(field).not.toHaveText('outgoing')
  await page.clock.runFor(10000)
  expect(await attempts(page)).toBe(1)
})
