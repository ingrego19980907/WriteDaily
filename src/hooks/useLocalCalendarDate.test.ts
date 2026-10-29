import { act, fireEvent, renderHook } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { useLocalCalendarDate } from './useLocalCalendarDate'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})
test('refreshes after local midnight and removes its timer on unmount', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 27, 23, 59, 50))
  const { result, unmount } = renderHook(() => useLocalCalendarDate())
  expect(result.current).toBe('2026-10-27')
  act(() => vi.advanceTimersByTime(20_000))
  expect(result.current).toBe('2026-10-28')
  unmount()
  expect(vi.getTimerCount()).toBe(0)
})
test('resume and polling follow calendar changes without a remount', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 27, 10))
  const { result } = renderHook(() => useLocalCalendarDate())
  vi.setSystemTime(new Date(2026, 9, 30, 10))
  fireEvent.focus(window)
  expect(result.current).toBe('2026-10-30')
  vi.setSystemTime(new Date(2026, 10, 1, 10))
  act(() => vi.advanceTimersByTime(60_000))
  expect(result.current).toBe('2026-11-01')
})

test('a backward date adjustment refreshes without retaining a future today', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 10, 1, 12))
  const { result, unmount } = renderHook(() => useLocalCalendarDate())
  vi.setSystemTime(new Date(2026, 9, 31, 12))
  act(() => vi.advanceTimersByTime(60_000))
  expect(result.current).toBe('2026-10-31')
  vi.setSystemTime(new Date(2026, 9, 27, 12))
  fireEvent.focus(window)
  expect(result.current).toBe('2026-10-27')
  expect(vi.getTimerCount()).toBe(1)
  unmount()
  expect(vi.getTimerCount()).toBe(0)
})

test('returning from a hidden page refreshes a slept-through year boundary immediately', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 11, 31, 23, 50))
  const visibility = vi
    .spyOn(document, 'visibilityState', 'get')
    .mockReturnValue('hidden')
  const { result, unmount } = renderHook(() => useLocalCalendarDate())
  vi.setSystemTime(new Date(2027, 0, 2, 9))
  fireEvent(document, new Event('visibilitychange'))
  expect(result.current).toBe('2026-12-31')
  visibility.mockReturnValue('visible')
  fireEvent(document, new Event('visibilitychange'))
  expect(result.current).toBe('2027-01-02')
  expect(vi.getTimerCount()).toBe(1)
  unmount()
  expect(vi.getTimerCount()).toBe(0)
})
