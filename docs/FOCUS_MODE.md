# Focus mode (3.10)

ED.6 follow-up: compact font controls and Bold/Italic remain visible above writing while focused; the committed global text size continues to apply. A pending settings write prevents entering focus mode until it finishes; existing exit-during-manuscript-save behavior remains.

Choose **Enter focus mode** in the chapter dialog header. The same dialog fills the application's viewport and centers the manuscript in a column up to 48rem wide. This is a presentation mode inside the app, not native OS/browser fullscreen. No window API, permission, dependency or persistence change is added.

Chapter navigation, advanced block/list/history formatting controls and word counts are hidden from both the visual layout and keyboard/accessibility navigation while focused. The long chapter heading and explanatory help remain available to screen readers but are visually hidden, making room for writing at small/enlarged sizes. The dialog title, mode/Close buttons, save-status region, manuscript, error details, manual Save and any required discard acknowledgement remain available. Hidden counts still update, and ordinary formatting keyboard shortcuts continue to work.

## Keyboard and exit behavior

- Tab to Enter focus mode and press Enter/Space. The same button retains focus and becomes Exit focus mode with aria-pressed=true. Tab then reaches Close and the manuscript; Radix's existing modal focus trap remains in charge.
- Exit focus mode returns to the normal dialog without closing or saving it. Escape does the same and restores focus to the Enter button. The first Escape never discards writing or dismisses the editor, even if the document is clean. A later deliberate Escape follows the existing normal-close policy. Repeated/IME-composing Escape events do not dismiss the editor.
- Explicit Close still requests normal dismissal. Dirty writing requires saving or acknowledged discard; pending writes still block closing. Exiting the visual mode remains available during a write and does not release those locks.
- The toggle is disabled during a chapter transition. Chapter navigation is hidden and guarded while focused; exit the mode before switching chapters. Closing/reopening starts in normal mode. The choice is session-local, not a persisted editor preference.

## Writing and layout safety

Toggling updates layout props only. The same ManuscriptEditor, EditorContent and Tiptap Editor remain mounted with the same document, selection, undo history, revision, dirty state, autosave timer and close guards. The toolbar remains mounted and presents only Bold/Italic in focus mode; the stable preference owner keeps its compact controls available through the same toolbar slot. Focus changes do not trigger a save, reset the debounce, replace text or manufacture a saved status. The existing two-second autosave, explicit retry, permanent conflict blocks and native commit-only success/count updates remain active.

Modal adds optional fullScreen/headerActions/onEscapeKeyDown props while preserving defaults for all existing dialogs. The fullscreen style uses dynamic viewport height, a non-scrolling header, internally scrolling body and responsive padding; the manuscript uses existing typography/color tokens and at least half a viewport of writing height. There is no animation, focus-dimming opacity or per-line writing transform. Hidden controls cannot remain in the Tab order. Mode changes add no extra editor instance, portal or nested dialog.

## Verification boundaries

Four new real-editor Vitest cases cover keyboard toggle/Escape/focus restoration, text/selection/undo/dirty-state identity, pending-write exit and retry, dirty close/discard/reopen reset and repeated Escape on a clean document. Total frontend coverage is 375 tests. Six new Edge scenarios bring browser coverage to 87: keyboard entry/Tab/exit, formatting and autosave, saved-JSON identity, hidden controls and restored counts, pending-close locks, error/retry and acknowledged discard. Layout checks include 320/640/1100px, the supported 640x480 minimum, axe scans, 200% internal reflow and forced-colors/reduced-motion captures.

Browser persistence uses isolated test IPC. Native code/schema/capabilities are unchanged, so the 59-test native result remains historical 3.7 evidence. No actual desktop launch/restart, manual screen-reader session, native OS fullscreen or new crash-recovery claim is added. Editor preferences remain 3.11 and desktop editor persistence/recovery acceptance remains 3.12.

Verified: 375 Vitest tests and all 87 Edge tests pass, plus lint, format:check, strict typecheck, production build and diff whitespace checks. Inspected the 640x480 capture with 200% text and forced colors after visually hiding verbose chapter context/help; Exit/Close remain in the header and manuscript/status remain in the scrolling body.

ED.8: focus-mode font controls now edit selection/cursor font marks in the same document as bold/italic. They have no independent global-preference write or settings caption. All formatting saves through manuscript autosave/Ctrl+S; the existing pending/dirty-close guards apply.

## Current entry flow (ED.17)

Chapter text is now a read-only preview. Start writing replaces the old Enter focus mode label and enables the focused writing UI. Leaving focus returns to preview with the same editor/draft/history; preview has no formatting/save footer. Existing autosave, pending locks and dirty-close protection still apply to an unsaved writing session. See [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md#preview-before-writing-ed17) and [ACCESSIBILITY_REVIEW.md](ACCESSIBILITY_REVIEW.md#ed17-preview-before-writing).
