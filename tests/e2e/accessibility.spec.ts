import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
}

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(results.violations).toEqual([])
}

for (const viewport of [
  { width: 640, height: 480 },
  { width: 1100, height: 760 },
  { width: 1440, height: 900 },
  { width: 320, height: 800 },
]) {
  test(`app and primitives reflow at ${viewport.width}x${viewport.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: 'My Library', exact: true }),
    ).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await page.screenshot({
      path: testInfo.outputPath('app.png'),
      fullPage: true,
    })
    await page.locator('.library-page-header').screenshot({
      path: testInfo.outputPath('library-header.png'),
    })
    await page.addStyleTag({ content: 'html { font-size: 200%; }' })
    await expectNoHorizontalOverflow(page)
    await page.locator('.library-page-header').screenshot({
      path: testInfo.outputPath('library-header-200.png'),
    })
    await page.goto('/tests/fixtures/components.html')
    await expect(
      page.getByRole('progressbar', { name: 'Book progress' }),
    ).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await page.screenshot({
      path: testInfo.outputPath('components.png'),
      fullPage: true,
    })
  })
}

test('skip link and all section destinations work with real browser keyboard input', async ({
  page,
}) => {
  const titles = [
    'My Library',
    'Writing Editor',
    'Goals & Deadlines',
    'Activity Calendar',
    'Achievements',
  ]
  for (const [index, title] of titles.entries()) {
    await page.goto('/')
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Skip to content' })
    await expect(skip).toBeFocused()
    await expect(skip).toBeInViewport()
    for (let step = 0; step <= index; step += 1)
      await page.keyboard.press('Tab')
    await expect(
      page.getByRole('button', { name: title, exact: true }),
    ).toBeFocused()
    await page.keyboard.press(index % 2 ? 'Space' : 'Enter')
    const heading = page.getByRole('heading', { name: title, exact: true })
    await expect(heading).toBeVisible()
    if (index > 0) await expect(heading).toBeFocused()
    await expect(page.locator('nav button[aria-current="page"]')).toHaveCount(1)
  }
  await page.goto('/')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('main')).toBeFocused()
})

test('all sections pass automated WCAG checks', async ({ page }) => {
  await page.goto('/')
  for (const title of [
    'My Library',
    'Writing Editor',
    'Goals & Deadlines',
    'Activity Calendar',
    'Achievements',
  ]) {
    await page.getByRole('button', { name: title, exact: true }).click()
    await expectAccessible(page)
  }
})

test('primitives and open modal pass automated WCAG checks with no runtime errors', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/tests/fixtures/components.html')
  await expect(
    page.getByRole('heading', { name: 'Component verification' }),
  ).toBeVisible()
  await expectAccessible(page)
  await page.getByRole('button', { name: 'Open modal' }).click()
  await expect(
    page.getByRole('dialog', { name: 'Dialog details' }),
  ).toBeVisible()
  await expectAccessible(page)
  expect(errors).toEqual([])
})

for (const width of [320, 640]) {
  test(`modal focus, scrolling and Escape restore at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 480 })
    await page.goto('/tests/fixtures/components.html')
    const trigger = page.getByRole('button', { name: 'Open modal' })
    await trigger.click()
    const close = page.getByRole('button', { name: 'Close', exact: true })
    const finish = page.getByRole('button', { name: 'Finish preview' })
    await expect(close).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(finish).toBeFocused()
    await expect(close).toBeInViewport()
    await page.keyboard.press('Tab')
    await expect(close).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(
      page.getByRole('textbox', { name: 'Dialog title' }),
    ).toBeFocused()
    await expectNoHorizontalOverflow(page)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(trigger).toBeFocused()
  })
}

test('text enlargement reflows the app and modal', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 480 })
  for (const path of ['/', '/tests/fixtures/components.html']) {
    await page.goto(path)
    await page.addStyleTag({ content: 'html { font-size: 200%; }' })
    await expectNoHorizontalOverflow(page)
  }
  await page.getByRole('button', { name: 'Open modal' }).click()
  await expect(
    page.getByRole('button', { name: 'Close', exact: true }),
  ).toBeInViewport()
  await expectNoHorizontalOverflow(page)
})

test('progress remains distinguishable in Windows forced colors', async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' })
  await page.goto('/tests/fixtures/components.html')
  const progress = page.getByRole('progressbar', { name: 'Book progress' })
  const colors = await progress.evaluate((element) => ({
    track: getComputedStyle(element).backgroundColor,
    fill: getComputedStyle(element.firstElementChild!).backgroundColor,
  }))
  expect(colors.fill).not.toBe(colors.track)
})

test('native buttons and fields retain focus visibility and disabled/read-only behavior', async ({
  page,
}) => {
  await page.goto('/tests/fixtures/components.html')
  await page.keyboard.press('Tab')
  const primary = page.getByRole('button', {
    name: 'Primary action',
    exact: true,
  })
  await expect(primary).toBeFocused()
  // Guard the real styled integration, not only the presence of semantic nodes.
  const appearance = await primary.evaluate((element) => ({
    background: getComputedStyle(element).backgroundColor,
    padding: parseFloat(getComputedStyle(element).paddingLeft),
  }))
  expect(appearance.background).not.toBe('rgba(0, 0, 0, 0)')
  expect(appearance.padding).toBeGreaterThan(0)
  await expect(
    page.getByRole('textbox', { name: 'Title', exact: true }),
  ).toHaveCSS('border-top-width', '1px')
  expect(
    await primary.evaluate((element) => getComputedStyle(element).outlineWidth),
  ).toBe('2px')
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('button', { name: 'Secondary action' }),
  ).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Quiet action' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('textbox', { name: 'Title', exact: true }),
  ).toBeFocused()
  await page.keyboard.type('A story')
  await expect(
    page.getByRole('textbox', { name: 'Title', exact: true }),
  ).toHaveValue('A story')
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('textbox', { name: 'Required title' }),
  ).toBeFocused()
  await page.keyboard.press('Tab')
  const reference = page.getByRole('textbox', {
    name: 'Reference',
    exact: true,
  })
  await expect(reference).toBeFocused()
  await page.keyboard.type('Changed')
  await expect(reference).toHaveValue('Read-only reference')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Open modal' })).toBeFocused()
})
