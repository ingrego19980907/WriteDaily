# Save status (3.9)

The chapter editor presents a persistent named **Save status** region near the manuscript heading. `SaveStatus.tsx` owns presentation; ManuscriptEditor derives its state from the actual session/save lifecycle. English copy is centralized under en.writing. No timer, database field, native command or dependency is added.

| State                                 | Meaning                                                                                                  |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Preparing safe editing                | The native/browser close guard is not ready yet.                                                         |
| No unsaved changes                    | A validated chapter was opened and has no session edits. This does not claim a new write.                |
| Unsaved changes: waiting to save      | Accepted edits are dirty and waiting for the existing 2-second debounce or an explicit save.             |
| Saving chapter text                   | The shared automatic/manual/navigation save is pending.                                                  |
| Chapter text saved                    | Native persistence returned committed success for this session; the current document is clean.           |
| Not saved: automatic saving is paused | A retryable save failed; text remains in the editor and manual Save retries it.                          |
| Not saved: saving is blocked          | Conflict, missing chapter or invalid stored data prevents further writes. No stale overwrite is offered. |
| Saving is unavailable                 | A fatal editor/close-guard failure prevents safe editing/saving.                                         |

Saved is never inferred from the elapsed debounce, button click, loaded count or client clock. A subsequent accepted content change immediately replaces success with waiting. Switching chapters remounts session state and starts neutral; outgoing success never describes the incoming chapter. Rejected paste/edits are separate notices and do not claim that previously committed writing changed.

## Errors and retry

Save failures have their own retained detail, independent of close/paste/validation notices. Further typing and attempts to close cannot replace the save error. One alert container presents the retained error and any additional notice without duplicating identical text. On retry, status changes to Saving while the previous failure detail stays visible. Successful commit alone clears it, clears obsolete pending/unsaved-close notices, advances revision/count and shows Saved. A failed retry updates the error and leaves writing intact.

Serialization failure pauses automation and exposes its validation failure without submitting unsupported content. Existing blocked-error behavior, explicit transient retry, pending locks and acknowledged discard remain. The 3.8 scheduler still uses the same revision-checked native transaction; this indicator adds no persistence fallback or crash-recovery mechanism.

## Accessibility and verification

The stable named role=status uses polite, atomic announcements without taking focus. Further keystrokes in the same waiting state do not change its text. Detailed errors remain in role=alert. Visible text identifies every state independently of color or motion; the component uses existing surface/text/border tokens, wraps at narrow widths and adds no Tab stop or animation. No live word-count announcements were added.

Seven new real-editor Vitest cases cover neutral/preparing/unavailable states, waiting/pending/commit transitions, next-edit invalidation, stable semantics, four failure classes through edits/close/retry, stale close-notice cleanup and chapter-session reset. Six Edge scenarios cover automatic/manual saving and reopen at 320/640/1100px, axe, 200% modal/status reflow, forced colors/reduced motion, a slow commit and retryable/blocked failures. Browser persistence is isolated test IPC. Native code/schema/dependencies are unchanged; the 59 Rust-test result remains the 3.7 record. No actual desktop editor restart, real-library mutation, manual screen-reader or crash-recovery claim is added.

Verified 371 Vitest tests and the complete 81-test Edge suite. After refining pending-close notice cleanup on write failure, all 371 Vitest tests and the six focused Edge status checks passed again. Lint, format:check, strict typecheck, production build and diff whitespace checks pass. Compact/enlarged forced-colors status captures were generated; the 640px capture was inspected.
