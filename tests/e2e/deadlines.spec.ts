import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function editDate(page: Page, value: string) {
  const card = page.getByRole('article')
  await card.getByRole('button', { name: 'Book actions', exact: true }).click()
  await page.getByRole('button', { name: 'Edit book', exact: true }).click()
  const input = page.getByLabel('Deadline (optional)', { exact: true })
  await expect(input).toHaveAccessibleDescription(/local calendar/)
  await input.fill(value)
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
}

for (const width of [320, 640, 1100]) {
  test(`deadlines show missing, future, today and overdue states at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 850 })
    await page.clock.install({ time: new Date('2026-10-27T10:00:00Z') })
    await page.goto('/tests/fixtures/book-editing.html?deadlines')
    const card = page.getByRole('article')
    const deadline = card.getByLabel('Book deadline', { exact: true })
    await expect(deadline).toHaveText('No deadline')
    await editDate(page, '2026-10-29')
    await expect(deadline).toContainText('2 days left')
    await expect(deadline.locator('time')).toHaveAttribute(
      'datetime',
      '2026-10-29',
    )
    await editDate(page, '2026-10-27')
    await expect(deadline).toContainText('Due today')
    await page.getByRole('button', { name: 'Open book', exact: true }).click()
    await expect(
      page
        .getByRole('region', { name: 'A quiet story', exact: true })
        .getByLabel('Book deadline'),
    ).toContainText('Due today')
    await page
      .getByRole('button', { name: 'Back to library', exact: true })
      .click()
    await editDate(page, '2026-10-26')
    await expect(deadline).toContainText('1 day overdue')
    await card
      .getByRole('button', { name: 'Book actions', exact: true })
      .click()
    await page.getByRole('button', { name: 'Edit book', exact: true }).click()
    const input = page.getByLabel('Deadline (optional)', { exact: true })
    await expect(input).toHaveValue('2026-10-26')
    await input.fill('2024-02-29')
    await page.keyboard.press('Escape')
    await expect(deadline).toContainText('1 day overdue')
    await card
      .getByRole('button', { name: 'Book actions', exact: true })
      .click()
    await page.getByRole('button', { name: 'Edit book', exact: true }).click()
    await expect(input).toHaveValue('2024-02-29')
    await expect(page.getByLabel('Target word count (optional)')).toHaveValue(
      '50000',
    )
    await expect(page.getByLabel('Daily word goal (optional)')).toHaveValue(
      '500',
    )
    await input.fill('')
    await page
      .getByRole('button', { name: 'Save changes', exact: true })
      .click()
    await expect(deadline).toHaveText('No deadline')
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
    ).toEqual([])
    await editDate(page, '2026-10-26')
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
    ).toEqual([])
    await page.addStyleTag({ content: 'html { font-size: 200%; }' })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
  })
}

test.describe('local midnight west of UTC', () => {
  test.use({ timezoneId: 'America/Los_Angeles' })
  test('a date is due today until local midnight, then becomes overdue without reopening', async ({
    page,
  }) => {
    await page.clock.install({ time: new Date('2026-10-28T06:58:50Z') })
    await page.clock.pauseAt(new Date('2026-10-28T06:59:50Z'))
    await page.goto('/tests/fixtures/book-editing.html?deadlines')
    await editDate(page, '2026-10-27')
    const deadline = page.getByRole('article').getByLabel('Book deadline')
    await expect(deadline).toContainText('Due today')
    await page.clock.runFor(20_000)
    await expect(deadline).toContainText('1 day overdue')
    await expect(deadline.locator('time')).toHaveText('Oct 27, 2026')
    await page.getByRole('button', { name: 'Open book', exact: true }).click()
    await expect(
      page
        .getByRole('region', { name: 'A quiet story', exact: true })
        .getByLabel('Book deadline'),
    ).toContainText('1 day overdue')
  })
})

test.describe('local calendar east of UTC', () => {
  test.use({ timezoneId: 'Asia/Tokyo' })
  test('a local date after midnight is not the previous UTC day', async ({
    page,
  }) => {
    await page.clock.install({ time: new Date('2026-10-26T15:05:00Z') })
    await page.goto('/tests/fixtures/book-editing.html?deadlines')
    await editDate(page, '2026-10-27')
    await expect(
      page.getByRole('article').getByLabel('Book deadline'),
    ).toContainText('Due today')
  })
})

test('completed books retain their deadline without an overdue warning', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-27T10:00:00Z') })
  await page.goto('/tests/fixtures/book-editing.html?deadlines&completed')
  await editDate(page, '2026-10-25')
  const deadline = page.getByRole('article').getByLabel('Book deadline')
  await expect(deadline).toContainText('Book completed')
  await expect(deadline).not.toContainText('overdue')
  await page.getByRole('button', { name: 'Open book', exact: true }).click()
  await expect(
    page
      .getByRole('region', { name: 'A quiet story', exact: true })
      .getByLabel('Book deadline'),
  ).toContainText('Book completed')
})
