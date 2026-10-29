import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { startWriting } from './editor-mode'

test.use({ timezoneId: 'UTC' })
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-29T10:00:00Z') })
})
const words = (count = 100) => Array<string>(count).fill('word').join(' ')
const notice = (page: Page) =>
  page.getByRole('group', { name: 'Achievement notification' })
async function open(page: Page, scenario = '', mode = 'enabled') {
  await page.clock.resume()
  await page.goto(
    `/tests/fixtures/chapters.html?scenario=${scenario}&notice=${mode}`,
  )
  await page.getByRole('button', { name: 'Open book', exact: true }).click()
  await page
    .getByRole('button', { name: 'Edit chapter text', exact: true })
    .last()
    .click()
  await startWriting(page)
  const pauseAt = await page.evaluate(() =>
    new Date(Date.now() + 60_000).toISOString(),
  )
  await page.clock.pauseAt(new Date(pauseAt))
  return page.getByRole('textbox', { name: 'Chapter manuscript' })
}
async function wake(page: Page) {
  await page.evaluate(() =>
    (
      window as unknown as { wakeTestAchievements: () => Promise<void> }
    ).wakeTestAchievements(),
  )
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  expect(
    await notice(page).evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true)
}

for (const width of [320, 1100]) {
  test(`committed notices remain readable in focus mode without stealing typing at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    const field = await open(page, 'editor-pending')
    await field.fill(words())
    await page.clock.runFor(2_000)
    await expect(field).toHaveAttribute('contenteditable', 'false')
    await expect(notice(page)).toHaveCount(0)
    await page.evaluate(() =>
      (
        window as unknown as { completeTestSave: () => void }
      ).completeTestSave(),
    )
    await expect(notice(page)).toBeVisible()
    await expect(field).toHaveAttribute('contenteditable', 'true')
    await expect(field).toBeFocused()
    await expect(
      page
        .getByRole('dialog')
        .getByRole('group', { name: 'Achievement notification' }),
    ).toBeVisible()
    expect(
      await notice(page).evaluate(
        (element) => element.closest('[aria-hidden="true"]') === null,
      ),
    ).toBe(true)
    await expect(
      notice(page).getByText('First Words', { exact: true }),
    ).toBeVisible()
    await notice(page).screenshot({
      path: testInfo.outputPath('notification.png'),
    })
    const dismiss = notice(page).getByRole('button', {
      name: 'Dismiss achievement notification',
    })
    await dismiss.focus()
    await page.clock.resume()
    for (const scale of [100, 200]) {
      await page.addStyleTag({ content: `html { font-size: ${scale}%; }` })
      await noOverflow(page)
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
            .analyze()
        ).violations,
      ).toEqual([])
    }
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' })
    await noOverflow(page)
    await dismiss.focus()
    await page.clock.runFor(12_000)
    await expect(notice(page)).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(notice(page)).toHaveCount(0)
    await expect(field).toBeFocused()
    await wake(page)
    await expect(notice(page)).toHaveCount(0)
  })
}

test('unconfirmed claim and failed save never manufacture a notice', async ({
  page,
}) => {
  const field = await open(page, '', 'pending-claim')
  await field.fill(words())
  await page.clock.runFor(2_000)
  await expect(field).toHaveAttribute('contenteditable', 'true')
  await expect(notice(page)).toHaveCount(0)
  await page.evaluate(() =>
    (
      window as unknown as { completeTestNotice: () => void }
    ).completeTestNotice(),
  )
  await expect(notice(page)).toBeVisible()
  const failed = await open(page, 'editor-failure')
  await failed.fill(words())
  await page.clock.runFor(2_000)
  await expect(notice(page)).toHaveCount(0)
  await failed.press('Control+s')
  await expect(notice(page)).toBeVisible()
})

test('claim failures preserve successful writing and recover on focus', async ({
  page,
}) => {
  const field = await open(page, '', 'claim-failure')
  await field.fill(words())
  await page.clock.runFor(2_000)
  await expect(field).toHaveAttribute('contenteditable', 'true')
  await expect(notice(page)).toHaveCount(0)
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(notice(page)).toBeVisible()
  await expect(field).toBeFocused()
  await notice(page)
    .getByRole('button', { name: 'Dismiss achievement notification' })
    .click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(field).toBeFocused()
})

test('lost claim replies and old receipts are not replayed', async ({
  page,
}) => {
  const field = await open(page, '', 'claim-lost')
  await field.fill(words())
  await page.clock.runFor(2_000)
  await expect(notice(page)).toHaveCount(0)
  await wake(page)
  await expect(notice(page)).toHaveCount(0)
  const old = await open(page, '', 'old')
  await old.fill(words())
  await page.clock.runFor(2_000)
  await wake(page)
  await expect(notice(page)).toHaveCount(0)
})

test('one batch announces simultaneous thresholds and hover pauses automatic dismissal', async ({
  page,
}) => {
  const field = await open(page)
  await field.fill(words(1_000))
  await page.clock.runFor(2_000)
  await expect(notice(page)).toHaveCount(1)
  await expect(notice(page).getByText('2 achievements unlocked')).toBeVisible()
  await expect(
    notice(page).getByText('First Words, Getting Started'),
  ).toBeVisible()
  await notice(page).hover()
  await page.clock.runFor(12_000)
  await expect(notice(page)).toBeVisible()
  await field.hover()
  await page.clock.runFor(8_000)
  await expect(notice(page)).toHaveCount(0)
  await expect(field).toBeFocused()
})

test('the same active notice moves out of a closed dialog and survives navigation without replay', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1100, height: 850 })
  const field = await open(page)
  await field.fill(words())
  await page.clock.runFor(2_000)
  await expect(notice(page)).toBeVisible()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Close', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(notice(page)).toHaveCount(1)
  expect(
    await notice(page).evaluate((element) =>
      element.closest('[role="dialog"]'),
    ),
  ).toBeNull()
  await notice(page).screenshot({
    path: testInfo.outputPath('notification-root.png'),
  })
  await page.getByRole('button', { name: 'Achievements', exact: true }).click()
  await expect(page.getByText('1 / 8 unlocked')).toBeVisible()
  await expect(notice(page)).toHaveCount(1)
  await notice(page)
    .getByRole('button', { name: 'Dismiss achievement notification' })
    .click()
  await wake(page)
  await expect(notice(page)).toHaveCount(0)
})
