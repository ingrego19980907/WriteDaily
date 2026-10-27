import { act, fireEvent, renderHook } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { useLocalCalendarDate } from './useLocalCalendarDate'

afterEach(() => vi.useRealTimers())
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
