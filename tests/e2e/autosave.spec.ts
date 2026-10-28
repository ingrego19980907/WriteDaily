import { startWriting, previewChapter } from './editor-mode'
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
    await expect(page.locator('.manuscript-counts')).toContainText(
      '2 saved words',
    )
    expect(await attempts(page)).toBe(1)
    await page.clock.runFor(10000)
    expect(await attempts(page)).toBe(1)
    await field.fill('another saved update')
    await page.clock.runFor(1999)
    expect(await attempts(page)).toBe(1)
    await page.clock.runFor(1)
    await expect(page.locator('.manuscript-counts')).toContainText(
      '3 saved words',
    )
    expect(await attempts(page)).toBe(2)

    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Close', exact: true })
      .click()
    await page
      .getByRole('button', { name: 'Edit chapter text', exact: true })
      .last()
      .click()
    await startWriting(page)
    await expect(field).toHaveText('another saved update')
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
  await expect(page.locator('.modal-body nav select')).toBeDisabled()
  await page.clock.runFor(10000)
  expect(await attempts(page)).toBe(1)
  await expect(
    page.getByText('Chapter text saved.', { exact: true }),
  ).toHaveCount(0)
  await page.evaluate(() =>
    (window as unknown as { completeTestSave: () => void }).completeTestSave(),
  )
  await expect(field).toHaveAttribute('contenteditable', 'true')
  await expect(page.locator('.modal-body nav select')).toBeEnabled()
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
  await expect(page.locator('.manuscript-counts')).toContainText('1 saved word')
  expect(await attempts(page)).toBe(4)
})

test('navigation flushes the debounce once and old timers cannot write the next chapter (test IPC)', async ({
  page,
}) => {
  const field = await open(page)
  await field.fill('outgoing')
  await previewChapter(page)
  await page
    .getByRole('button', { name: 'Previous chapter', exact: true })
    .click()
  await expect(field).toHaveAttribute('contenteditable', 'false')
  await expect(field).not.toHaveText('outgoing')
  await page.clock.runFor(10000)
  expect(await attempts(page)).toBe(1)
})

test('save shortcuts flush immediately, avoid duplicate clean writes and work from the focus header (test IPC)', async ({
  page,
}) => {
  const field = await open(page)
  await field.fill('shortcut text')
  await field.press('Control+s')
  const counts = page.locator('.manuscript-counts')
  await expect(counts).toContainText('2 saved words')
  expect(await attempts(page)).toBe(1)
  await field.press('Control+s')
  await page.clock.runFor(10000)
  expect(await attempts(page)).toBe(1)
  await field.fill('focus mode shortcut')
  await startWriting(page)
  await page.keyboard.press('Meta+s')
  await expect(
    page.getByRole('status', { name: 'Save status', exact: true }),
  ).toHaveText('Chapter text saved.')
  expect(await attempts(page)).toBe(2)
  await page
    .getByRole('button', { name: 'Exit focus mode', exact: true })
    .click()
  await expect(field).toHaveAttribute('contenteditable', 'false')
  await expect(field).toHaveText('focus mode shortcut')
  await expect(
    page.getByRole('button', { name: 'Save chapter text', exact: true }),
  ).toHaveCount(0)
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Close', exact: true })
    .click()
  expect(
    await page.evaluate(() => {
      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      })
      document.body.dispatchEvent(event)
      return event.defaultPrevented
    }),
  ).toBe(false)
})

test('repeated Ctrl+S cannot overlap a pending write (test IPC)', async ({
  page,
}) => {
  const field = await open(page, 'editor-pending')
  await field.fill('pending shortcut')
  await field.press('Control+s')
  await expect(field).toHaveAttribute('contenteditable', 'false')
  await page.keyboard.press('Control+s')
  await page.keyboard.press('Control+s')
  await page.clock.runFor(10000)
  expect(await attempts(page)).toBe(1)
  await page.evaluate(() =>
    (window as unknown as { completeTestSave: () => void }).completeTestSave(),
  )
  await expect(page.locator('.manuscript-counts')).toContainText(
    '2 saved words',
  )
})

test('Ctrl+S retries a transient save failure without losing the draft (test IPC)', async ({
  page,
}) => {
  const field = await open(page, 'editor-failure')
  await field.fill('retry shortcut')
  await field.press('Control+s')
  await expect(page.getByRole('alert')).toContainText(
    'Automatic saving is paused',
  )
  await expect(field).toHaveText('retry shortcut')
  await field.press('Control+s')
  await expect(page.locator('.manuscript-counts')).toContainText(
    '2 saved words',
  )
  await page.clock.runFor(10000)
  expect(await attempts(page)).toBe(2)
})
