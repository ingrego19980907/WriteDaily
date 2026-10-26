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

export function SaveStatus({ state }: { state: SaveState }) {
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
      className="min-w-0 rounded-lg border border-secondary p-3 break-words text-secondary"
    >
      {labels[state]}
    </p>
  )
}
