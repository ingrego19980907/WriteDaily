import { expect, type Page } from '@playwright/test'

export async function startWriting(page: Page) {
  const start = page.getByRole('button', { name: 'Start writing', exact: true })
  if (await start.count()) await start.click()
  await expect(
    page.getByRole('textbox', { name: 'Chapter manuscript' }),
  ).toHaveAttribute('contenteditable', 'true')
}
export async function previewChapter(page: Page) {
  const exit = page.getByRole('button', {
    name: 'Exit focus mode',
    exact: true,
  })
  if (await exit.count()) await exit.click()
  await expect(
    page.getByRole('textbox', { name: 'Chapter manuscript' }),
  ).toHaveAttribute('contenteditable', 'false')
}
