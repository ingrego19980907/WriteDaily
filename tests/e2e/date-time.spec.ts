import { expect, test, type Page } from '@playwright/test'
import cases from '../fixtures/date-time-cases.json' with { type: 'json' }
import type { DateTimeAudit } from '../fixtures/date-time'
import type { ActivitySubmission } from '../../src/features/activity/activity'
import { startWriting } from './editor-mode'

type AuditWindow = Window & { dateTimeAudit: DateTimeAudit }
for (const scenario of cases) {
  test(`calendar timezone matrix: ${scenario.name}`, async ({
    page,
    context,
  }) => {
    // Overrides only this browser target; never change the host's timezone/clock.
    const session = await context.newCDPSession(page)
    await page.clock.install({ time: new Date(scenario.points[0].instant) })
    await session.send('Emulation.setTimezoneOverride', {
      timezoneId: scenario.points[0].timeZone,
    })
    await page.goto('/tests/fixtures/date-time.html')
    for (const [index, point] of scenario.points.entries()) {
      await session.send('Emulation.setTimezoneOverride', {
        timezoneId: point.timeZone,
      })
      const snapshot = await page.evaluate(
        ({ point, words }) => {
          const audit = (window as unknown as AuditWindow).dateTimeAudit
          const value = audit.snapshot(point.instant)
          audit.record(point.instant, words)
          return {
            ...value,
            expectedZone: new Intl.DateTimeFormat('en', {
              timeZone: point.timeZone,
            }).resolvedOptions().timeZone,
          }
        },
        { point, words: index + 1 },
      )
      expect(snapshot.context).toMatchObject({
        localDate: point.localDate,
        timeZone: snapshot.expectedZone,
      })
      expect(snapshot.context.utcOffsetMinutes + 0).toBe(point.offset)
      expect(snapshot.weekendScheduled).toBe([0, 6].includes(snapshot.weekday))
      expect(snapshot.displayDate).toBe(
        new Intl.DateTimeFormat('en', {
          dateStyle: 'medium',
          timeZone: 'UTC',
        }).format(new Date(`${point.localDate}T12:00:00Z`)),
      )
      expect([snapshot.hour, snapshot.minute]).toEqual([
        point.hour,
        point.minute,
      ])
      expect(snapshot.civilDistance).toBe(1)
      expect(snapshot.deadline).toMatchObject({ kind: 'upcoming', days: 1 })
      expect(snapshot.pace).toMatchObject({
        kind: 'ready',
        writingDays: 2,
        wordsPerDay: 50,
      })
      if (scenario.dayWindow)
        expect(snapshot.hoursInDay).toBe(scenario.dayWindow.hours)
    }
    // Save later: taking the operation must retain edit-time days, offsets and order.
    await page.clock.setSystemTime(new Date('2027-02-01T12:00:00Z'))
    const result = await page.evaluate(() =>
      (window as unknown as AuditWindow).dateTimeAudit.take(),
    )
    expect(result.operation.segments).toHaveLength(scenario.expectedSegments)
    expect(result.operation.segments[0].beforeWords).toBe(0)
    expect(result.operation.segments.at(-1)?.afterWords).toBe(
      scenario.points.length,
    )
    expect(result.operation.segments[0].firstEditedAt).toBe(
      scenario.points[0].instant,
    )
    expect(result.operation.segments.at(-1)?.lastEditedAt).toBe(
      scenario.points.at(-1)?.instant,
    )
    expect(result.credits).toEqual(scenario.expectedDayCredits)
    if (scenario.dayWindow) {
      const beforeMidnight = new Date(Date.parse(scenario.dayWindow.end) - 1000)
      await page.clock.setSystemTime(beforeMidnight)
      await page.evaluate(() => window.dispatchEvent(new Event('focus')))
      const before = scenario.points[0].localDate
      await expect(page.getByLabel('Observed local date')).toHaveText(before)
      await page.clock.runFor(1050)
      const expected = await page.evaluate(
        (instant) =>
          (window as unknown as AuditWindow).dateTimeAudit.snapshot(instant)
            .context.localDate,
        scenario.dayWindow.end,
      )
      await expect(page.getByLabel('Observed local date')).toHaveText(expected)
    }
  })
}

