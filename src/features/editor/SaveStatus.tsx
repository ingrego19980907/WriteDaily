import { en } from '../../app/i18n/en'

export type SaveState =
  | 'preparing'
  | 'unchanged'
  | 'waiting'
  | 'saving'
  | 'saved'
  | 'paused'
  | 'blocked'
  | 'unavailable'

export function SaveStatus({
  state,
  compact = false,
}: {
  state: SaveState
  compact?: boolean
}) {
  const copy = en.writing
  const labels: Record<SaveState, string> = {
    preparing: copy.savePreparing,
    unchanged: copy.saveUnchanged,
    waiting: copy.saveWaiting,
    saving: copy.saving,
    saved: copy.saved,
    paused: copy.savePaused,
    blocked: copy.saveBlocked,
    unavailable: copy.saveUnavailable,
  }
  return (
    <p
      role="status"
      aria-label={copy.saveStatus}
      aria-live="polite"
      aria-atomic="true"
      className={
        compact
          ? 'manuscript-save-status'
          : 'min-w-0 rounded-lg border border-secondary p-3 break-words text-secondary'
      }
    >
      {labels[state]}
    </p>
  )
}
