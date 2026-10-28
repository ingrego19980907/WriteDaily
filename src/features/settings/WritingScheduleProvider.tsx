import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { getWritingSchedule } from '../../services/schedule'
import type { WritingSchedule } from './writing-schedule'

import {
  WritingScheduleContext as Context,
  type ScheduleState as State,
} from './writing-schedule-context'
export function WritingScheduleProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({
    data: null,
    failed: false,
    loading: true,
  })
  const request = useRef(0)
  const accept = useCallback((data: WritingSchedule) => {
    request.current++
    setState({ data, failed: false, loading: false })
  }, [])
  const load = useCallback(async () => {
    const version = ++request.current
    try {
      const data = await getWritingSchedule()
      if (request.current === version)
        setState({ data, failed: false, loading: false })
    } catch {
      if (request.current === version)
        setState({ data: null, failed: true, loading: false })
    }
  }, [])
  const reload = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, failed: false }))
    await load()
  }, [load])
  const invalidate = useCallback(() => {
    request.current++
  }, [])
  useEffect(() => {
    let current = true
    const version = ++request.current
    void getWritingSchedule().then(
      (data) => {
        if (current && request.current === version)
          setState({ data, failed: false, loading: false })
      },
      () => {
        if (current && request.current === version)
          setState({ data: null, failed: true, loading: false })
      },
    )
    const refresh = () => {
      void reload()
    }
    const visible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', visible)
    return () => {
      current = false
      invalidate()
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [reload, load, invalidate])
  return (
    <Context.Provider value={{ ...state, reload, accept }}>
      {children}
    </Context.Provider>
  )
}