test('one mounted date hook follows date-line travel, polling, resume and backward clocks', async ({
  page,
  context,
}) => {
  const session = await context.newCDPSession(page)
  await session.send('Emulation.setTimezoneOverride', {
    timezoneId: 'Pacific/Pago_Pago',
  })
  await page.clock.install({ time: new Date('2024-03-01T10:00:00Z') })
  await page.goto('/tests/fixtures/date-time.html')
  const date = page.getByLabel('Observed local date')
  await expect(date).toHaveText('2024-02-29')
  await session.send('Emulation.setTimezoneOverride', {
    timezoneId: 'Pacific/Kiritimati',
  })
  await page.clock.runFor(60_050)
  await expect(date).toHaveText('2024-03-02')
  await session.send('Emulation.setTimezoneOverride', {
    timezoneId: 'Pacific/Pago_Pago',
  })
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(date).toHaveText('2024-02-29')
  await page.clock.setSystemTime(new Date('2025-01-02T12:00:00Z'))
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(date).toHaveText('2025-01-02')
  await page.clock.setSystemTime(new Date('2024-12-31T12:00:00Z'))
  await page.clock.runFor(60_050)
  await expect(date).toHaveText('2024-12-31')
})

async function openEditor(page: Page, scenario: string) {
  await page.goto(`/tests/fixtures/chapters.html?scenario=${scenario}`)
  await page.getByRole('button', { name: 'Open book', exact: true }).click()
  await page
    .getByRole('button', { name: 'Edit chapter text', exact: true })
    .last()
    .click()
  await startWriting(page)
  return page.getByRole('textbox', { name: 'Chapter manuscript' })
}
async function requests(page: Page) {
  return page.evaluate(() =>
    (
      window as unknown as { testActivityRequests: () => ActivitySubmission[] }
    ).testActivityRequests(),
  )
}

test('editor saves both sides of a real repeated DST hour as one operation', async ({
  page,
  context,
}) => {
  const session = await context.newCDPSession(page)
  await session.send('Emulation.setTimezoneOverride', {
    timezoneId: 'Europe/Kyiv',
  })
  const field = await openEditor(page, 'activity-recording')
  await page.clock.install({ time: new Date('2024-10-27T00:59:59Z') })
  await page.clock.pauseAt(new Date('2024-10-27T00:59:59Z'))
  await field.fill('one')
  await page.clock.runFor(1000)
  await field.fill('one two')
  await page
    .getByRole('button', { name: 'Save chapter text', exact: true })
    .click()
  await expect(
    page.getByRole('status', { name: 'Save status', exact: true }),
  ).toHaveText('Chapter text saved.')
  const saved = await requests(page)
  expect(saved).toHaveLength(1)
  expect(saved[0].segments).toMatchObject([
    {
      context: { localDate: '2024-10-27', utcOffsetMinutes: 180 },
      beforeWords: 0,
      afterWords: 1,
    },
    {
      context: { localDate: '2024-10-27', utcOffsetMinutes: 120 },
      beforeWords: 1,
      afterWords: 2,
    },
  ])
  await expect(field).toHaveText('one two')
})

test('an uncertain save retries its frozen day after travel before recording new-zone edits', async ({
  page,
  context,
}) => {
  const session = await context.newCDPSession(page)
  await session.send('Emulation.setTimezoneOverride', {
    timezoneId: 'Pacific/Kiritimati',
  })
  const field = await openEditor(page, 'activity-lost-response')
  await page.clock.install({ time: new Date('2024-03-01T10:00:00Z') })
  await page.clock.pauseAt(new Date('2024-03-01T10:00:00Z'))
  await field.fill('one two')
  await page.clock.runFor(2000)
  await expect(page.getByRole('alert')).toContainText('Could not save')
  await session.send('Emulation.setTimezoneOverride', {
    timezoneId: 'Pacific/Pago_Pago',
  })
  await field.fill('one two three')
  await page
    .getByRole('button', { name: 'Save chapter text', exact: true })
    .click()
  await expect(
    page.getByRole('status', { name: 'Save status', exact: true }),
  ).toHaveText('Chapter text saved.')
  const saved = await requests(page)
  expect(saved).toHaveLength(3)
  expect(saved[1]).toEqual(saved[0])
  expect(saved[0].segments[0].context).toMatchObject({
    localDate: '2024-03-02',
    utcOffsetMinutes: 840,
  })
  expect(saved[2].operationId).not.toBe(saved[0].operationId)
  expect(saved[2].segments[0]).toMatchObject({
    context: { localDate: '2024-02-29', utcOffsetMinutes: -660 },
    beforeWords: 2,
    afterWords: 3,
  })
  const events = await page.evaluate(() =>
    (
      window as unknown as { testActivityEvents: () => ActivitySubmission[] }
    ).testActivityEvents(),
  )
  expect(events).toHaveLength(2)
  await expect(field).toHaveText('one two three')
})
