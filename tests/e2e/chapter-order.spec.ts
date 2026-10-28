import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const width of [320, 640, 1100]) {
  test(`chapter drag order persists through reload and supports keyboard at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 850 })
    await page.goto('/tests/fixtures/chapters.html?scenario=reorder')
    await page.getByRole('button', { name: 'Open book', exact: true }).click()
    const list = page.getByRole('list', { name: 'Chapters', exact: true })
    const rows = list.getByRole('listitem')
    const order = () =>
      rows
        .getByRole('heading')
        .evaluateAll((items) => items.map((item) => item.id))
    await expect(rows).toHaveCount(2)
    const original = await order()
    const create = page.getByRole('button', {
      name: 'Create chapter',
      exact: true,
    })
    const reload = page.getByRole('button', {
      name: 'Reload chapters',
      exact: true,
    })
    await expect(reload).toHaveText('')
    const createBox = await create.boundingBox()
    const reloadBox = await reload.boundingBox()
    expect(Math.abs(createBox!.y - reloadBox!.y)).toBeLessThan(10)
    expect(reloadBox!.x).toBeGreaterThan(createBox!.x)
    await rows.last().scrollIntoViewIfNeeded()
    await rows
      .first()
      .getByTitle('Drag to reorder chapter')
      .dragTo(rows.last(), { targetPosition: { x: 10, y: 10 } })
    await expect(
      page.getByText('Chapter order saved.', { exact: true }),
    ).toBeVisible()
    expect(await order()).toEqual([...original].reverse())
    await reload.click()
    await expect(rows).toHaveCount(2)
    expect(await order()).toEqual([...original].reverse())
    const moveUp = rows
      .last()
      .getByRole('button', { name: /^Move chapter up:/ })
    await moveUp.focus()
    await page.keyboard.press('Enter')
    await expect(rows.first().getByRole('heading')).toHaveAttribute(
      'id',
      original[0],
    )
    await expect(rows.first().getByRole('heading')).toBeFocused()
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
    ).toEqual([])
    await page.addStyleTag({ content: 'html{font-size:200%;}' })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
  })
}

test('reorder keeps the old order until commit and locks competing writes', async ({
  page,
}) => {
  await page.goto('/tests/fixtures/chapters.html?scenario=reorder-pending')
  await page.getByRole('button', { name: 'Open book', exact: true }).click()
  const rows = page
    .getByRole('list', { name: 'Chapters', exact: true })
    .getByRole('listitem')
  const id = await rows.first().getByRole('heading').getAttribute('id')
  await rows
    .first()
    .getByRole('button', { name: /^Move chapter down:/ })
    .click()
  await expect(
    page.getByText('Saving chapter order...', { exact: true }),
  ).toBeVisible()
  await expect(rows.first().getByRole('heading')).toHaveAttribute('id', id!)
  await expect(
    page.getByRole('button', { name: 'Reload chapters', exact: true }),
  ).toBeDisabled()
  await expect(
    page.getByRole('button', { name: 'Create chapter', exact: true }),
  ).toBeDisabled()
  await page.evaluate(() =>
    (
      window as unknown as { completeTestReorder: () => void }
    ).completeTestReorder(),
  )
  await expect(
    page.getByText('Chapter order saved.', { exact: true }),
  ).toBeVisible()
  await expect(rows.last().getByRole('heading')).toHaveAttribute('id', id!)
})

test('a revision conflict retains order and reload gets revisions for a successful retry', async ({
  page,
}) => {
  await page.goto('/tests/fixtures/chapters.html?scenario=reorder-conflict')
  await page.getByRole('button', { name: 'Open book', exact: true }).click()
  const rows = page
    .getByRole('list', { name: 'Chapters', exact: true })
    .getByRole('listitem')
  const id = await rows.first().getByRole('heading').getAttribute('id')
  await rows
    .first()
    .getByRole('button', { name: /^Move chapter down:/ })
    .click()
  await expect(page.getByRole('alert')).toContainText(
    'Chapters changed elsewhere.',
  )
  await expect(rows.first().getByRole('heading')).toHaveAttribute('id', id!)
  await page
    .getByRole('button', { name: 'Reload chapters', exact: true })
    .click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await rows
    .first()
    .getByRole('button', { name: /^Move chapter down:/ })
    .click()
  await expect(
    page.getByText('Chapter order saved.', { exact: true }),
  ).toBeVisible()
  await expect(rows.last().getByRole('heading')).toHaveAttribute('id', id!)
})
