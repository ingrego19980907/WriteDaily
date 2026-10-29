import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  NotificationLayerContext,
  useNotificationLayer,
} from './notification-layer-context'

/** Dialogs register generic notification outlets without importing any feature. */
export function NotificationLayerProvider({
  children,
}: {
  children: ReactNode
}) {
  const [targets, setTargets] = useState<HTMLElement[]>([])
  const register = useCallback((target: HTMLElement) => {
    setTargets((current) => [...current, target])
    return () =>
      setTargets((current) => current.filter((item) => item !== target))
  }, [])
  const value = useMemo(
    () => ({ target: targets.at(-1) ?? null, register }),
    [targets, register],
  )
  return (
    <NotificationLayerContext.Provider value={value}>
      {children}
    </NotificationLayerContext.Provider>
  )
}

export function NotificationLayerSlot() {
  const layer = useNotificationLayer()
  const register = layer?.register
  const ref = useCallback(
    (target: HTMLDivElement | null) => {
      if (target && register) return register(target)
    },
    [register],
  )
  return layer ? <div ref={ref} className="notification-layer-slot" /> : null
}
