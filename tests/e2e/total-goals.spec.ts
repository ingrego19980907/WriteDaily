import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { startWriting } from './editor-mode'

for (const width of [320, 640, 1100]) {
  test(`total targets validate, reach, increase and clear at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 850 })
    await page.goto('/tests/fixtures/book-editing.html?total-goals')
    const card = page.getByRole('article')
    const edit = async () => {
      await card
        .getByRole('button', { name: 'Book actions', exact: true })
        .click()
      await card.getByRole('button', { name: 'Edit book', exact: true }).click()
    }
    const save = () =>
      page.getByRole('button', { name: 'Save changes', exact: true }).click()
    const input = page.getByLabel('Target word count (optional)', {
      exact: true,
    })
    await edit()
    await expect(input).toHaveAccessibleDescription(/Leave blank to remove/)
    for (const value of ['0', '-1', '1.5', '9007199254740992']) {
      await input.fill(value)
      await save()
      await expect(input).toHaveAttribute('aria-invalid', 'true')
    }
    await input.fill('1000')
    await page.keyboard.press('Escape')
    await expect(
      card.getByText('Word target reached', { exact: true }),
    ).toHaveCount(0)
    await edit()
    await expect(input).toHaveValue('1000')
    await save()
    await expect(
      card.getByText('Word target reached', { exact: true }),
    ).toBeVisible()
    await expect(card.getByText('Completed', { exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Open book', exact: true }).click()
    await expect(
      page
        .getByRole('region', { name: 'A quiet story', exact: true })
        .getByText('Word target reached', { exact: true }),
    ).toBeVisible()
    await page
      .getByRole('button', { name: 'Back to library', exact: true })
      .click()
    await edit()
    await input.fill('1500')
    await save()
    await expect(
      card.getByText('Word target reached', { exact: true }),
    ).toHaveCount(0)
    await expect(
      card.getByText('500 words remaining', { exact: true }),
    ).toBeVisible()
    await edit()
    await input.fill('500')
    await save()
    await expect(
      card.getByText('Word target reached', { exact: true }),
    ).toBeVisible()
    await expect(
      card.getByText('500 words above target', { exact: true }),
    ).toBeVisible()
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
    ).toEqual([])
    await edit()
    await expect(input).toHaveValue('500')
    await input.fill('')
    await save()
    await expect(
      card.getByText('No word target', { exact: true }),
    ).toBeVisible()
    await expect(card.getByRole('progressbar')).toHaveCount(0)
    await edit()
    await expect(input).toHaveValue('')
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Open book', exact: true }).click()
    await expect(
      page
        .getByRole('region', { name: 'A quiet story', exact: true })
        .getByText('No word target', { exact: true }),
    ).toBeVisible()
    await page.addStyleTag({ content: 'html{font-size:200%;}' })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
  })
}

for (const scenario of ['goal-pending', 'goal-failure']) {
  test(`goal achievement waits for content commit and resets after deletion: ${scenario}`, async ({
    page,
  }) => {
    await page.goto(`/tests/fixtures/chapters.html?scenario=${scenario}`)
    await page.getByRole('button', { name: 'Open book', exact: true }).click()
    const region = page.locator('section[aria-label="A quiet story"]')
    await expect(
      region.getByText('2 words remaining', { exact: true }),
    ).toBeVisible()
    await page
      .getByRole('button', { name: 'Edit chapter text', exact: true })
      .last()
      .click()
    await startWriting(page)
    await page.clock.install({ time: new Date('2026-10-27T10:00:00Z') })
    await page.clock.pauseAt(new Date('2026-10-27T10:01:00Z'))
    const field = page.getByRole('textbox', { name: 'Chapter manuscript' })
    await field.fill('two words')
    await expect(
      region.getByText('Word target reached', { exact: true }),
    ).toHaveCount(0)
    await page.clock.runFor(2000)
    await expect(
      region.getByText('Word target reached', { exact: true }),
    ).toHaveCount(0)
    if (scenario === 'goal-pending')
      await page.evaluate(() =>
        (
          window as unknown as { completeTestSave: () => void }
        ).completeTestSave(),
      )
    else {
      await expect(page.getByRole('alert')).toContainText('Could not save')
      await page
        .getByRole('button', { name: 'Save chapter text', exact: true })
        .click()
    }
    await expect(
      page.getByRole('status', { name: 'Save status', exact: true }),
    ).toHaveText('Chapter text saved.')
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Close', exact: true })
      .click()
    await expect(
      region.getByText('Word target reached', { exact: true }),
    ).toBeVisible()
    await page
      .getByRole('list', { name: 'Chapters', exact: true })
      .getByRole('button', { name: 'Delete chapter', exact: true })
      .last()
      .click()
    await page.getByRole('dialog').getByRole('checkbox').check()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Delete chapter', exact: true })
      .click()
    await expect(
      region.getByText('Word target reached', { exact: true }),
    ).toHaveCount(0)
    await expect(
      region.getByText('2 words remaining', { exact: true }),
    ).toBeVisible()
  })
}
