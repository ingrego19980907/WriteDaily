import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('the complete library reflows while the window is resized', async ({
  page,
}, testInfo) => {
  await page.clock.install({ time: new Date('2026-10-28T12:00:00Z') })
  await page.goto('/tests/fixtures/writing-statistics.html')
  await expect(
    page.getByRole('list', { name: 'Books', exact: true }).getByRole('article'),
  ).toHaveCount(2)
  for (const width of [1440, 1100, 640, 320, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    const books = page.getByRole('list', { name: 'Books', exact: true })
    const cards = books.getByRole('article')
    const grid = page.getByRole('button', { name: 'Grid view', exact: true })
    await expect(grid).toHaveAttribute('aria-pressed', 'true')
    const firstCard = (await cards.first().boundingBox())!
    const history = (await page.locator('.library-history').boundingBox())!
    expect(history.y).toBeGreaterThanOrEqual(
      (await books.boundingBox())!.y + (await books.boundingBox())!.height,
    )
    if (width >= 1100) expect(firstCard.y).toBeLessThan(600)
    if (width === 320) {
      expect(
        await page
          .getByRole('group', { name: 'Filter books' })
          .evaluate(
            (element) =>
              getComputedStyle(element).gridTemplateColumns.split(' ').length,
          ),
      ).toBe(2)
      const views = (await page
        .getByRole('group', { name: 'Book view' })
        .boundingBox())!
      const create = (await page
        .getByRole('button', { name: 'New Book', exact: true })
        .boundingBox())!
      expect(
        Math.abs(views.y + views.height / 2 - create.y - create.height / 2),
      ).toBeLessThan(2)
    }
    if (width === 1440) {
      const secondCard = (await cards.nth(1).boundingBox())!
      expect(secondCard.y).toBeCloseTo(firstCard.y, 0)
      expect(secondCard.height).toBeCloseTo(firstCard.height, 0)
      expect(
        (await cards
          .first()
          .getByRole('button', { name: 'Open book', exact: true })
          .boundingBox())!.y,
      ).toBeCloseTo(
        (await cards
          .nth(1)
          .getByRole('button', { name: 'Open book', exact: true })
          .boundingBox())!.y,
        0,
      )
    }
    for (const card of await cards.all()) {
      const frame = (await card.locator('.library-cover__frame').boundingBox())!
      expect(frame.height / frame.width).toBeCloseTo(4 / 3, 1)
    }
    await page.screenshot({
      path: testInfo.outputPath(`library-${width}.png`),
      fullPage: true,
    })
  }
  const trigger = page
    .getByRole('button', { name: 'Book actions', exact: true })
    .first()
  await trigger.click()
  await page.setViewportSize({ width: 320, height: 550 })
  const menu = page.locator('.book-card__menu-panel:not([hidden])')
  const box = (await menu.boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(8)
  expect(box.x + box.width).toBeLessThanOrEqual(312)
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
})

test('Unicode titles, maximum counts and interactive states stay readable across resizing', async ({
  page,
}, testInfo) => {
  await page.clock.install({ time: new Date('2026-10-28T12:00:00Z') })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/tests/fixtures/writing-statistics.html?polish')
  const cards = page
    .getByRole('list', { name: 'Books', exact: true })
    .getByRole('article')
  await expect(cards).toHaveCount(4)
  const selectedFilter = page.getByRole('button', {
    name: 'All Books 4 books',
    exact: true,
  })
  await selectedFilter.hover()
  await page.waitForTimeout(200)
  expect(
    await selectedFilter.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    ),
  ).toBe('rgb(92, 71, 50)')
  expect(
    await selectedFilter.evaluate((element) => getComputedStyle(element).color),
  ).toBe('rgb(255, 254, 250)')
  const selectedPage = page.getByRole('button', {
    name: 'My Library',
    exact: true,
  })
  await selectedPage.hover()
  await page.waitForTimeout(200)
  await expect(selectedPage).toHaveAttribute('aria-current', 'page')
  expect(
    await selectedPage.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    ),
  ).toBe('rgb(232, 226, 217)')
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
    ).violations,
  ).toEqual([])
  await expect(
    cards
      .nth(1)
      .getByText('9,007,199,254,740,991 / 9,007,199,254,740,991 words', {
        exact: true,
      }),
  ).toBeVisible()
  await expect(
    cards.nth(1).getByRole('img', { name: 'Book cover' }),
  ).toBeVisible()
  await expect(cards.nth(2).getByLabel('Book deadline')).toContainText(
    'overdue',
  )
  const title = cards.nth(1).getByRole('heading')
  const collapsedHeight = (await title.boundingBox())!.height
  const fullTitle = await title.textContent()
  await title.focus()
  expect((await title.boundingBox())!.height).toBeGreaterThan(collapsedHeight)
  expect(await title.textContent()).toBe(fullTitle)
  expect(
    await title.evaluate((element) => getComputedStyle(element).outlineStyle),
  ).not.toBe('none')
  await cards
    .first()
    .getByRole('button', { name: 'Open book', exact: true })
    .hover()
  await page.waitForTimeout(200)
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
    ).violations,
  ).toEqual([])
  await page.screenshot({
    path: testInfo.outputPath('library-unicode.png'),
    fullPage: true,
  })
  for (const width of [1100, 640, 320]) {
    await page.setViewportSize({ width, height: 850 })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await expect(
      cards
        .nth(1)
        .getByText('9,007,199,254,740,991 / 9,007,199,254,740,991 words', {
          exact: true,
        }),
    ).toBeVisible()
  }
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
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
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' })
  const open = cards
    .first()
    .getByRole('button', { name: 'Open book', exact: true })
  await open.focus()
  expect(
    await open.evaluate((element) => getComputedStyle(element).outlineStyle),
  ).not.toBe('none')
  expect(
    await open.evaluate(
      (element) => getComputedStyle(element).transitionDuration,
    ),
  ).toBe('0s')
  expect(
    await cards
      .first()
      .evaluate((element) => getComputedStyle(element).transitionDuration),
  ).toBe('0s')
  await selectedFilter.hover()
  expect(
    await selectedFilter.evaluate(
      (element) =>
        getComputedStyle(element).color !==
        getComputedStyle(element).backgroundColor,
    ),
  ).toBe(true)
})
