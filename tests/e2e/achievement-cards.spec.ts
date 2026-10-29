import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

test.use({ timezoneId: 'UTC' })

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  for (const card of await page.getByRole('article').all()) {
    expect(
      await card.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true)
  }
}

for (const width of [320, 640, 1100]) {
  test(`achievement cards expose saved, locked and unavailable states at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 850 })
    await page.goto('/tests/fixtures/achievement-cards.html')
    await expect(page.getByRole('article')).toHaveCount(8)
    const saved = page.getByRole('article', {
      name: 'Goal Keeper',
      exact: true,
    })
    await expect(saved.getByText('Unlocked', { exact: true })).toBeVisible()
    await expect(saved.locator('time')).toHaveText('Unlocked Oct 29, 2026')
    await expect(saved.locator('time')).toHaveAttribute(
      'datetime',
      '2026-10-29T10:00:00.000Z',
    )
    await expect(saved.getByRole('progressbar')).toHaveCount(0)
    const pending = page.getByRole('article', {
      name: 'Storyteller',
      exact: true,
    })
    await expect(pending.getByText('Locked', { exact: true })).toBeVisible()
    await expect(
      pending.getByText('Requirements met. Unlock has not been confirmed.'),
    ).toBeVisible()
    await expect(pending.locator('time')).toHaveCount(0)
    await expect(
      page
        .getByRole('article', { name: 'Dedicated Writer' })
        .getByText('Status unavailable'),
    ).toBeVisible()
    await expect(
      page
        .getByRole('article', { name: 'First Words' })
        .getByRole('progressbar'),
    ).toHaveAttribute('aria-valuenow', '0')
    await expect(
      page
        .getByRole('article', { name: 'Getting Started' })
        .getByRole('progressbar'),
    ).toHaveCount(0)
    await expect(
      page
        .getByRole('article', { name: 'Consistency' })
        .getByRole('progressbar'),
    ).toHaveAttribute('aria-valuetext', 'At least 6 / 7 scheduled writing days')
    await expect(
      page
        .getByRole('article', { name: 'Novelist' })
        .getByText('49,999 / 50,000 credited words'),
    ).toBeVisible()
    await expect(
      page
        .getByRole('article', { name: 'The End' })
        .getByText('Marking a book as completed is not available yet.'),
    ).toBeVisible()
    await page
      .getByTestId('achievement-cards')
      .screenshot({ path: testInfo.outputPath('cards.png') })

    for (const scale of [100, 200]) {
      await page.addStyleTag({ content: `html { font-size: ${scale}%; }` })
      await noOverflow(page)
      const accessibility = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(accessibility.violations).toEqual([])
    }
    // Future localization/long labels must wrap without hiding the requirement.
    const first = page.getByRole('article').first()
    await first.locator('h3').evaluate((heading) => {
      heading.textContent = 'ДовгаНазваДосягнення'.repeat(12)
    })
    await first
      .locator('.achievement-card__description')
      .evaluate((description) => {
        description.textContent =
          'Кожна маленька історія починається зі слова. '.repeat(12)
      })
    await noOverflow(page)
  })
}

test('read-only achievement cards add no fake keyboard actions or notification regions', async ({
  page,
}) => {
  await page.goto('/tests/fixtures/achievement-cards.html')
  const before = page.getByRole('button', { name: 'Before cards' })
  const after = page.getByRole('button', { name: 'After cards' })
  await before.focus()
  await page.keyboard.press('Tab')
  await expect(after).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(before).toBeFocused()
  await expect(page.getByRole('article').getByRole('button')).toHaveCount(0)
  await expect(page.getByRole('article').locator('[tabindex]')).toHaveCount(0)
  await expect(page.getByRole('status')).toHaveCount(0)
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('forced colors preserve readable status and reduced motion removes card transitions', async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 320, height: 850 })
  await page.goto('/tests/fixtures/achievement-cards.html')
  const saved = page.getByRole('article', { name: 'Goal Keeper' })
  await expect(saved.getByText('Unlocked', { exact: true })).toBeVisible()
  const locked = page.getByRole('article', { name: 'First Words' })
  await expect(locked.getByText('Locked', { exact: true })).toBeVisible()
  expect(
    await saved
      .locator('.achievement-card__surface')
      .evaluate((element) => getComputedStyle(element).transitionDuration),
  ).toBe('0s')
  expect(
    await locked
      .locator('.progress-bar__fill')
      .evaluate((element) => getComputedStyle(element).transitionDuration),
  ).toBe('0s')
  await noOverflow(page)
  await page.addStyleTag({ content: 'html { font-size: 200%; }' })
  await noOverflow(page)
})
