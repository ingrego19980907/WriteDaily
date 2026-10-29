import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { isTauri } from '@tauri-apps/api/core'
import { Trophy, X } from 'lucide-react'
import { en } from '../../app/i18n/en'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useNotificationLayer } from '../../components/ui/notification-layer-context'
import {
  claimAchievementNotifications,
  listenAchievementUnlocks,
} from '../../services/achievements'
import { ACHIEVEMENT_RULES, type AchievementId } from './achievement-rules'
import type { AchievementUnlock } from './achievement-unlocks'
import './achievement-notifications.css'

const copy = en.achievementNotifications
const order = Object.keys(ACHIEVEMENT_RULES) as AchievementId[]

export function AchievementNotifications() {
  const [batches, setBatches] = useState<readonly AchievementUnlock[][]>([])
  const seen = useRef(new Set<AchievementId>())
  const layer = useNotificationLayer()
  const dismiss = useCallback(
    () => setBatches((current) => current.slice(1)),
    [],
  )

  useEffect(() => {
    if (!isTauri()) return
    let current = true
    let ready = false
    let busy = false
    let again = false
    let unlisten: (() => void) | undefined
    function wake() {
      if (!current || !ready || document.visibilityState === 'hidden') return
      if (busy) {
        again = true
        return
      }
      busy = true
      void claimAchievementNotifications()
        .then((unlocks) => {
          if (!current) return
          const fresh = unlocks.filter(
            (unlock) => !seen.current.has(unlock.achievementId),
          )
          for (const unlock of fresh) seen.current.add(unlock.achievementId)
          fresh.sort(
            (a, b) =>
              order.indexOf(a.achievementId) - order.indexOf(b.achievementId),
          )
          if (fresh.length) setBatches((queue) => [...queue, fresh])
        })
        .catch(() => {
          // Optional notice delivery must not block writing. Unclaimed native rows
          // remain retryable on the next wake/focus; never invent a successful notice.
        })
        .finally(() => {
          busy = false
          if (again && current) {
            again = false
            wake()
          }
        })
    }
    const visible = () => {
      if (document.visibilityState === 'visible') wake()
    }
    window.addEventListener('focus', wake)
    document.addEventListener('visibilitychange', visible)
    // Register before draining; StrictMode's cancelled registration never claims.
    void listenAchievementUnlocks(wake).then(
      (stop) => {
        if (!current) {
          stop()
          return
        }
        unlisten = stop
        ready = true
        wake()
      },
      () => {
        if (current) {
          ready = true
          wake()
        }
      },
    )
    return () => {
      current = false
      unlisten?.()
      window.removeEventListener('focus', wake)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [])

  const batch = batches[0]
  const names =
    batch
      ?.map((unlock) => en.achievementRules[unlock.achievementId].name)
      .join(', ') ?? ''
  return createPortal(
    <div className="achievement-notification-viewport" data-active={!!batch}>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {batch ? copy.announcement(batch.length, names) : ''}
      </div>
      {batch && (
        <AchievementNotice
          key={batch[0].achievementId}
          count={batch.length}
          names={names}
          onDismiss={dismiss}
        />
      )}
    </div>,
    layer?.target ?? document.body,
  )
}

function AchievementNotice({
  count,
  names,
  onDismiss,
}: {
  count: number
  names: string
  onDismiss: () => void
}) {
  const panel = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [hidden, setHidden] = useState(
    () => document.visibilityState === 'hidden',
  )
  const paused = hovered || focused || hidden
  const dismiss = useCallback(() => {
    const restore = panel.current?.contains(document.activeElement)
      ? returnFocus.current
      : null
    onDismiss()
    if (restore?.isConnected) restore.focus({ preventScroll: true })
  }, [onDismiss])

  useEffect(() => {
    const visibility = () => setHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', visibility)
    return () => document.removeEventListener('visibilitychange', visibility)
  }, [])
  useEffect(() => {
    if (paused) return
    const timer = setTimeout(() => {
      if (
        document.visibilityState !== 'hidden' &&
        !panel.current?.contains(document.activeElement)
      )
        dismiss()
    }, 8_000)
    return () => clearTimeout(timer)
  }, [paused, dismiss])

  return (
    <Card
      ref={panel}
      className="achievement-notification"
      role="group"
      aria-label={copy.region}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={(event) => {
        if (
          event.relatedTarget instanceof HTMLElement &&
          !event.currentTarget.contains(event.relatedTarget)
        )
          returnFocus.current = event.relatedTarget
        setFocused(true)
      }}
      onBlurCapture={(event) => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        )
          setFocused(false)
      }}
    >
      <Trophy
        className="achievement-notification__icon"
        size={24}
        strokeWidth={1.6}
        aria-hidden="true"
        focusable="false"
      />
      <div className="achievement-notification__text">
        <p className="achievement-notification__title">{copy.title(count)}</p>
        <p className="achievement-notification__names">{names}</p>
      </div>
      <Button
        variant="ghost"
        className="achievement-notification__dismiss"
        aria-label={copy.dismiss}
        onClick={dismiss}
      >
        <X size={18} strokeWidth={1.6} aria-hidden="true" focusable="false" />
      </Button>
    </Card>
  )
}
