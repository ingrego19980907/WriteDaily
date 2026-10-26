# Autosave (3.8)

ManuscriptEditor schedules a content save after **2 seconds without a content change**. Each accepted text/formatting/undo/redo update restarts the timer. Selection-only transactions, opening a chapter and clean idle time do not write. The timer serializes the latest validated editor JSON when it fires, rather than retaining a stale edit snapshot. There is no periodic write or maximum-wait timer during continuous typing.

## One persistence path

Automatic, manual and navigation-triggered saves all call the existing guarded save operation. Its synchronous pending ref prevents concurrent writes; successful native commit supplies the next revision and saved word count. The native SQLite transaction still owns content/count/revision atomicity. No dependency, service command, native implementation, schema or migration changes were needed.

The existing policy freezes editing/formatting, navigation and chapter mutations during an in-flight write. Thus new user edits cannot race a submitted snapshot; this version does not maintain a second editable draft or an in-flight edit queue. After commit, editing resumes and subsequent changes start a new debounce using the committed revision. Manual saving remains available before the timer fires. Clean state cancels any scheduled save, preventing duplicate manual/automatic writes.

Navigation flushes dirty content immediately before target loading and suppresses the debounce while transitioning. A pending write disables navigation. Old chapter timers are cancelled on session unmount; a target gets its own editor session, timer and revision. Successful clean close needs no write. Dirty/pending close protection and acknowledged discard remain active; closing is not an unguarded fire-and-forget flush.

## Failure and retry

Any save error pauses automatic writes for that session. Writing remains editable and dirty, and the error stays visible through further edits. Time passing or further typing cannot produce a retry loop or silently dismiss the failure. **Save chapter text** explicitly retries a transient persistence failure, submitting the latest text with the unchanged expected revision. Successful commit clears the pause and resumes autosaving subsequent changes.

Conflict, missing chapter and invalid stored data continue to block writes entirely. A stale revision is never force-overwritten or automatically rebased. Preserve/copy the current text and follow the existing explicit close/discard workflow. Unsupported editor content never becomes an empty saved fallback. Detailed save-status presentation remains task 3.9; this task retains the existing pending/error/commit-only success controls and adds truthful autosave/retry instructions to centralized English copy.

## Durability and verification boundaries

The debounce is an in-memory scheduler. Unsaved edits remain vulnerable to forced termination, power loss and shutdown before native commit. This task adds no recovery journal, background draft persistence, automatic error retries, focus-loss save or automatic native-window close flush. Desktop editor restart/recovery acceptance remains 3.12. Browser tests use isolated test IPC; no real library is edited by tests.

Seven new real-editor Vitest cases exercise debounce reset/latest content, committed revision reuse, clean idling, slow-write serialization/close locking, transient and permanent failures, explicit retry/resume, manual-save deduplication and timer cleanup. Six Edge scenarios exercise exact controlled timing, automatic save/reopen at 320/640/1100px with axe, pending navigation locks, failure/retry/resume and navigation flushing without a stale timer writing another chapter. The test clock is paused for precise timing and resumed before axe so its own timers can complete.

Frontend verification covers 364 passing Vitest tests, lint, formatting, strict typecheck and production build. The complete Edge suite contains 75 tests. Rust/persistence code is unchanged; the 59-test native result belongs to 3.7 and was not repeated for this frontend scheduler.

The existing manuscript roundtrip test now sets its end-of-document selection explicitly before keyboard typing: native Control+End intermittently left the caret in a heading. This makes its unchanged-block assertion deterministic while retaining real keyboard input and saved-JSON comparison.
