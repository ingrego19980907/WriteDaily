import { isTauri } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'

/** Caller must await registration before enabling writing and retain the cleanup. */
export async function protectWritingClose(
  shouldBlock: () => boolean,
  onBlocked: () => void,
): Promise<() => void> {
  if (!isTauri()) return () => {}
  return getCurrentWindow().onCloseRequested((event) => {
    if (shouldBlock()) {
      event.preventDefault()
      onBlocked()
    }
  })
}
