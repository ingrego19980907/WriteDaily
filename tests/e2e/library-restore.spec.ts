import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
async function open(page: Page, scenario: string) {
  await page.goto(`/tests/fixtures/library-restore.html?scenario=${scenario}`)
  await page
    .getByRole('button', { name: 'Restore library', exact: true })
    .click()
  const dialog = page.getByRole('dialog', {
    name: 'Restore library',
    exact: true,
  })
  await expect(
    dialog.getByRole('button', { name: 'Cancel', exact: true }),
  ).toBeFocused()
  await dialog
    .getByRole('button', { name: 'Choose backup…', exact: true })
    .click()
  return dialog
}
const facts = (page: Page) =>
  page.evaluate(() =>
    (
      window as unknown as {
        restoreFacts: () => {
          prepared: number
          applied: number
          cancelled: number
          closed: number
        }
      }
    ).restoreFacts(),
  )
async function audit(page: Page) {
  for (const size of [100, 200]) {
    await page.addStyleTag({ content: `html{font-size:${size}%}` })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
    ).toEqual([])
  }
  await page.addStyleTag({ content: 'html{font-size:100%}' })
}
for (const width of [320, 1100]) {
  test(`restore requires confirmation and keeps replacement fenced at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 })
    const dialog = await open(page, 'pending')
    const apply = dialog.getByRole('button', {
      name: /^(Restore this library|Restoring library…)$/,
    })
    await expect(apply).toBeDisabled()
    await expect(
      dialog.getByText(/Books: 2; chapters: 5; covers: 1/),
    ).toBeVisible()
    await audit(page)
    await dialog.getByRole('checkbox').check()
    await apply.click()
    await expect(dialog.getByRole('status')).toHaveText('Restoring library…')
    await expect(
      dialog.getByRole('button', { name: 'Cancel', exact: true }),
    ).toBeDisabled()
    await expect(apply).toBeDisabled()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeVisible()
    expect((await facts(page)).applied).toBe(1)
    await page.evaluate(() =>
      (window as unknown as { completeRestore: () => void }).completeRestore(),
    )
    await expect(dialog.getByRole('status')).toContainText('Library restored.')
    const close = dialog.getByRole('button', {
      name: 'Close WriteDaily',
      exact: true,
    })
    await expect(close).toBeFocused()
    await audit(page)
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' })
    await close.focus()
    await expect(close).toBeFocused()
    await page.emulateMedia({ forcedColors: 'none' })
    await page.keyboard.press('Escape')
    await expect(dialog).toBeVisible()
    await page.screenshot({
      path: info.outputPath('library-restore.png'),
      fullPage: true,
    })
  })
}
test('cancelling a prepared preview never applies it and restores the trigger focus', async ({
  page,
}) => {
  const dialog = await open(page, 'ready')
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(
    page.getByRole('button', { name: 'Restore library', exact: true }),
  ).toBeFocused()
  expect(await facts(page)).toMatchObject({ cancelled: 1, applied: 0 })
})
test('cancelled and invalid selections stay read-only and can choose another backup', async ({
  page,
}) => {
  for (const scenario of ['cancel', 'invalid']) {
    const dialog = await open(page, scenario)
    await expect(dialog.getByRole('checkbox')).toHaveCount(0)
    expect((await facts(page)).applied).toBe(0)
    if (scenario === 'invalid') {
      await expect(dialog.getByRole('alert')).toContainText(
        'current library is unchanged',
      )
      await expect(dialog.getByRole('alert')).not.toContainText('C:\\private')
    }
    await dialog
      .getByRole('button', { name: 'Choose backup…', exact: true })
      .click()
    await expect(dialog.getByRole('checkbox')).not.toBeChecked()
  }
})
test('a lost reply is reconciled with committed native state without duplicate replacement', async ({
  page,
}) => {
  const dialog = await open(page, 'lost')
  await dialog.getByRole('checkbox').check()
  await dialog
    .getByRole('button', { name: 'Restore this library', exact: true })
    .click()
  await expect(dialog.getByRole('status')).toContainText('Library restored.')
  expect((await facts(page)).applied).toBe(1)
})
test('a rolled-back restore requires a fresh preview and fresh acknowledgement', async ({
  page,
}) => {
  const dialog = await open(page, 'rollback')
  await dialog.getByRole('checkbox').check()
  await dialog
    .getByRole('button', { name: 'Restore this library', exact: true })
    .click()
  await expect(dialog.getByRole('alert')).toContainText(
    'safety backup could not be created',
  )
  await expect(dialog.getByRole('checkbox')).toHaveCount(0)
  await dialog
    .getByRole('button', { name: 'Choose backup…', exact: true })
    .click()
  await expect(dialog.getByRole('checkbox')).not.toBeChecked()
  await expect(
    dialog.getByRole('button', { name: 'Restore this library', exact: true }),
  ).toBeDisabled()
})
test('uncertain recovery state blocks dismissal and exposes only closing the app', async ({
  page,
}) => {
  const dialog = await open(page, 'uncertain')
  await dialog.getByRole('checkbox').check()
  await dialog
    .getByRole('button', { name: 'Restore this library', exact: true })
    .click()
  await expect(dialog.getByRole('alert')).toContainText(
    'state could not be confirmed',
  )
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
  await expect(
    dialog.getByRole('button', { name: 'Choose backup…', exact: true }),
  ).toHaveCount(0)
  await dialog
    .getByRole('button', { name: 'Close WriteDaily', exact: true })
    .click()
  expect((await facts(page)).closed).toBe(1)
})
test('restore in ordinary browser preview has no fake file or persistence fallback', async ({
  page,
}) => {
  const dialog = await open(page, 'browser')
  await expect(dialog.getByRole('alert')).toHaveText(
    'Open the desktop app to restore a library backup.',
  )
  expect((await facts(page)).prepared).toBe(0)
  await expect(dialog.getByRole('checkbox')).toHaveCount(0)
})
