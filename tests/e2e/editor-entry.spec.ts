import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { activityBooks } from '../fixtures/activity-data'

for (const width of [320, 1100]) {
  test(`editor entry chooses the correct book by keyboard and reflows at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 850 })
    await page.goto('/tests/fixtures/editor-entry.html')
    await page
      .getByRole('button', { name: 'Writing Editor', exact: true })
      .click()
    await expect(page.getByText('Coming soon', { exact: true })).toHaveCount(0)
    const trigger = page.getByRole('button', {
      name: 'Start editing',
      exact: true,
    })
    await trigger.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Choose a book' })
    await expect(dialog).toBeVisible()
    await page.getByRole('combobox', { name: 'Book', exact: true }).focus()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(
      page.getByRole('combobox', { name: 'Book', exact: true }),
    ).toHaveValue(activityBooks[1].id)
    await page.addStyleTag({ content: 'html{font-size:200%;}' })
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
    await dialog.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(trigger).toBeFocused()
    await trigger.click()
    await page
      .getByRole('combobox', { name: 'Book', exact: true })
      .selectOption(activityBooks[1].id)
    await page
      .getByRole('button', { name: 'Open selected book', exact: true })
      .click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(
      page.getByRole('heading', {
        name: 'A quiet story (latest 2)',
        exact: true,
      }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Create chapter', exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Writing Editor', exact: true }),
    ).toBeFocused()
  })
}
test('empty library and failed reads are distinct, with a working retry', async ({
  page,
}) => {
  await page.goto('/tests/fixtures/editor-entry.html?state=empty')
  await page
    .getByRole('button', { name: 'Writing Editor', exact: true })
    .click()
  await expect(
    page.getByText('No books have been created yet.', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Start editing', exact: true }),
  ).toHaveCount(0)
  await page.goto('/tests/fixtures/editor-entry.html?state=read-failure')
  await page
    .getByRole('button', { name: 'Writing Editor', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText(
    'Could not load your books',
  )
  await page
    .getByRole('button', { name: 'Retry loading books', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Start editing', exact: true }),
  ).toBeVisible()
})
test('open failures keep the selection and can recover without a false active book', async ({
  page,
}) => {
  await page.goto('/tests/fixtures/editor-entry.html?state=open-failure')
  await page
    .getByRole('button', { name: 'Writing Editor', exact: true })
    .click()
  await page.getByRole('button', { name: 'Start editing', exact: true }).click()
  await page
    .getByRole('combobox', { name: 'Book', exact: true })
    .selectOption(activityBooks[0].id)
  await page
    .getByRole('button', { name: 'Open selected book', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(
    page.getByRole('combobox', { name: 'Book', exact: true }),
  ).toHaveValue(activityBooks[0].id)
  await page
    .getByRole('button', { name: 'Open selected book', exact: true })
    .click()
  await expect(
    page.getByRole('heading', {
      name: 'A quiet story (latest 1)',
      exact: true,
    }),
  ).toBeVisible()
})
test('closing the chooser cancels a pending open and ignores its late response', async ({
  page,
}) => {
  await page.goto('/tests/fixtures/editor-entry.html?state=pending')
  await page
    .getByRole('button', { name: 'Writing Editor', exact: true })
    .click()
  await page.getByRole('button', { name: 'Start editing', exact: true }).click()
  await page
    .getByRole('combobox', { name: 'Book', exact: true })
    .selectOption(activityBooks[0].id)
  await page
    .getByRole('button', { name: 'Open selected book', exact: true })
    .click()
  await expect(
    page.getByRole('combobox', { name: 'Book', exact: true }),
  ).toBeDisabled()
  await page.keyboard.press('Escape')
  await page.evaluate(() =>
    (
      window as unknown as { completeEditorOpen: () => void }
    ).completeEditorOpen(),
  )
  await expect(
    page.getByRole('button', { name: 'Start editing', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', {
      name: 'A quiet story (latest 1)',
      exact: true,
    }),
  ).toHaveCount(0)
})
