import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function open(page: Page, scenario: string) {
  await page.goto(`/tests/fixtures/chapters.html?scenario=${scenario}`)
  await page.getByRole('button', { name: 'Open book', exact: true }).click()
  const rows = page
    .getByRole('list', { name: 'Chapters' })
    .getByRole('listitem')
  await expect(rows).toHaveCount(2)
  return rows
}
async function requests(page: Page) {
  return page.evaluate(() =>
    (
      window as unknown as {
        testExportRequests: () => { id: string; expectedRevision: number }[]
      }
    ).testExportRequests(),
  )
}

for (const width of [320, 1100]) {
  test(`selected chapter export waits for the native result and reflows at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    const rows = await open(page, 'export-pending')
    const selected = rows.nth(1)
    const button = selected.getByRole('button', { name: /^Export chapter:/ })
    await button.focus()
    await page.keyboard.press('Enter')
    await expect(button).toBeDisabled()
    await expect(selected.getByRole('status')).toHaveText('Exporting…')
    await expect(
      page.getByRole('button', { name: 'Create chapter', exact: true }),
    ).toBeDisabled()
    await expect(
      rows.first().getByRole('button', { name: /^Export chapter:/ }),
    ).toBeDisabled()
    await expect(page.getByText(/^Chapter exported:/)).toHaveCount(0)
    expect(await requests(page)).toMatchObject([
      { id: '00000000-0000-4000-8000-000000000002', expectedRevision: 1 },
    ])
    await page.evaluate(() =>
      (
        window as unknown as { completeTestExport: () => void }
      ).completeTestExport(),
    )
    await expect(selected.getByRole('status')).toHaveText(
      'Chapter exported: Розділ 2.txt',
    )
    await expect(button).toBeEnabled()
    expect(
      await page.evaluate(() =>
        (
          window as unknown as { testSaveAttempts: () => number }
        ).testSaveAttempts(),
      ),
    ).toBe(0)
    for (const scale of [100, 200]) {
      await page.addStyleTag({ content: `html{font-size:${scale}%}` })
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
    await button.focus()
    await expect(button).toBeFocused()
    await page.emulateMedia({ forcedColors: 'none' })
    await page.addStyleTag({ content: 'html{font-size:100%}' })
    await selected.screenshot({
      path: testInfo.outputPath('chapter-export.png'),
    })
  })
}

test('cancelled system picker does not announce a file and can be reopened', async ({
  page,
}) => {
  const rows = await open(page, 'export-cancel')
  const selected = rows.first()
  const button = selected.getByRole('button', { name: /^Export chapter:/ })
  await button.click()
  await expect(selected.getByRole('status')).toHaveText('Export cancelled.')
  await expect(page.getByText(/^Chapter exported:/)).toHaveCount(0)
  await button.click()
  await expect(selected.getByRole('status')).toHaveText(
    'Chapter exported: Розділ 1.txt',
  )
  expect(await requests(page)).toHaveLength(2)
})

for (const failure of ['exists', 'conflict']) {
  test(`export ${failure} is explicit and retry uses a confirmed source`, async ({
    page,
  }) => {
    const rows = await open(page, `export-${failure}`)
    const selected = rows.first()
    const button = selected.getByRole('button', { name: /^Export chapter:/ })
    await button.click()
    await expect(selected.getByRole('alert')).toContainText(
      failure === 'exists' ? 'file already exists' : 'Reload chapters',
    )
    await expect(page.getByText(/^Chapter exported:/)).toHaveCount(0)
    if (failure === 'conflict')
      await page
        .getByRole('button', { name: 'Reload chapters', exact: true })
        .click()
    await expect(button).toBeEnabled()
    await button.click()
    await expect(selected.getByRole('status')).toHaveText(
      'Chapter exported: Розділ 1.txt',
    )
    expect((await requests(page)).at(-1)?.expectedRevision).toBe(
      failure === 'conflict' ? 2 : 1,
    )
    await expect(rows).toHaveCount(2)
  })
}
