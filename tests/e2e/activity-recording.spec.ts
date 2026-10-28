import { expect, test, type Page } from '@playwright/test'
import type { ActivitySubmission } from '../../src/features/activity/activity'
import { startWriting } from './editor-mode'

test.use({ timezoneId: 'UTC' })
async function open(page: Page, scenario: string) {
  await page.goto(`/tests/fixtures/chapters.html?scenario=${scenario}`)
  await page.getByRole('button', { name: 'Open book', exact: true }).click()
  await page
    .getByRole('button', { name: 'Edit chapter text', exact: true })
    .last()
    .click()
  await startWriting(page)
  await page.clock.install({ time: new Date('2026-10-27T23:59:58Z') })
  await page.clock.pauseAt(new Date('2026-10-27T23:59:59Z'))
  return page.getByRole('textbox', { name: 'Chapter manuscript' })
}
async function events(page: Page) {
  return page.evaluate(() =>
    (
      window as unknown as { testActivityEvents: () => ActivitySubmission[] }
    ).testActivityEvents(),
  )
}

test('edit-time midnight split travels with one save rather than adopting the save date', async ({
  page,
}) => {
  const field = await open(page, 'activity-recording')
  await field.fill('one two')
  await page.clock.runFor(1500)
  await field.fill('one')
  await page
    .getByRole('button', { name: 'Save chapter text', exact: true })
    .click()
  await expect(
    page.getByRole('status', { name: 'Save status', exact: true }),
  ).toHaveText('Chapter text saved.')
  const saved = await events(page)
  expect(saved).toHaveLength(1)
  expect(saved[0].segments).toMatchObject([
    {
      context: { localDate: '2026-10-27', utcOffsetMinutes: 0 },
      beforeWords: 0,
      afterWords: 2,
    },
    {
      context: { localDate: '2026-10-28', utcOffsetMinutes: 0 },
      beforeWords: 2,
      afterWords: 1,
    },
  ])
})

test('pending writes expose no committed activity and cannot announce saved', async ({
  page,
}) => {
  const field = await open(page, 'activity-pending')
  await field.fill('one two')
  await page.clock.runFor(2000)
  expect(await events(page)).toHaveLength(0)
  await expect(field).toHaveAttribute('contenteditable', 'false')
  await expect(
    page.getByRole('status', { name: 'Save status', exact: true }),
  ).toContainText('Saving')
  await page.evaluate(() =>
    (window as unknown as { completeTestSave: () => void }).completeTestSave(),
  )
  await expect(
    page.getByRole('status', { name: 'Save status', exact: true }),
  ).toHaveText('Chapter text saved.')
  expect(await events(page)).toHaveLength(1)
})

test('lost commit response retries the frozen operation before separately committing further edits', async ({
  page,
}) => {
  const field = await open(page, 'activity-lost-response')
  await field.fill('one two')
  await page.clock.runFor(2000)
  await expect(page.getByRole('alert')).toContainText('Could not save')
  expect(await events(page)).toHaveLength(1)
  await field.fill('one two three')
  await page
    .getByRole('button', { name: 'Save chapter text', exact: true })
    .click()
  await expect(
    page.getByRole('status', { name: 'Save status', exact: true }),
  ).toHaveText('Chapter text saved.')
  const requests = await page.evaluate(() =>
    (
      window as unknown as { testActivityRequests: () => ActivitySubmission[] }
    ).testActivityRequests(),
  )
  expect(requests).toHaveLength(3)
  expect(requests[1]).toEqual(requests[0])
  expect(requests[2].operationId).not.toBe(requests[0].operationId)
  expect(requests[2].segments[0]).toMatchObject({
    beforeWords: 2,
    afterWords: 3,
  })
  expect(await events(page)).toHaveLength(2)
  await expect(field).toHaveText('one two three')
})
