# Editor preferences (3.11)

Open a chapter and expand **Editor settings**. Choose **Manuscript text size** (every integer from 12 through 32 px) and choose **Save editor settings**. Default size is 18 px. The selected draft is not a live preview: the new size applies only after native persistence commits, with a separate settings success message. An unchanged value needs no write. The setting is global across books/chapters and loaded again whenever the editor dialog is opened.

Only manuscript presentation changes. The editor uses size/16 rem for its writing font so root text enlargement is respected (32 px becomes 64 CSS px at 200% root text size). Application controls, chapter titles and saved Tiptap JSON are unchanged. Changing size does not remount Tiptap, move its document selection, reset undo history, dirty the manuscript, increment a chapter revision or trigger a content save. Focus mode inherits the size and hides its controls along with other distractions. Editor font family, language, autosave delay and persistent focus-mode choice are outside 3.11.

## Domain and persistence

`editor-preferences.ts` owns frontend defaults/bounds and strict snapshot validation. `services/editor-preferences.ts` exposes only getEditorPreferences and saveEditorPreferences(fontSize, expectedRevision), validates native replies and refuses browser persistence without a fallback. The native editor_preferences module owns authoritative validation and SQLite transactions; preference_commands adapts it to blocking Tauri commands. No npm/Cargo dependency or capability was added.

Append-only migration **004_editor_preferences.sql** advances the database to schema **v4** and creates a STRICT singleton table independent of books:

| Column         | Contract                                            |
| -------------- | --------------------------------------------------- |
| id             | INTEGER primary key; exactly 1                      |
| schema_version | INTEGER; currently 1                                |
| font_size      | INTEGER, 12–32 inclusive; initial 18                |
| revision       | INTEGER, 1 through 9,007,199,254,740,991; initial 1 |

The DTO is `{schemaVersion: 1, fontSize, revision}`. Updates accept only `{fontSize, expectedRevision}`; Serde rejects unknown fields and wrong numeric types. Reads validate singleton presence/version/size/revision without repairing it. Missing/corrupt settings are not replaced with defaults. Updates use an IMMEDIATE transaction, reject stale revisions before changing data, advance revision on actual changes and return only after commit. No-op updates retain revision; overflow and unexpected zero-row updates fail. Book deletion does not own or reset the global setting. Existing migrations 001–003 remain unchanged and upgrades preserve books/chapters/covers.

## Loading, failure and pending behavior

Until the saved snapshot loads, the editor uses its existing/default display size; loading and errors are explicit settings feedback. A failed read leaves that size intact, offers Load saved settings and blocks settings writes. It does not replace stored preferences or prevent writing. Late read/write results are ignored after settings-panel unmount.

A transient save failure retains both the previous applied size and selected draft; explicit Save retries the same revision. Conflict/invalid stored data/revision exhaustion block updates until explicit reload, without overwriting another revision. Load saved settings explicitly replaces the settings draft/applied size with a validated fresh snapshot. Error details and settings status remain visible even if the details control is collapsed; prior errors remain during retry until success.

Settings writes are serialized by a synchronous pending guard. While one is pending, chapter navigation/mutations, entering focus mode, editor-dialog dismissal and native/beforeunload close are blocked. The manuscript remains available, and its own autosave may commit independently; combined pending refs ensure one completed operation cannot release the other's locks. Settings controls are disabled during manuscript saves/chapter transitions. Normal dirty-writing close/discard protection remains separate; dismissing an unapplied font-size draft does not discard manuscript writing.

## Verification and limits

Frontend coverage adds domain bounds/snapshot tests, narrow IPC/browser/error checks, settings-panel commit-only apply/load/retry/conflict/stale-response tests and real-editor identity/native-close integration. Total: 401 Vitest tests. Seven Edge scenarios bring the suite to 94: 12/32 px boundaries, saved size after dialog reopen and chapter switching, unchanged editor JSON/no manuscript writes, focus mode, load/save/conflict/pending failures, native-close locks, axe at 320/640/1100px, 200% reflow and forced-colors/reduced-motion captures. Browser preferences are isolated test IPC, never production browser storage.

66 Rust tests include six new preference tests and a schema-v3 upgrade test: real disposable SQLite reopen, independent-connection conflicts, SQL bounds/types/singleton/version checks, no-op/overflow, malformed DTOs, ignored-write/deferred-commit rollback and missing/corrupt settings without repair. Existing migration rollback/future-schema tests now append synthetic version 5 after production v4. The reusable desktop restart runner expects schema v4, but was not executed in 3.11. No actual desktop editor restart or manual screen-reader claim is added; native editor restart/recovery acceptance remains 3.12.

Verified: all 401 Vitest tests, 66 Rust tests and the complete 94-test Edge suite pass. Lint, format:check, strict typecheck, production build, Cargo fmt/Clippy and diff whitespace checks pass. Inspected the 640px capture at maximum size with 200% text and forced colors.
