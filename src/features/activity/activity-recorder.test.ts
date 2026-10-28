import { afterEach, expect, test, vi } from 'vitest'
import {
  ActivityRecorder,
  captureActivityContext,
  ACTIVITY_MAX_SEGMENTS,
} from './activity-recorder'
import type { ActivityContext } from './activity'

afterEach(() => vi.restoreAllMocks())
const context: ActivityContext = {
  localDate: '2026-10-28',
  timeZone: 'Etc/UTC',
  utcOffsetMinutes: 0,
  dailyWordGoal: 500,
  scheduled: true,
}

test('captures local fields and east-positive offsets with an offset-only fallback', () => {
  const date = new Date(2026, 9, 28, 12)
  expect(captureActivityContext(500, date)).toMatchObject({
    localDate: '2026-10-28',
    utcOffsetMinutes: -date.getTimezoneOffset(),
    dailyWordGoal: 500,
    scheduled: true,
  })
  vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
    throw new Error('Unavailable')
  })
  expect(captureActivityContext(null, date).timeZone).toBeNull()
  expect(() => captureActivityContext(null, new Date(NaN))).toThrow()
})

test('same context batches net endpoints and first/last edit instants', () => {
  const recorder = new ActivityRecorder(10)
  recorder.record(15, context, new Date('2026-10-28T12:00:00Z'))
  recorder.record(12, context, new Date('2026-10-28T12:01:00Z'))
  const operation = recorder.take()
  expect(operation.segments).toHaveLength(1)
  expect(operation.segments[0]).toMatchObject({
    beforeWords: 10,
    afterWords: 12,
    firstEditedAt: '2026-10-28T12:00:00.000Z',
    lastEditedAt: '2026-10-28T12:01:00.000Z',
  })
  expect(operation.operationId).toMatch(/^[0-9a-f-]{36}$/)
})

test('date, timezone, DST offset, goal and schedule changes close the current segment', () => {
  for (const changed of [
    { localDate: '2026-10-29' },
    { timeZone: 'Europe/Kyiv' },
    { utcOffsetMinutes: 60 },
    { dailyWordGoal: 1000 },
    { scheduled: false },
  ]) {
    const recorder = new ActivityRecorder(10)
    recorder.record(20, context)
    recorder.record(15, { ...context, ...changed })
    expect(
      recorder
        .take()
        .segments.map(({ beforeWords, afterWords }) => [
          beforeWords,
          afterWords,
        ]),
    ).toEqual([
      [10, 20],
      [20, 15],
    ])
  }
})

test('taking an uncertain save isolates later edits and operations without resetting the baseline', () => {
  const recorder = new ActivityRecorder(0)
  recorder.record(2, context)
  const frozen = recorder.take()
  recorder.record(3, context)
  const queued = recorder.take()
  expect(frozen.segments[0].afterWords).toBe(2)
  expect(queued.segments[0]).toMatchObject({ beforeWords: 2, afterWords: 3 })
  expect(queued.operationId).not.toBe(frozen.operationId)
  expect(() => recorder.take()).toThrow()
})

test('invalid baselines and segment overflow fail without discarding recorded segments', () => {
  expect(() => new ActivityRecorder(null).record(10, context)).toThrow()
  const recorder = new ActivityRecorder(0)
  for (let index = 0; index < ACTIVITY_MAX_SEGMENTS; index++)
    recorder.record(index, { ...context, dailyWordGoal: index + 1 })
  expect(() =>
    recorder.record(999, { ...context, dailyWordGoal: 9999 }),
  ).toThrow()
  expect(recorder.take().segments).toHaveLength(ACTIVITY_MAX_SEGMENTS)
})

test('clock rollback preserves sequence rather than manufacturing duration or sorting edits', () => {
  const recorder = new ActivityRecorder(0)
  recorder.record(1, context, new Date('2026-10-28T12:01:00Z'))
  recorder.record(2, context, new Date('2026-10-28T12:00:00Z'))
  const segment = recorder.take().segments[0]
  expect(segment.firstEditedAt > segment.lastEditedAt).toBe(true)
  expect(segment.afterWords).toBe(2)
})
