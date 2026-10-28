import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.use({ timezoneId: 'UTC' })

for (const width of [320, 640, 1100]) {
  test(`writing pace reflects saved goals and local days at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 850 })
    await page.clock.install({ time: new Date('2026-10-27T23:59:40Z') })
    await page.clock.pauseAt(new Date('2026-10-27T23:59:50Z'))
    await page.goto('/tests/fixtures/book-editing.html?total-goals&deadlines')
    const card = page.getByRole('article')
    const pace = card.getByRole('group', { name: 'Required writing pace' })
    await expect(pace).toContainText('Set a deadline')
    const edit = async () => {
      await card
        .getByRole('button', { name: 'Book actions', exact: true })
        .click()
      await card.getByRole('button', { name: 'Edit book', exact: true }).click()
    }
    await edit()
    await page
      .getByLabel('Target word count (optional)', { exact: true })
      .fill('1100')
    await page
      .getByLabel('Deadline (optional)', { exact: true })
      .fill('2026-10-29')
    await page.keyboard.press('Escape')
    await expect(pace).toContainText('Set a deadline')
    await edit()
    await page
      .getByRole('button', { name: 'Save changes', exact: true })
      .click()
    await expect(pace).toContainText('34 words per writing day')
    await expect(pace).toContainText('3 writing days available')
    await page.getByRole('button', { name: 'Open book', exact: true }).click()
    const headerPace = page
      .getByRole('region', { name: 'A quiet story', exact: true })
      .getByRole('group', { name: 'Required writing pace' })
    await expect(headerPace).toContainText('34 words per writing day')
    await page.clock.runFor(20000)
    await expect(headerPace).toContainText('50 words per writing day')
    await page.clock.resume()
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
    ).toEqual([])
    await page
      .getByRole('button', { name: 'Back to library', exact: true })
      .click()
    await expect(pace).toContainText('50 words per writing day')
    await edit()
    await page
      .getByLabel('Deadline (optional)', { exact: true })
      .fill('2026-10-27')
    await page
      .getByRole('button', { name: 'Save changes', exact: true })
      .click()
    await expect(pace).toContainText('Deadline passed.')
    await edit()
    await page
      .getByLabel('Target word count (optional)', { exact: true })
      .fill('1000')
    await page
      .getByRole('button', { name: 'Save changes', exact: true })
      .click()
    await expect(pace).toContainText('Word target reached.')
    await edit()
    await page
      .getByLabel('Target word count (optional)', { exact: true })
      .fill('')
    await page
      .getByRole('button', { name: 'Save changes', exact: true })
      .click()
    await expect(pace).toContainText('Set a total word target')
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
  })
}

test('completed books suppress planning and unknown totals never show numeric pace', async ({
  page,
}) => {
  await page.goto('/tests/fixtures/book-editing.html?deadlines&completed')
  await expect(
    page.getByRole('group', { name: 'Required writing pace' }),
  ).toContainText('Book completed.')
  await page.goto('/tests/fixtures/book-editing.html?cards')
  const unknown = page
    .getByRole('article')
    .first()
    .getByRole('group', { name: 'Required writing pace' })
  await expect(unknown).toContainText('Writing pace unavailable.')
  await expect(unknown).not.toContainText('words per writing day')
})
