# Autosave (3.8)

ManuscriptEditor schedules a content save after **2 seconds without a content change**. Each accepted text/formatting/undo/redo update restarts the timer. Selection-only transactions, opening a chapter and clean idle time do not write. The timer serializes the latest validated editor JSON when it fires, rather than retaining a stale edit snapshot. There is no periodic write or maximum-wait timer during continuous typing.

## One persistence path

Automatic, manual and navigation-triggered saves all call the existing guarded save operation. Its synchronous pending ref prevents concurrent writes; successful native commit supplies the next revision and saved word count. The native SQLite transaction still owns content/count/revision atomicity. No dependency, service command, native implementation, schema or migration changes were needed.

The existing policy freezes editing/formatting, navigation and chapter mutations during an in-flight write. Thus new user edits cannot race a submitted snapshot; this version does not maintain a second editable draft or an in-flight edit queue. After commit, editing resumes and subsequent changes start a new debounce using the committed revision. Manual saving remains available before the timer fires. Clean state cancels any scheduled save, preventing duplicate manual/automatic writes.

Navigation flushes dirty content immediately before target loading and suppresses the debounce while transitioning. A pending write disables navigation. Old chapter timers are cancelled on session unmount; a target gets its own editor session, timer and revision. Successful clean close needs no write. Dirty/pending close protection and acknowledged discard remain active; closing is not an unguarded fire-and-forget flush.

## Failure and retry

Any save error pauses automatic writes for that session. Writing remains editable and dirty, and the error stays visible through further edits. Time passing or further typing cannot produce a retry loop or silently dismiss the failure. **Save chapter text** explicitly retries a transient persistence failure, submitting the latest text with the unchanged expected revision. Successful commit clears the pause and resumes autosaving subsequent changes.

Conflict, missing chapter and invalid stored data continue to block writes entirely. A stale revision is never force-overwritten or automatically rebased. Preserve/copy the current text and follow the existing explicit close/discard workflow. Unsupported editor content never becomes an empty saved fallback. Task 3.9 adds the dedicated [save-status region](SAVE_STATUS.md), including neutral/waiting/pending/committed/paused/blocked states and save-error details retained through edits, close notices and retries. Copy remains centralized in English.

## Durability and verification boundaries

The debounce is an in-memory scheduler. Unsaved edits remain vulnerable to forced termination, power loss and shutdown before native commit. This task adds no recovery journal, background draft persistence, automatic error retries, focus-loss save or automatic native-window close flush. Desktop editor restart/recovery acceptance remains 3.12. Browser tests use isolated test IPC; no real library is edited by tests.

Seven new real-editor Vitest cases exercise debounce reset/latest content, committed revision reuse, clean idling, slow-write serialization/close locking, transient and permanent failures, explicit retry/resume, manual-save deduplication and timer cleanup. Six Edge scenarios exercise exact controlled timing, automatic save/reopen at 320/640/1100px with axe, pending navigation locks, failure/retry/resume and navigation flushing without a stale timer writing another chapter. The test clock is paused for precise timing and resumed before axe so its own timers can complete.

Frontend verification covers 364 passing Vitest tests, lint, formatting, strict typecheck and production build. The complete Edge suite contains 75 tests. Rust/persistence code is unchanged; the 59-test native result belongs to 3.7 and was not repeated for this frontend scheduler.

The existing manuscript roundtrip test now sets its end-of-document selection explicitly before keyboard typing: native Control+End intermittently left the caret in a heading. This makes its unchanged-block assertion deterministic while retaining real keyboard input and saved-JSON comparison.

ED.4 timing verification (2026-10-27): all 108 Edge tests passed, including expanded 320/640/1100px clock scenarios. Each verifies timer reset after a later edit, no write at 1999ms, one write at 2000ms, no repeated writes during 10 seconds without changes, another complete 2-second cycle, and reopening the newest committed text. Existing slow-write, error-pause/manual-retry and navigation-flush scenarios also pass. This is the existing inactivity debounce, not a periodic write while typing; native commit latency follows timer firing. No save mechanism or native code was changed.

ED.5 manual keyboard saving (2026-10-27): Ctrl+S and Command+S invoke the existing manual-save callback from within the active Chapter text dialog, including its header/focus-mode controls. Browser Save is prevented only in that dialog. Modifier combinations with Alt/Shift, repeated/composing keys and navigation locks do not initiate writes. Existing clean/pending/conflict/unavailable guards apply, and a transient failure can be explicitly retried with the shortcut. Successful manual saves cancel outstanding debounce work. Listener cleanup removes interception after dismissal. The Save button advertises Control+S / Meta+S through aria-keyshortcuts and centralized hover text. Three new Edge scenarios passed with the full 111-test run; all 421 Vitest tests passed.

ED.17: read-only chapter preview cannot create edits and has no manual-save controls. An autosave scheduled by focused writing can still finish after returning to preview; a late completion never unlocks preview editing. Draft/close guards remain, and Start writing restores access to explicit retry/Ctrl+S.

## Activity and uncertain retries (5.2)

Every content save now includes an edit-time activity submission. Content/count/revision and activity commit in one transaction. Freeze the operation ID and exact payload for retries; editing after a failed response creates a separate batch, not a replacement retry. Explicit retry first acknowledges the original save and then serially submits later edits under a new ID/revision before showing the current draft as saved. A 64-context threshold requests an early flush before the native 128-segment cap. Activity capture errors preserve text and make saving visibly unavailable. Dirty/close guards remain. See [ACTIVITY_MODEL.md](ACTIVITY_MODEL.md).
