import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const width of [320, 640, 1100]) {
  test(`chapter create/rename/confirmed delete is accessible at ${width}px (test IPC)`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 800 })
    await page.goto('/tests/fixtures/chapters.html')
    await page.getByRole('button', { name: 'Open book', exact: true }).click()
    const list = page.getByRole('list', { name: 'Chapters', exact: true })
    await expect(list.getByRole('listitem')).toHaveCount(2)
    await page
      .getByRole('button', { name: 'Create chapter', exact: true })
      .click()
    let dialog = page.getByRole('dialog')
    await dialog
      .getByRole('button', { name: 'Create chapter', exact: true })
      .click()
    await expect(dialog.getByRole('textbox')).toBeFocused()
    await expect(dialog.getByRole('textbox')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    await dialog.getByRole('textbox').fill('Новий розділ é')
    await page.keyboard.press('Escape')
    await expect(
      page.getByRole('button', { name: 'Create chapter', exact: true }),
    ).toBeFocused()
    await page.getByRole('button', { name: 'Back to library' }).click()
    await page
      .getByRole('button', { name: 'Writing Editor', exact: true })
      .click()
    await page
      .getByRole('button', { name: 'Create chapter', exact: true })
      .click()
    dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('textbox')).toHaveValue('Новий розділ é')
    await dialog
      .getByRole('button', { name: 'Create chapter', exact: true })
      .click()
    await expect(list.getByRole('listitem')).toHaveCount(3)
    await expect(
      page.getByRole('heading', { name: 'Chapters', exact: true }),
    ).toBeFocused()
    await list
      .getByRole('listitem')
      .nth(1)
      .getByRole('button', { name: 'Rename chapter' })
      .click()
    dialog = page.getByRole('dialog')
    await dialog.getByRole('textbox').fill('Renamed duplicate')
    await dialog.getByRole('button', { name: 'Save title' }).click()
    await expect(list.getByRole('listitem').nth(1)).toContainText(
      'Renamed duplicate',
    )
    await expect(list.getByRole('listitem').nth(0)).not.toContainText(
      'Renamed duplicate',
    )
    const remove = list
      .getByRole('listitem')
      .nth(1)
      .getByRole('button', { name: 'Delete chapter' })
    await remove.focus()
    await page.keyboard.press('Enter')
    dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused()
    await expect(
      dialog.getByRole('button', { name: 'Delete chapter' }),
    ).toBeDisabled()
    await page.keyboard.press('Enter')
    await expect(dialog).toHaveCount(0)
    await expect(remove).toBeFocused()
    await remove.click()
    dialog = page.getByRole('dialog')
    await dialog.getByRole('checkbox').check()
    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(scan.violations).toEqual([])
    await dialog.getByRole('button', { name: 'Delete chapter' }).click()
    await expect(list.getByRole('listitem')).toHaveCount(2)
    await expect(
      page.getByRole('heading', { name: 'Chapters', exact: true }),
    ).toBeFocused()
    await page.addStyleTag({ content: 'html { font-size: 200%; }' })
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
    await page.screenshot({
      path: testInfo.outputPath('chapters.png'),
      fullPage: true,
    })
  })
}

test('chapter conflicts keep rename drafts and require deletion reconfirmation (test IPC)', async ({
  page,
}) => {
  await page.goto('/tests/fixtures/chapters.html?scenario=conflicts')
  await page.getByRole('button', { name: 'Open book', exact: true }).click()
  const row = page
    .getByRole('list', { name: 'Chapters', exact: true })
    .getByRole('listitem')
    .nth(1)
  await row.getByRole('button', { name: 'Rename chapter' }).click()
  let dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox').fill('My kept draft')
  await dialog.getByRole('button', { name: 'Save title' }).click()
  await expect(dialog.getByRole('alert')).toContainText(
    'This chapter has changed',
  )
  await expect(
    dialog.getByRole('button', { name: 'Save title' }),
  ).toBeDisabled()
  await dialog
    .getByRole('button', { name: 'Load latest revision and keep draft' })
    .click()
  await expect(dialog.getByRole('textbox')).toHaveValue('My kept draft')
  await expect(dialog.getByRole('textbox')).toBeFocused()
  await dialog.getByRole('button', { name: 'Save title' }).click()
  await expect(row).toContainText('My kept draft')
  await row.getByRole('button', { name: 'Delete chapter' }).click()
  dialog = page.getByRole('dialog')
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Delete chapter' }).click()
  await expect(dialog.getByRole('alert')).toContainText(
    'This chapter has changed',
  )
  await dialog
    .getByRole('button', { name: 'Load latest chapter details' })
    .click()
  await expect(dialog).toContainText('Review before deleting')
  await expect(dialog.getByRole('checkbox')).not.toBeChecked()
  await expect(dialog.getByRole('checkbox')).toBeFocused()
  await expect(
    dialog.getByRole('button', { name: 'Delete chapter' }),
  ).toBeDisabled()
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Delete chapter' }).click()
  await expect(
    page
      .getByRole('list', { name: 'Chapters', exact: true })
      .getByRole('listitem'),
  ).toHaveCount(1)
})

test('chapter read/native validation/write failures retain state and allow retry (test IPC)', async ({
  page,
}) => {
  await page.goto('/tests/fixtures/chapters.html?scenario=errors')
  await page.getByRole('button', { name: 'Open book', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Could not load the chapters',
  )
  await expect(
    page.getByRole('button', { name: 'Create chapter', exact: true }),
  ).toBeDisabled()
  await page.getByRole('button', { name: 'Retry loading chapters' }).click()
  await page
    .getByRole('button', { name: 'Create chapter', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox').fill('Kept title')
  await dialog
    .getByRole('button', { name: 'Create chapter', exact: true })
    .click()
  await expect(dialog.getByRole('textbox')).toBeFocused()
  await expect(dialog.getByRole('textbox')).toHaveAccessibleDescription(
    /Use no more than 200 characters/,
  )
  await dialog
    .getByRole('button', { name: 'Create chapter', exact: true })
    .click()
  await expect(dialog.getByRole('alert')).toContainText(
    'Could not create the chapter',
  )
  await expect(dialog.getByRole('textbox')).toHaveValue('Kept title')
  await dialog
    .getByRole('button', { name: 'Create chapter', exact: true })
    .click()
  await expect(page.getByRole('heading', { name: 'Kept title' })).toBeVisible()
})
