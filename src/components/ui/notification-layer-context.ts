import { createContext, useContext } from 'react'

export const NotificationLayerContext = createContext<{
  target: HTMLElement | null
  register: (target: HTMLElement) => () => void
} | null>(null)

export function useNotificationLayer() {
  return useContext(NotificationLayerContext)
}
