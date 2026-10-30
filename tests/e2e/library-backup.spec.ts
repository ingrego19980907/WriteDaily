import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const width of [320, 1100]) {
  test(`library backup is keyboard accessible and reflows at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/tests/fixtures/library-backup.html')
    const region = page.getByRole('region', {
      name: 'Library backup',
      exact: true,
    })
    const button = region.getByRole('button', {
      name: /^(Back up library|Backing up…)$/,
    })
    await expect(button).toHaveAccessibleName('Back up library')
    await expect(
      page.getByRole('heading', { name: 'Your story starts here' }),
    ).toBeVisible()
    await expect(button).toHaveAccessibleDescription(
      /unsaved edits are not included/,
    )
    await page.bringToFront()
    await button.focus()
    await page.keyboard.press('Enter')
    await expect(button).toBeDisabled()
    await expect(region.getByRole('status')).toContainText(
      'Preparing a saved library snapshot',
    )
    await expect(region.getByText(/Backup saved:/)).toHaveCount(0)
    expect(
      await page.evaluate(() =>
        (
          window as unknown as { backupAttempts: () => number }
        ).backupAttempts(),
      ),
    ).toBe(1)
    await page.evaluate(() =>
      (window as unknown as { completeBackup: () => void }).completeBackup(),
    )
    await expect(region.getByRole('status')).toHaveText(
      'Backup saved: Моя бібліотека.zip. Books: 0; chapters: 0; covers: 0.',
    )
    await expect(button).toBeEnabled()
    await expect(button).toBeFocused()
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
    await button.focus()
    await expect(button).toBeFocused()
    await page.emulateMedia({ forcedColors: 'none' })
    await page.addStyleTag({ content: 'html{font-size:100%}' })
    await region.scrollIntoViewIfNeeded()
    await page.screenshot({
      path: testInfo.outputPath('library-backup.png'),
      fullPage: true,
    })
  })
}
test('cancelled and failed backups remain retryable without claiming a file or exposing paths', async ({
  page,
}) => {
  for (const scenario of ['cancel', 'failure']) {
    await page.goto(`/tests/fixtures/library-backup.html?scenario=${scenario}`)
    const region = page.getByRole('region', {
      name: 'Library backup',
      exact: true,
    })
    const button = region.getByRole('button', {
      name: 'Back up library',
      exact: true,
    })
    await button.click()
    await expect(region.getByText(/Backup saved:/)).toHaveCount(0)
    if (scenario === 'cancel')
      await expect(region.getByRole('status')).toContainText(
        'Backup cancelled.',
      )
    else {
      await expect(region.getByRole('alert')).toContainText(
        'No backup was created.',
      )
      await expect(region.getByRole('alert')).not.toContainText('C:\\private')
    }
    await button.click()
    await expect(region.getByRole('status')).toContainText(
      'Backup saved: Моя бібліотека.zip.',
    )
  }
})
test('ordinary browser preview explains the desktop requirement without a fake download', async ({
  page,
}) => {
  await page.goto('/tests/fixtures/library-backup.html?scenario=browser')
  const region = page.getByRole('region', {
    name: 'Library backup',
    exact: true,
  })
  await region
    .getByRole('button', { name: 'Back up library', exact: true })
    .click()
  await expect(region.getByRole('alert')).toHaveText(
    'Open the desktop app to back up your library.',
  )
  expect(
    await page.evaluate(() =>
      (window as unknown as { backupAttempts: () => number }).backupAttempts(),
    ),
  ).toBe(0)
})
