import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const button = (page: Page) =>
  page.getByRole('button', { name: /^Export book:/ })
async function open(page: Page, scenario: string) {
  await page.goto(
    `/tests/fixtures/chapters.html?scenario=book-export-${scenario}`,
  )
  await page.getByRole('button', { name: 'Open book', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Chapters', exact: true }),
  ).toBeVisible()
  return page.getByRole('list', { name: 'Chapters' }).getByRole('listitem')
}
async function requests(page: Page) {
  return page.evaluate(() =>
    (
      window as unknown as {
        testBookExportRequests: () => {
          expectedChapters: { id: string; revision: number }[]
        }[]
      }
    ).testBookExportRequests(),
  )
}

for (const width of [320, 1100]) {
  test(`whole-book export confirms one complete ordered snapshot at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    const rows = await open(page, 'pending')
    await expect(rows).toHaveCount(2)
    await button(page).focus()
    await page.keyboard.press('Enter')
    await expect(button(page)).toBeDisabled()
    await expect(
      page.getByRole('status').filter({ hasText: 'Exporting…' }),
    ).toBeVisible()
    await expect(page.getByText(/^Book exported:/)).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: 'Create chapter', exact: true }),
    ).toBeDisabled()
    for (const row of await rows.all())
      await expect(
        row.getByRole('button', { name: /^Export chapter:/ }),
      ).toBeDisabled()
    expect(await requests(page)).toMatchObject([
      {
        expectedChapters: [
          { id: '00000000-0000-4000-8000-000000000001', revision: 1 },
          { id: '00000000-0000-4000-8000-000000000002', revision: 1 },
        ],
      },
    ])
    await page.evaluate(() =>
      (
        window as unknown as { completeTestBookExport: () => void }
      ).completeTestBookExport(),
    )
    await expect(
      page.getByText('Book exported: Книга.txt', { exact: true }),
    ).toBeVisible()
    await expect(button(page)).toBeEnabled()
    await expect(button(page)).toBeFocused()
    expect(
      await page.evaluate(() =>
        (
          window as unknown as { testSaveAttempts: () => number }
        ).testSaveAttempts(),
      ),
    ).toBe(0)
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
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' })
    await button(page).focus()
    await expect(button(page)).toBeFocused()
    await page.emulateMedia({ forcedColors: 'none' })
    await page.addStyleTag({ content: 'html{font-size:100%}' })
    await button(page).scrollIntoViewIfNeeded()
    await page.screenshot({
      path: testInfo.outputPath('book-export.png'),
      fullPage: true,
    })
  })
}

test('empty books explain the disabled whole-book action', async ({ page }) => {
  await open(page, 'empty')
  await expect(button(page)).toBeDisabled()
  await expect(button(page)).toHaveAccessibleDescription(
    'Create a chapter before exporting this book.',
  )
  expect(await requests(page)).toEqual([])
})

test('book export uses the new manuscript order after a keyboard reorder', async ({
  page,
}) => {
  const rows = await open(page, 'order')
  await rows
    .last()
    .getByRole('button', { name: /^Move chapter up:/ })
    .click()
  await expect(
    page.getByText('Chapter order saved.', { exact: true }),
  ).toBeVisible()
  await button(page).click()
  await expect(
    page.getByText('Book exported: Книга.txt', { exact: true }),
  ).toBeVisible()
  expect(
    (await requests(page))[0].expectedChapters.map((row) => row.id),
  ).toEqual([
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001',
  ])
})

test('cancelled and failed book exports permit retry without claiming a file', async ({
  page,
}) => {
  for (const scenario of ['cancel', 'failure']) {
    await open(page, scenario)
    await button(page).click()
    await expect(page.getByText(/^Book exported:/)).toHaveCount(0)
    if (scenario === 'cancel')
      await expect(
        page.getByText('Book export cancelled.', { exact: true }),
      ).toBeVisible()
    else
      await expect(page.getByRole('alert')).toContainText(
        'Could not confirm the book export',
      )
    await button(page).click()
    await expect(
      page.getByText('Book exported: Книга.txt', { exact: true }),
    ).toBeVisible()
  }
})

test('external chapter changes require a fresh ordered manifest before retry', async ({
  page,
}) => {
  await open(page, 'conflict')
  await button(page).click()
  await expect(page.getByRole('alert')).toContainText(
    'Reload chapters or reopen the book',
  )
  await page
    .getByRole('button', { name: 'Reload chapters', exact: true })
    .click()
  await expect(button(page)).toBeEnabled()
  await button(page).click()
  await expect(
    page.getByText('Book exported: Книга.txt', { exact: true }),
  ).toBeVisible()
  expect((await requests(page)).at(-1)?.expectedChapters).toEqual([
    { id: '00000000-0000-4000-8000-000000000002', revision: 2 },
    { id: '00000000-0000-4000-8000-000000000001', revision: 2 },
  ])
})
