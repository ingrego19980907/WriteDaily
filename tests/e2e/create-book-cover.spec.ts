import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const width of [320, 1100]) {
  test(`creation previews a cover and safely retries a partial commit at ${width}px (test IPC)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 760 })
    await page.goto('/tests/fixtures/book-creation.html?cover-failure')
    const calls = () =>
      page.evaluate(
        () => (window as unknown as { creationCalls: string[] }).creationCalls,
      )
    const trigger = page.getByRole('button', { name: 'New Book', exact: true })
    await trigger.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Create New Book' })
    await dialog
      .getByLabel('Book title', { exact: true })
      .fill('Нова історія — тихий ранок')
    await dialog.getByLabel('Target word count (optional)').fill('10000')
    await dialog.getByLabel('Daily word goal (optional)').fill('250')
    await dialog.getByLabel('Deadline (optional)').fill('2027-01-01')
    await dialog
      .getByLabel('Cover image', { exact: true })
      .setInputFiles('src-tauri/icons/32x32.png')
    await expect(
      dialog.getByRole('img', { name: 'Unsaved cover preview' }),
    ).toBeVisible()
    expect(await calls()).toEqual([])
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
    await trigger.click()
    await expect(dialog.getByLabel('Book title', { exact: true })).toHaveValue(
      'Нова історія — тихий ранок',
    )
    await expect(
      dialog.getByRole('img', { name: 'Unsaved cover preview' }),
    ).toBeVisible()
    await dialog.screenshot({
      path: test.info().outputPath('create-book-preview.png'),
    })
    await dialog
      .getByRole('button', { name: 'Create book', exact: true })
      .click()
    await expect(
      dialog.getByRole('button', { name: 'Saving cover…' }),
    ).toBeDisabled()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('alert')).toContainText(
      'Could not save the cover',
    )
    await expect(
      dialog.getByText(/Retrying will not create another book/),
    ).toBeVisible()
    await expect(
      dialog.getByLabel('Book title', { exact: true }),
    ).toBeDisabled()
    expect(await calls()).toEqual(['create_book', 'set_cover'])
    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(scan.violations).toEqual([])
    await page.keyboard.press('Escape')
    await trigger.click()
    await dialog.getByRole('button', { name: 'Retry cover' }).click()
    await expect(dialog).toHaveCount(0)
    expect(await calls()).toEqual(['create_book', 'set_cover', 'set_cover'])
    const card = page.getByRole('article', {
      name: 'Нова історія — тихий ранок',
      exact: true,
    })
    await expect(card.getByRole('img', { name: 'Book cover' })).toBeVisible()
    await expect(card.getByText('Target: 10,000 words')).toBeVisible()
    await trigger.click()
    await expect(dialog.getByLabel('Book title', { exact: true })).toHaveValue(
      '',
    )
    await expect(dialog.getByRole('img')).toHaveCount(0)
  })
}
