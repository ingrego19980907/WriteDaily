import { useEffect, useState } from 'react'
import { localCalendarDate } from '../utils/calendar-date'

/** Refresh at local midnight/on resume; poll each minute for clock/timezone changes while active. */
export function useLocalCalendarDate() {
  const [today, setToday] = useState(() => localCalendarDate(new Date()))
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const refresh = () => {
      clearTimeout(timer)
      const now = new Date()
      setToday(localCalendarDate(now))
      const midnight = new Date(now.getTime())
      midnight.setHours(24, 0, 0, 0)
      const wait = midnight.getTime() - now.getTime()
      timer = setTimeout(
        refresh,
        Number.isFinite(wait)
          ? Math.min(60_000, Math.max(25, wait + 25))
          : 60_000,
      )
    }
    const visible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    refresh()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', visible)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [])
  return today
}
