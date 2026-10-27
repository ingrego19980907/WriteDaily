# Task tracker

Source of truth. Checked items have verified acceptance criteria. All unlisted implementation is absent.

Current stop: tasks 0.1-0.9 completed. Milestone 0 (Foundation) acceptance is verified. Tasks 1.1-1.9 are complete; Milestone 1 acceptance is verified for the current shell/shared UI. Milestone 2 (tasks 2.1-2.12) is complete, including real Windows desktop restart persistence; Milestone 3 (tasks 3.1–3.12) is complete for the current editor and commit-based recovery; Task 4.1 (committed book word-count aggregation) is complete; awaiting approval before 4.2 (daily goals). Library progress now uses persisted chapter totals; legacy unknowns and read failures remain unknown. Covered-book deletion now uses safe queued cleanup.

Desktop environment: Rust/Cargo updated to 1.99.1 MSVC with approval in task 0.3. Cargo still needs a session PATH entry (see README). Existing VS 2017 C++ tools/SDK and WebView2 are detected by Tauri; compile verification is recorded below.

## Milestone 0: Foundation

| Done | ID  | Description                          | Status                 | Dependencies | Acceptance criteria                                                   |
| ---- | --- | ------------------------------------ | ---------------------- | ------------ | --------------------------------------------------------------------- |
| [x]  | 0.1 | Inspect environment                  | Completed (2026-10-24) | None         | Record Node/npm, Rust/Cargo, C++ tools, SDK and WebView2 availability |
| [x]  | 0.2 | Initialize React + TypeScript + Vite | Completed (2026-10-24) | 0.1          | Frontend starts and strict TypeScript build passes                    |
| [x]  | 0.3 | Configure Tauri 2                    | Completed (2026-10-24) | 0.2          | Compatible dependencies resolve and desktop wrapper compiles          |
| [x]  | 0.4 | Configure Tailwind CSS               | Completed (2026-10-24) | 0.3          | Vite builds with a verified Tailwind utility                          |
| [x]  | 0.5 | Configure ESLint and formatting      | Completed (2026-10-24) | 0.4          | Lint and formatting checks pass                                       |
| [x]  | 0.6 | Configure Vitest                     | Completed (2026-10-24) | 0.5          | A meaningful render smoke test passes                                 |
| [x]  | 0.7 | Create application structure         | Completed (2026-10-24) | 0.6          | Feature boundaries and application entry are documented and build     |
| [x]  | 0.8 | Create project documentation         | Completed (2026-10-24) | 0.7          | All required documents exist and match the initialized configuration  |
| [x]  | 0.9 | Verify desktop startup               | Completed (2026-10-24) | 0.8          | Observe Tauri window with React rendered; typecheck and tests pass    |

## Milestone 1: Design System

| Done | ID  | Description                     | Status                 | Dependencies | Acceptance criteria                                      |
| ---- | --- | ------------------------------- | ---------------------- | ------------ | -------------------------------------------------------- |
| [x]  | 1.1 | Define colors and typography    | Completed (2026-10-24) | 0.9          | Central tokens and local font stacks render consistently |
| [x]  | 1.2 | Create application shell        | Completed (2026-10-24) | 1.1          | Shell adapts to supported window sizes                   |
| [x]  | 1.3 | Create navigation               | Completed (2026-10-24) | 1.2          | All section navigation works by keyboard                 |
| [x]  | 1.4 | Implement Button                | Completed (2026-10-24) | 1.3          | Accessible button variants render with focus states      |
| [x]  | 1.5 | Implement Input                 | Completed (2026-10-24) | 1.4          | Labels, errors and keyboard entry work                   |
| [x]  | 1.6 | Implement Modal                 | Completed (2026-10-24) | 1.5          | Focus trap, dismissal and focus restoration work         |
| [x]  | 1.7 | Implement Card                  | Completed (2026-10-24) | 1.6          | Reusable card respects design tokens                     |
| [x]  | 1.8 | Implement ProgressBar           | Completed (2026-10-24) | 1.7          | Clamped values and accessible progress semantics work    |
| [x]  | 1.9 | Verify accessibility and layout | Completed (2026-10-24) | 1.8          | Keyboard, contrast and responsive checks documented      |

## Milestone 2: My Library

| Done | ID   | Description                        | Status                 | Dependencies | Acceptance criteria                                                      |
| ---- | ---- | ---------------------------------- | ---------------------- | ------------ | ------------------------------------------------------------------------ |
| [x]  | 2.1  | Design book data model             | Completed (2026-10-24) | 1.9          | Fields, constraints and deletion relationships reviewed                  |
| [x]  | 2.2  | Configure SQLite and migrations    | Completed (2026-10-24) | 2.1          | Database opens and migrations apply safely on fresh and existing schemas |
| [x]  | 2.3  | Implement book repository          | Completed (2026-10-24) | 2.2          | Validated CRUD operations pass real database tests                       |
| [x]  | 2.4  | Implement book creation            | Completed (2026-10-24) | 2.3          | Valid books persist and invalid input shows errors                       |
| [x]  | 2.5  | Implement book editing             | Completed (2026-10-24) | 2.4          | Changes persist after reopening                                          |
| [x]  | 2.6  | Implement book deletion            | Completed (2026-10-24) | 2.5          | Confirmation and safe dependent-data policy verified                     |
| [x]  | 2.7  | Implement cover upload and storage | Completed (2026-10-24) | 2.6          | Managed covers survive restart and invalid files are rejected            |
| [x]  | 2.8  | Design book cards                  | Completed (2026-10-25) | 2.7          | Cover, title and progress render accessibly                              |
| [x]  | 2.9  | Implement library grid             | Completed (2026-10-25) | 2.8          | Responsive grid opens the correct book                                   |
| [x]  | 2.10 | Implement book progress            | Completed (2026-10-25) | 2.9          | Zero, missing and exceeded targets handled                               |
| [x]  | 2.11 | Add empty states and validation    | Completed (2026-10-25) | 2.10         | Empty, loading and error states work                                     |
| [x]  | 2.12 | Test persistence after restart     | Completed (2026-10-25) | 2.11         | Books and covers survive a real desktop restart                          |

## Milestone 3: Writing Editor

| Done | ID   | Description                   | Status                 | Dependencies | Acceptance criteria                                                           |
| ---- | ---- | ----------------------------- | ---------------------- | ------------ | ----------------------------------------------------------------------------- |
| [x]  | 3.1  | Design chapter data model     | Completed (2026-10-25) | 2.12         | Ordering, content schema and revisions specified                              |
| [x]  | 3.2  | Implement chapter repository  | Completed (2026-10-25) | 3.1          | Chapter CRUD and revision handling pass persistence checks                    |
| [x]  | 3.3  | Implement chapter management  | Completed (2026-10-25) | 3.2          | Create, rename and confirmed deletion work                                    |
| [x]  | 3.4  | Integrate Tiptap              | Completed (2026-10-25) | 3.3          | Rich text edits and serialization work                                        |
| [x]  | 3.5  | Add formatting toolbar        | Completed (2026-10-26) | 3.4          | Bold, italic, headings, lists and undo/redo work                              |
| [x]  | 3.6  | Implement chapter navigation  | Completed (2026-10-26) | 3.5          | Pending edits preserved when switching chapters                               |
| [x]  | 3.7  | Implement word counting       | Completed (2026-10-26) | 3.6          | Documented counting policy passes Unicode and empty-content tests             |
| [x]  | 3.8  | Implement autosave            | Completed (2026-10-26) | 3.7          | Serialized debounced writes and retry behavior pass failure checks            |
| [x]  | 3.9  | Implement save status         | Completed (2026-10-26) | 3.8          | Saved appears only after successful commit; errors remain visible             |
| [x]  | 3.10 | Add focus mode                | Completed (2026-10-26) | 3.9          | Focus mode can be entered and exited by keyboard                              |
| [x]  | 3.11 | Add editor preferences        | Completed (2026-10-26) | 3.10         | Font size persists within validated limits                                    |
| [x]  | 3.12 | Test persistence and recovery | Completed (2026-10-26) | 3.11         | Formatting, rapid navigation, interrupted saves and restart recovery verified |

## Milestone 4: Goals & Deadlines

| Done | ID  | Description                     | Status                 | Dependencies | Acceptance criteria                                      |
| ---- | --- | ------------------------------- | ---------------------- | ------------ | -------------------------------------------------------- |
| [x]  | 4.1 | Aggregate book word counts      | Completed (2026-10-27) | 3.12         | Chapter sums stay correct after edits and deletion       |
| [ ]  | 4.2 | Implement daily goals           | Not started            | 4.1          | Validated daily targets persist                          |
| [ ]  | 4.3 | Implement total word goals      | Not started            | 4.2          | Optional targets persist and handle completion           |
| [ ]  | 4.4 | Implement deadlines             | Not started            | 4.3          | Missing, today and overdue dates handled locally         |
| [ ]  | 4.5 | Calculate required writing pace | Not started            | 4.4          | Scheduled days and nonnegative remaining words handled   |
| [ ]  | 4.6 | Create progress components      | Not started            | 4.5          | Actual goal results render accessibly                    |
| [ ]  | 4.7 | Add calculation tests           | Not started            | 4.6          | Missing goals, overdue dates and completed books covered |

## Milestone 5: Activity & Streaks

| Done | ID  | Description                       | Status      | Dependencies | Acceptance criteria                                                 |
| ---- | --- | --------------------------------- | ----------- | ------------ | ------------------------------------------------------------------- |
| [ ]  | 5.1 | Design activity records           | Not started | 4.7          | Paste, deletion, imports, local days and retention policy finalized |
| [ ]  | 5.2 | Record writing sessions/activity  | Not started | 5.1          | Content and idempotent activity commit atomically                   |
| [ ]  | 5.3 | Calculate daily statistics        | Not started | 5.2          | Daily totals and historical goal snapshots aggregate correctly      |
| [ ]  | 5.4 | Create activity calendar          | Not started | 5.3          | Intensity and inspectable day details reflect actual records        |
| [ ]  | 5.5 | Calculate current streak          | Not started | 5.4          | Scheduled-day grace rules pass tests                                |
| [ ]  | 5.6 | Calculate longest streak          | Not started | 5.5          | Historical longest streak passes schedule edge cases                |
| [ ]  | 5.7 | Support preferred writing days    | Not started | 5.6          | Schedule changes preserve historical interpretation                 |
| [ ]  | 5.8 | Test date and timezone edge cases | Not started | 5.7          | Midnight, DST and timezone changes covered                          |

## Milestone 6: Achievements

| Done | ID  | Description                      | Status      | Dependencies | Acceptance criteria                                    |
| ---- | --- | -------------------------------- | ----------- | ------------ | ------------------------------------------------------ |
| [ ]  | 6.1 | Define achievement rules         | Not started | 5.8          | Eight product achievements have precise criteria       |
| [ ]  | 6.2 | Implement achievement evaluation | Not started | 6.1          | Boundary conditions produce expected unlocks           |
| [ ]  | 6.3 | Persist unlocked achievements    | Not started | 6.2          | Retries and restart never duplicate unlocks            |
| [ ]  | 6.4 | Design achievement cards         | Not started | 6.3          | Locked and unlocked cards are accessible               |
| [ ]  | 6.5 | Create achievements page         | Not started | 6.4          | Persistent achievement state renders correctly         |
| [ ]  | 6.6 | Implement unlock notifications   | Not started | 6.5          | Subtle notifications respect accessibility preferences |
| [ ]  | 6.7 | Add tests                        | Not started | 6.6          | Thresholds, retries and completion rules covered       |

## Milestone 7: Export & Backup

| Done | ID  | Description                    | Status      | Dependencies | Acceptance criteria                                                 |
| ---- | --- | ------------------------------ | ----------- | ------------ | ------------------------------------------------------------------- |
| [ ]  | 7.1 | Export individual chapters     | Not started | 6.7          | Selected chapter exports with correct content                       |
| [ ]  | 7.2 | Export complete books          | Not started | 7.1          | Chapters export in manuscript order                                 |
| [ ]  | 7.3 | Implement portable text export | Not started | 7.2          | UTF-8 portable text retains readable structure                      |
| [ ]  | 7.4 | Implement library backup       | Not started | 7.3          | Consistent database and cover snapshot validates                    |
| [ ]  | 7.5 | Implement library restore      | Not started | 7.4          | Validated staged restore includes safety backup and rollback        |
| [ ]  | 7.6 | Validate backup integrity      | Not started | 7.5          | Corrupt archives and unsafe paths rejected                          |
| [ ]  | 7.7 | Test restore scenarios         | Not started | 7.6          | Roundtrip, interruption, incompatible schema and corruption covered |

## Milestone 8: Release

| Done | ID   | Description                 | Status      | Dependencies | Acceptance criteria                                                        |
| ---- | ---- | --------------------------- | ----------- | ------------ | -------------------------------------------------------------------------- |
| [ ]  | 8.1  | Polish UI and empty states  | Not started | 7.7          | Loading, empty and error states reviewed                                   |
| [ ]  | 8.2  | Improve keyboard navigation | Not started | 8.1          | Main workflows complete without a mouse                                    |
| [ ]  | 8.3  | Test accessibility          | Not started | 8.2          | Contrast, semantics and assistive navigation findings resolved             |
| [ ]  | 8.4  | Test Windows installation   | Not started | 8.3          | Install, launch, upgrade and uninstall preserve writing as specified       |
| [ ]  | 8.5  | Create application icon     | Not started | 8.4          | Required desktop icon formats build                                        |
| [ ]  | 8.6  | Prepare screenshots         | Not started | 8.5          | Accurate release screenshots created                                       |
| [ ]  | 8.7  | Complete README             | Not started | 8.6          | Fresh-machine setup and recovery instructions verified                     |
| [ ]  | 8.8  | Build Windows release       | Not started | 8.7          | Installer builds and launches on target Windows                            |
| [ ]  | 8.9  | Prepare GitHub release      | Not started | 8.8          | Release notes and artifacts reviewed; publish only when authorized         |
| [ ]  | 8.10 | Tag version 1.0.0           | Not started | 8.9          | Release gates pass and explicit authorization obtained before Git mutation |

## Historical verification evidence

## Verification evidence: 4.1

- Added pure book-word-count aggregation and CountedBookCard using the existing validated native chapter-list service. No redundant book field, migration, new command, backfill or mock production persistence. Empty books are zero; legacy unknowns, invalid/mixed/duplicate snapshots, failed reads and unsafe sums remain unknown.
- ChapterManager derives the saved total from committed snapshots; content saves, create/rename/delete reconcile the total. Library entry refreshes counts with identity/version guards without unmounting dialogs. Pending/failed writes do not advance totals. Existing card progress now receives actual saved counts. See [BOOK_WORD_COUNTS.md](BOOK_WORD_COUNTS.md) for refresh/error behavior and read-cost limits.
- All 420 Vitest tests, 105 Edge tests (five new integration scenarios) and 66 existing Rust tests passed. Native tests use disposable databases; native source/migrations are unchanged. Lint, format:check, strict typecheck, production build and diff checks passed. Corrected the initial focused browser test's rename-save locator before the successful full run. No new desktop launch/restart claim.
- Next: 4.2, awaiting approval.

## Verification evidence: 3.12

- Added test:desktop:editor and a real WebView2 editor scenario reusing the isolated native runner. The common harness validates the private schema before UI writes; forced termination is restricted to its owned copied executable. Real UI writes and native reads verify formatting/Unicode/content/counts/revisions, duplicate-title rapid navigation, autosave, preferences/focus, dirty native-close refusal and restart retention.
- Observed six visible native launches (five process restarts) in `.cache/desktop-restart/run-w0yHYW/report.json`: passed=true, restoredDefaultBuild=true, command exit 0. Both forced-stop cases preserve the last committed rows; a private SQL trigger and writer-lock probe establish interruption of an active native transaction, followed by real Tauri startup recovery and a successful new save/restart. Inspected native/pending-write screenshots. No real-library access/reset, new dependency, production code or migration change.
- Verified 401 Vitest and 66 Rust tests, lint, formatting, strict typecheck, Cargo fmt/Clippy and isolated/default native debug builds. Prior 94 Edge tests from 3.11 were not repeated because production UI/layout is unchanged. [EDITOR_PERSISTENCE_REVIEW.md](EDITOR_PERSISTENCE_REVIEW.md) records evidence, reproduction and limits.
- Milestone 3 acceptance is verified for commit-based recovery. The deliberately interrupted memory-only draft was lost: there is no durable draft journal and no zero-loss crash/power-loss promise. This known boundary is documented rather than presented as automatic draft recovery. Next: 4.1, awaiting approval.

## Verification evidence: 3.11

- Added global integer manuscript size 12–32 px (default 18), strict frontend/native snapshot validation, typed get/save IPC and the editor's collapsible settings panel. Applied size changes only after commit; rem units preserve root enlargement. Same Tiptap document/selection/history/revision remain, including in focus mode. Feedback stays visible outside the collapsed details control; read failures never silently replace stored settings.
- Append-only migration 004 adds a STRICT versioned singleton with its own safe revision; IMMEDIATE writes reject conflicts and return after commit, no-op preserves revision, failures/overflow/invalid data do not reset or repair it. Existing migrations 001–003 are unchanged. Combined pending locks protect settings/content writes and native/browser/dialog close. No dependency/capability added. See [EDITOR_PREFERENCES.md](EDITOR_PREFERENCES.md).
- Verified: 401 Vitest tests (26 new), 66 Rust tests (7 new), lint, formatting, strict typecheck/build and Cargo fmt/Clippy. All 94 Edge tests passed (7 new), including bounds/reopen/navigation/focus, failure/retry/conflict/pending, unchanged manuscript JSON, axe at 320/640/1100px, 200% reflow and forced colors/reduced motion. Inspected the 640px enlarged capture. Native tests use disposable databases; the desktop restart runner's schema assertion is updated to v4 but no actual native GUI/restart or manual screen-reader verification is claimed here. Next: 3.12, awaiting approval.

## Verification evidence: 3.10

- Added session-local focus mode to ChapterEditorDialog, using optional Modal fullscreen/header-action/Escape hooks. The same editor/dialog remain mounted; text, selection, history, revisions, autosave and close guards are preserved. Focus mode hides chapter navigation/toolbar/counts and visually hides long chapter context/help while retaining screen-reader context. Save status, writing, errors and manual save/discard remain available.
- Header toggle is keyboard operable with pressed state and remains reachable during writes. First Escape exits focus mode and restores button focus; repeated/composing Escape cannot dismiss the editor. Explicit Close retains dirty/pending protection; reopening resets mode. Chapter transitions lock the toggle. Existing typography/tokens, centered reading width, dynamic viewport/internal scrolling and no animation. No dependency/native/schema/permission change. See [FOCUS_MODE.md](FOCUS_MODE.md).
- Verified: 375 Vitest tests (4 new), lint, formatting, strict typecheck/build and all 87 Edge tests (6 new). New checks cover keyboard entry/Tab/exit, document/selection/history identity, autosave/formatting, pending/error/retry, acknowledged discard/reopen, axe at 320/640/1100px, 640x480, 200% internal reflow and forced colors/reduced motion. Inspected the enlarged 640x480 capture. Native tests were not repeated; the 59-test result remains 3.7. No new native startup/restart or manual screen-reader claim. Next: 3.11, awaiting approval.

## Verification evidence: 3.9

- Added SaveStatus.tsx, a stable named polite/atomic status region driven by ManuscriptEditor's real preparing/neutral/waiting/pending/committed/paused/blocked/unavailable lifecycle. Only committed success shows Saved; subsequent edits invalidate it and each chapter session starts neutral. Centralized English copy and existing tokens provide wrapping, text-based states without motion or a new Tab stop.
- Retain save error details separately from close/paste notices; further edits and close attempts cannot hide them. Retry shows Saving while retaining the previous error until successful commit, which also clears stale close/pending feedback. Serialization failures pause automation without submitting unsupported content. The existing native save path, revisions/counts and locks remain; no dependency/schema/native changes.
- Frontend verification: 371 Vitest tests (7 new), lint, format:check, strict typecheck and production build. All 81 Edge tests passed, including 6 new scenarios for 320/640/1100px, axe/200% internal reflow/forced colors/reduced motion, pending commit, retry and conflict retention. After final pending-close failure-notice cleanup, all 371 Vitest tests and six focused Edge checks passed again. See [SAVE_STATUS.md](SAVE_STATUS.md). Native tests were not repeated; the 59-test record remains 3.7. No actual desktop launch/restart or screen-reader claim. Next: 3.10, awaiting approval.

## Verification evidence: 3.8

- Added a session-local 2-second content-change debounce in ManuscriptEditor, reusing the existing validated revision-checked save for automatic/manual/navigation writes. Pending writes keep existing edit/toolbar/navigation locks; committed success alone advances revision, saved state and word count. Clean/manual saves and session cleanup cancel pending timers.
- Errors pause automation and remain visible through further edits. Explicit Save retries transient failures with the latest content; success resumes subsequent autosaves. Conflicts/missing/corrupt data stay blocked without overwriting writing. No automatic retry loop, dependency, native code, migration or recovery journal added. See [AUTOSAVE.md](AUTOSAVE.md).
- Verified 364 Vitest tests (7 new), lint, format:check, strict typecheck and production build. Edge coverage contains 75 scenarios, including 6 new checks for exact debounce timing, automatic save/reopen at 320/640/1100px with axe, slow writes, retry/resume and navigation flush/timer isolation. The precise clock is paused for timing and resumed before axe. Native implementation is unchanged; the 59 Rust test result remains the 3.7 record, not a new native run. No real-library mutation, actual desktop restart or screen-reader claim. Next: 3.9, awaiting approval.

## Verification evidence: 3.7

- Added shared pinned Unicode 17.0.0 L/N/M data, its complete license and hash-checked offline generator. Pure TypeScript and Rust counters implement the documented apostrophe/hyphen/number/combining-mark/block policy without altering writing. See [WORD_COUNTING.md](WORD_COUNTING.md) for rules and language-segmentation limits.
- ManuscriptEditor shows live and last committed counts separately; pending/failed saves cannot advance the saved count. Native content saves derive count atomically with body/revision. Rename/reorder preserve counts; legacy NULL stays unknown until explicit content save. Inconsistent known stored counts fail without repair. No dependency, schema migration, automatic backfill, book aggregation or autosave added.
- Verified 357 Vitest tests, 59 native tests using disposable databases, lint, format:check, typecheck, build and Cargo fmt/Clippy. Shared fixtures cover 40 text and 10 structured-document cases; persistence checks include reopen, empty saves, stale revisions and deferred-commit rollback.
- Full Edge run passed 68/69; the final test attempted a disabled list conversion on a heading. Corrected the test to return to Paragraph first; all six word-count tests then passed. All 69 scenarios are covered across these runs, including axe/200% reflow at 320/640/1100px. Browser IPC is test-only; no actual native GUI/restart, real-library mutation or manual screen-reader claim. Next: 3.8, awaiting approval.

## Verification evidence: 3.6

- Added ordered book-scoped chapter selection and previous/next controls inside ChapterEditorDialog. Numbered option labels distinguish duplicate titles while native IDs determine identity. The selector remains on the current chapter until a successful validated read; successful transitions focus the new chapter heading after close protection is ready.
- ManuscriptEditor exposes an explicit prepare-to-leave operation using the existing revision-checked save path. Dirty writing commits before target loading. Clean documents skip saving; pending manual saves block navigation. Transitions are serialized with an immediate ref guard and disabled controls; editing/formatting/manual-save actions are locked during the transition. No debounce or background autosave is introduced.
- Failed saves/conflicts keep the same editor/text and cancel target loading. Failed or unsupported target reads keep the current session/history and restore editing, with an explicit retry for target loading. Retrying a read does not resave already committed writing. Only a validated target replaces the session, keyed by chapter ID; dismissed/unmounted reads cannot enter a new session. Normal close guards remain in place; success-only navigation creates a fresh editor/history for the target rather than retaining undo history across chapters.
- Verified 300 Vitest tests (8 new navigation cases), all 63 Edge tests (9 new), lint, formatting, strict typecheck, production build and diff whitespace checks. Browser coverage includes duplicate-title identities, formatted roundtrip navigation at 320/640/1100px, save-before-read ordering, pending locks, write/conflict/read/unsupported-data failures, retry without duplicate saves, slow reads/repeated clicks, heading focus, axe scans and 200% selector/modal reflow. Test-only IPC remains separate from native persistence; native code/dependencies/schema are unchanged, so Cargo tests were not repeated. No new actual native GUI/restart or manual screen-reader claim. Next: 3.7.

## Verification evidence: 3.5

- Added FormattingToolbar and scoped CSS to ManuscriptEditor: bold, italic, paragraph, headings 1–6, bullet/numbered lists and undo/redo use existing configured Tiptap commands. useEditorState tracks selection/transaction changes independently of the parent editor. Pressed states use aria-pressed; unsupported commands and pending/unready editor actions are disabled. Runtime checks also refuse commands against destroyed/read-only editors. No dependency, schema, IPC or persistence change.
- Toolbar pointer activation preserves the selected fragment and restores editor focus through the command chain. One roving Tab stop with wrapping Left/Right Arrow, Home/End and remembered control skips disabled actions; Enter/Space use native button behavior. Full visible heading names match accessible names, and a forced-colors double border identifies pressed controls. All English labels/help remain centralized.
- Verified 292 Vitest tests (6 new real-editor toolbar cases), all 54 Edge tests (4 new toolbar scenarios plus a pending-save assertion), lint, formatting, typecheck and production build. Browser checks cover actual word selection, all heading levels/list types, undo/redo, save/reopen JSON equality, selection-only state updates, keyboard focus, forced colors, axe and 320/640/1100px with 200% reflow. Browser fixtures use test-only IPC; no native GUI/startup/restart or manual screen-reader claim. Rust/persistence are unchanged; the 53-test native result from 3.4 was not rerun. Next: 3.6.

## Verification evidence: 3.4

- Installed exact Tiptap React/core/pm/StarterKit 3.32.0 after checking official compatibility/docs and npm peer metadata. package-lock.json is updated; installation reports zero vulnerabilities. Lazy editor loading keeps local application/editor chunks below the default warning threshold. No CDN/cloud or SQL migration was added.
- ChapterEditorDialog reads fresh book-scoped content and rejects invalid/unsupported envelopes before Tiptap. editor-schema.ts matches the v1 node/mark grammar, disables unsupported extensions and TrailingNode, validates ProseMirror structure/output and rejects invalid document-changing transactions without truncation. ManuscriptEditor uses labelled multiline rich text with scoped typography/list styling and literal plain-text paste; files/drop are refused visibly.
- Minimal manual save makes the integration usable before autosave: validated JSON and expectedRevision go through the existing native save command; editing/repeated save/close are blocked while pending. Revision and success update only from the committed result. Errors retain writing; conflicts/missing/invalid stored data block stale overwrites. Toolbar/navigation/counting/autosave/status workflows remain later tasks.
- Unsaved dismissal requires saving or explicit acknowledged discard. beforeunload and Tauri close listeners protect normal close requests; editing waits for successful listener registration. Main-window core:window:allow-destroy enables the API's clean-close path after interception. Shared Modal now wraps header controls and constrains its grid to prevent inner overflow at enlarged text. No forced-termination/recovery durability claim.
- Verified 286 Vitest tests (35 new), all 50 Edge tests (9 new), lint, format, typecheck and production build. Tests cover real installed Editor JSON roundtrips/Unicode/formatting and bounded transactions, manual commit/error/conflict/revision handling, discard/close cleanup, invalid content, paste/files and normal native-close event behavior through test mocks. Browser axe/reflow at 320/640/1100px includes 200% internal editor/modal geometry; screenshots inspected after layout correction. Native 53 tests, fmt and Clippy pass. No actual desktop startup/editor save/close/restart was observed. See [TIPTAP_INTEGRATION.md](TIPTAP_INTEGRATION.md) for scope and limits. Next: 3.5.

## Verification evidence: 3.3

- Added ChapterManager, ChapterTitleDialog and DeleteChapter to the selected-book editor context. Displays ordered, ID-keyed chapter rows; create appends through native persistence, rename sends only title/revision, deletion requires an unchecked acknowledgement and explicit destructive action. All English copy is centralized under en.chapters; no manuscript editing, reorder controls, counts or autosave were added.
- Loading, confirmed empty, desktop-only, failed/unsupported-data states are distinct. Rows remain on read failure; writes require a successful read and are serialized while pending. Create/rename merge only committed results and refresh the collection; a failed follow-up read retains the committed row/success notice and blocks new writes. Delete applies the native returned collection/revisions. Request guards and book-ID mounting prevent late reads from entering another book.
- Title drafts survive dismissal and section navigation for the selected book. Conflict reload explicitly refreshes the revision without replacing a rename draft; untouched forms use refreshed row snapshots. Delete conflicts block submission until current details are loaded and acknowledged again. Pending writes cannot be dismissed or submitted twice; failure never reports success. Draft titles are session-local and are not retained after switching to a different book or restarting.
- Accessibility: labelled ordered collection/groups, linked local/native title errors and focus, safe initial Cancel focus, Escape/Enter cancellation, retained drafts, live committed notices, heading focus after success/deletion and appropriate focus after conflict reload. Modal now supports the existing Radix close-focus event to avoid racing automatic trigger restoration; other consumers keep default behavior.
- Verified: 251 Vitest tests (13 new management tests), lint, format, strict typecheck and build; all 41 Edge tests pass (5 new), with the 5 chapter checks repeated after final focus refinements. Browser coverage includes duplicate-title identity, create/rename/delete/cancel/reconfirmation, error/retry feedback, section draft retention, axe WCAG scans at 320/640/1100px and 200% text reflow. Screenshots inspected. Fixtures are test-only IPC, not mock production persistence. Native implementation/schema were unchanged and the 53-test 3.2 record remains historical; no new native GUI/restart, Tiptap or manual screen-reader claim. Next: 3.4.

## Verification evidence: 3.2

- Added append-only migration 003_chapters.sql: STRICT owned chapters, UUID/position/count/revision/content bounds, unique book/position and ON DELETE CASCADE. Registered schema v3; migration tests preserve v1/v2 books and cover-cleanup intents, reject future v4 and retain rollback guarantees. Migrations 001/002 are unchanged.
- Added native chapters module: scoped ordered list/get/create/rename/save_content/delete/reorder, authoritative metadata and bounded content validation, read/IMMEDIATE transactions, separate revision checks, monotonic timestamps and committed-only results. Reorder verifies a full prior order/revision vector and exact ID permutation; temporary safe positions avoid UNIQUE collisions, deletion closes gaps and affected rows advance revisions. Parent metadata remains unchanged; content writes invalidate word_count to null pending 3.7.
- Added registered blocking chapter_commands and typed services/chapters.ts, browser refusal, metadata/body separation and explicit delete confirmation at IPC. Stable error codes conceal SQL details; invalid stored content/order blocks editing without repair. serde_json was already locked/cached and now is a production dependency with explicitly bounded unbounded_depth decoding; no package/version/lockfile change.
- Tests use only disposable databases. Cover CRUD and reopen with Unicode/whitespace/control body preservation, stale writes across two connections, ownership/book cascade, valid/invalid permutations and no-op reorder, revision overflow, injected SQL/deferred-commit rollback, SQL constraints, corrupt/unsupported stored data and UTF-8/node/depth limits. Shared 21-case chapter-content fixtures enforce native/TypeScript agreement. Frontend service tests verify command payloads and failure propagation.
- Verified: 53 native tests, 238 Vitest tests, Cargo fmt/Clippy, frontend lint/format/typecheck/build and diff whitespace checks. No UI/layout changed, so Edge checks were not repeated. No real desktop launch, Tiptap/editor/autosave or forced-interruption verification is claimed. The reusable 2.12 book/cover desktop runner now expects schema v3; its recorded run remains historical v2 evidence. Next approved boundary: 3.3 chapter management UI.

## Verification evidence: 3.1

- Added editor/chapter.ts: readonly metadata, summary/full snapshots, separate metadata/content change inputs, chapter revision tokens and full expected-order/revision vectors. Native-owned ownership/position/count/system fields cannot enter the validated metadata result. Titles normalize trim/NFC, allow Unicode and enforce the 200-code-point/control/surrogate contract.
- Added chapter-content.ts: version-1 typed Tiptap-compatible JSON subset, creation-only empty factory, bounded pure validation and detached copy. Supports paragraphs/headings/hard breaks, bold/italic and nested lists. Preserves body text exactly; rejects unsupported versions/fields/nodes/marks, invalid grammar, cycles, sparse/custom-serialization values and oversized/deep trees without repair/truncation. No Tiptap dependency installed; official schema/source docs consulted.
- [CHAPTER_MODEL.md](CHAPTER_MODEL.md) specifies SQL mapping for a future append-only migration, parent-book ownership/deletion, contiguous ordering, transactional full-vector reorder conflict checks, monotonic chapter revisions, separate content/title writes, derived/unknown word counts and responsibilities of 3.2/3.4/3.7/4.1.
- 213 frontend tests passed, including 44 new chapter metadata/content cases for Unicode preservation, defaults, supported/invalid grammar, version refusal and resource bounds. Typecheck, lint, formatting, production build and diff checks passed.
- No runtime UI, native persistence, schema, dependency or real library changes. Existing 36 Edge checks and 39 native tests/real desktop restart evidence remain historical, not repeated. Actual Tiptap roundtrip/native validation and ordering transactions remain future tasks. Next: 3.2, awaiting approval.

## Verification evidence: 2.12

- Added npm.cmd run test:desktop with Windows-only tests/desktop/restart.ts and scoped window.ps1. Uses real Tauri/WebView2, embedded production frontend, native IPC, SQLite and managed cover files; no mocks or Vite server. Tauri appDirectoriesOverride and a unique WebView profile isolate all test data under .cache/desktop-restart/run-*; production source/config/identifier/data are unchanged.
- Successful run run-jvz0G5 completed five visible native process launches/four full restarts, with native PIDs 18652, 19376, 10436, 22308 and 17644. Windows/title/rendered screenshots inspected. Created duplicate Ukrainian titles with distinct IDs, edited metadata, rejected invalid image bytes, imported a cover and renamed its disposable source; exact snapshots/cover hash survived restart.
- Further relaunches verified metadata edits preserve covers, replacement cleans the old file, cancelled deletion preserves a book, confirmed deletion persists, cover removal persists, and covered-book deletion cleans its managed file. Final relaunch showed a confirmed empty library, zero book rows/files and empty cleanup queue. Read-only database inspection after each close confirmed schema v2, application ID and integrity.
- Every native process closed gracefully with exit code 0. Runner restored the normal debug executable/config context via a default build; report passed=true/restoredDefaultBuild=true and runner exited 0. No production persistence bug required changes. Evidence and reproducible steps: [DESKTOP_PERSISTENCE_REVIEW.md](DESKTOP_PERSISTENCE_REVIEW.md).
- 169 frontend and 39 native tests, strict typecheck, lint, formatting, Cargo fmt/Clippy, isolated/default native debug builds and diff checks passed. Existing 36 Edge checks remain verified in 2.11; no UI/layout source change here. GUI/helper execution required sandbox approval; helper execution-policy override is child-process-only, with no system policy change.
- Milestone 2 acceptance is satisfied for current books/covers. Installer/release/macOS/power-loss/chapter persistence are not claimed. Test artifacts remain ignored and all test windows are closed. Next: 3.1, awaiting approval.

## Verification evidence: 2.11

- Added explicit library loading/list-busy, confirmed-empty, load-error/retry and desktop-only presentation. Empty state uses shared Card and guidance to the existing Create book action. A failed/unsupported read never claims an empty library. Retry is disabled in flight, preserves actionable error context and restores focus after success/failure without moving initial-load focus.
- Fixed list-state races: committing creation/update no longer hides an unresolved initial/retry read or clears its failure. Known committed rows remain visible while listing retries; prior new-row/deletion/stale-response guards remain intact. Empty is shown only after a successful completed list read, not guessed from zero currently known rows.
- Added safe native field-error decoding at the typed service boundary: only known field/code pairs become localized linked form errors. Unknown/malformed responses fall back to generic failure, never raw native text. Local/native field errors announce a summary; focus moves to the first invalid field after native pending state ends. Drafts and values remain intact. Cover errors are linked to their file input and mark invalid-file states specifically.
- 169 frontend tests passed, including loading versus empty, unsupported preview, disabled retry/focus, retained list failure after a successful create, native validation focus/draft retention and malformed IPC issue rejection, plus all prior persistence-service/form regressions.
- All 36 Edge checks passed. New 320/1100px state workflows cover pending reads, failure/retry/empty, local and native field validation, first-field focus, retained values after close/reopen, reflow and axe WCAG scans through isolated test IPC responses. Browser preview remains explicitly desktop-only, without fake persistence.
- Lint, formatting, strict typecheck, production build and diff checks passed. No native/schema/dependency changes or actual library writes; prior 39 native tests remain recorded in 2.7, not rerun. Actual desktop restart verification is the next task, not claimed here. Next: 2.12, awaiting approval.

## Verification evidence: 2.10

- Added pure calculateBookProgress and reusable BookProgress, integrated into BookCard through an optional external wordCount input. Book DTO/schema are unchanged. Counts must come from manuscript aggregation, never title/targets/completion or fake persistence. Current Library supplies no count and therefore remains explicitly unknown; chapter counting/aggregation belongs to 3.7/4.1.
- Handles known zero, partial, reached and exceeded goals; bar/percentage saturate at 100 while preserving actual count and nonnegative excess/remaining words. Percentages round down to one decimal and cannot claim 100 below target. Invalid/missing counts remain unknown; a known count without a valid goal displays words without a percentage/bar. Safe-integer validation rejects coercions, fractions, negatives, infinities and unsafe values; no division by zero.
- 156 frontend tests passed, including safe-integer endpoints, near-target rounding, zero, exceeded and missing/invalid goals/counts, screen-reader range/value text, known/unknown transitions and all prior regressions. Completion remains independent of numerical goal progress.
- All 34 Edge checks passed. New presentation-only fixtures at 320/640/1100px render zero/partial/reached/exceeded/no-target/unknown counts, verify ARIA bounds/actual count text, axe WCAG scans and 200% text reflow. These explicit fixture counts are not a runtime data source.
- Lint, formatting, strict typecheck, production build and diff checks passed. No native/schema/dependency changes; prior 39 Rust tests remain historical evidence, not rerun. No new desktop-window/native IPC/restart claim. Next: 2.11, awaiting approval.

## Verification evidence: 2.9

- Replaced the vertical list layout with CSS Grid auto-fit/minmax columns (18rem minimum capped at 100%). Library alone uses a wider 72rem shell content limit; other sections retain 48rem. Cards stack cover/content within columns. Native list/article semantics, DOM order and mounted draft/cover controls remain intact; no ARIA grid widget or fake keyboard navigation added.
- Added Open book action that loads the latest persisted snapshot through existing get_book by ID before selecting the editor section. The read-only selected-book context shows its title/target and explicitly says chapter editing is coming soon; no chapter editor/autosave is claimed. Back to library restores library navigation/focus without remounting its drafts.
- Pending opens show disabled feedback. Failures/not-found stay in library without removing rows. Request identity guards prevent older responses replacing newer choices, navigation being reversed by late reads and deleted books being reselected. Metadata updates/deletions keep the selected context synchronized within the session. Selection is not persisted across app reload.
- 128 frontend tests passed. New integration tests cover duplicate-title identity, fresh persisted details, keyboard activation/focus, failures/retry, out-of-order responses, navigation during loading and clearing/cancelling selected/deleted book contexts.
- All 31 Edge tests passed. New grid scenarios verify 1/1/2/3 columns at 320/640/1100/1440px, duplicate-title selection through keyboard, correct loaded target/context, return navigation, 200% text reflow and axe WCAG scans. Browser screenshots inspected. Existing CRUD/cards/covers/navigation checks remain passing.
- Lint, formatting, strict typecheck, production build and diff checks passed. Native code, schema and persistence commands are unchanged; prior 39 native tests remain recorded in 2.7, not rerun. Browser fixtures use isolated test IPC; no new native GUI/restart claim. Next: 2.10, awaiting approval.

## Verification evidence: 2.8

- Added BookCard using shared Card and ProgressBar, a named article with the full level-three book title, persisted cover or decorative fallback, formatted optional word target, persisted completion status and existing edit/delete actions. Cards remain a vertical list; responsive grid/open-book behavior stays 2.9.
- Native Book snapshots have no actual manuscript count yet. Progress is explicitly indeterminate with Word count unavailable, no aria-valuenow/percentage/fabricated zero. Completion remains a separate persisted status, not a derived 100% claim. Calculation/aggregation remains future work.
- Extracted CoverImage from cover controls: one native preview read per card, fallback for absent/loading/failed images, browser image-error handling and stale async-response protection. Manage cover is a native keyboard-operable disclosure; its mounted controls preserve selections/drafts across collapse. No persistence/native/dependency changes.
- 121 frontend tests passed. Added card semantics/title/target/unknown-progress checks, completion without invented counts, image error fallback and stale preview response coverage. Existing CRUD/cover tests remain passing.
- 27 Edge tests passed, including new 320/640/1100px card fixtures with Unicode/unbroken long titles, loaded/absent/unavailable covers, completion/no-target states, WCAG scans, disclosures, edit focus restoration and 200% text reflow. Fixed narrow enlarged-text overflow in cover sizing and shell masthead wrapping; reserved fallback content can grow rather than clip. Inspected browser screenshots.
- Lint, strict typecheck, formatting, production build and diff checks passed. Native code/database untouched; prior 39 native tests remain recorded under 2.7, not rerun. Browser fixtures use test-only IPC; no new actual desktop-window/restart or screen-reader claim. Next: 2.9, awaiting approval.

## Verification evidence: 2.7

- Added BookCover with file selection, explicit save, persisted preview, replacement/removal, selected-file retention on failure, conflict reload and pending guards. English copy stays centralized. Cover changes follow creation as separate commits; cards remain 2.8. No arbitrary filesystem API or fake browser persistence.
- Added image 0.25.10 with PNG/JPEG/WebP only after checking official Rust compatibility/decoder docs. Native decoding limits input to 5 MiB/4096px dimensions, normalizes to UUID PNG up to 1200x1600 without upscaling and caps stored bytes at 8 MiB. Independent files per book; only relative references persist.
- Appended migration 002 for pending_cover_cleanup; migration 001 unchanged. New-file intent precedes exclusive write/sync and transactional reference update. Old files queue atomically on replacement/removal/confirmed deletion and clean only after commit. Cleanup retries at startup/cover operations, checks references/containment, refuses reparse points and never scans unrelated files. Deferred cleanup is a separate successful-operation warning.
- 39 native tests passed: supported/corrupt/oversized images, dimension limits, downscaling, source independence, real file/database reopen retention, covered deletion/deferred cleanup, rollback/conflict, durable interrupted cleanup, retained referenced files, v1-to-v2 upgrade and Windows junction protection. All data disposable; actual library untouched.
- 117 frontend tests passed, including cover payloads, preview, upload/removal, failed retry, oversized input, conflict reload, pending duplicate prevention and deferred-cleanup messaging. All 24 Edge tests passed; cover workflows at 320/640/1100px cover invalid input, browser image decoding, preview/removal, reflow and axe WCAG scans with isolated test IPC responses.
- Lint, strict typecheck, formatting, production build, Cargo fmt/Clippy and diff checks passed. No actual native GUI/IPC restart claim; native reopen tests and browser IPC fixtures are separate. See [COVER_STORAGE.md](COVER_STORAGE.md). Next: 2.8, awaiting approval.

## Verification evidence: 2.6

- Added DeleteBook confirmation dialog: selected persisted title, permanent-deletion/unsaved-edit warning, unchecked acknowledgement and disabled delete until explicitly checked. Cancel receives initial focus; Cancel/Escape make no persistence call and reopening resets confirmation. Pending deletion/reload blocks dismissal and repeated actions.
- Registered typed delete_book(id, expectedUpdatedAt, confirmed). Native confirmation=false is rejected; repository requires the exact revision, bound parameters and a committed transaction. Conflict requires loading latest details and confirming again. Failure/not-found/cover-cleanup errors retain the row; success alone removes the matching ID, announces deletion and focuses the Books heading after its trigger disappears.
- Guarded late list responses with session-local deleted IDs so a stale response cannot resurrect a committed deletion. Cancellation leaves the separately mounted editing draft intact. Covered books remain blocked with an explicit explanation until safe managed-file cleanup in 2.7; no filesystem cleanup or new dependency/migration introduced.
- 29 Rust tests passed, including command-boundary confirmation rejection, selected/unrelated book behavior, committed deletion after reopen, stale revision and injected SQL failure retention, cover row/file protection. Synthetic test-only FK tables verify owned cascade and retained history/achievement policy; production currently has only books. No real user database or files modified.
- 110 frontend tests passed: confirmation/cancel/Enter/Escape, pending duplicate guard, error/conflict/reload/reconfirmation, selected identity with duplicate titles, post-delete focus, late-list protection, service payload/error handling and preservation of cancelled editing drafts.
- All 21 Edge tests passed, including deletion at 320/640/1100px with isolated test-only IPC, initial safe focus, cancellation, unchecked reopen, conflict/reconfirmation, WCAG scans, reflow and post-delete focus. Browser IPC responses and native disposable SQLite tests are separate; no actual native GUI/restart claim. Full desktop restart gate remains 2.12.
- Lint, strict typecheck, production build, formatting, Cargo fmt/Clippy and diff checks passed. Next: 2.7, awaiting approval.

## Verification evidence: 2.5

- Added a basic persisted-book selection list and shared BookDetailsDialog for creation/editing. Existing books load on startup; committed creation/updates update their matching IDs without dropping other drafts. A late list response merges with newer local committed snapshots rather than erasing a newly created book. This is not the future card/grid design (2.8/2.9).
- Added list_books/get_book/update_book commands and typed services. Native work runs on spawn_blocking under the managed connection lock; updates require expectedUpdatedAt from the edited snapshot. Conflict/not-found/persistence errors are mapped without exposing database details. No dependency or migration change, no delete IPC.
- Drafts survive close/Escape, navigation and failed writes during the current session. Conflict/not-found blocks saving; the explicitly labelled Replace draft with latest details action fetches the current snapshot and replaces the draft only after a successful read. Failed reload keeps the draft. Successful update installs the committed snapshot/token, closes the dialog and updates the list. Duplicate/pending dismissal guards remain shared with creation.
- 27 native tests passed, including command-boundary update/reopen retention, nullable field clearing, identity/creation-time preservation, stale-write rejection and validation failures. Repository tests additionally cover SQL rollback and cover/completion preservation. All databases disposable; actual library untouched. Cargo fmt/Clippy pass.
- 100 frontend tests passed: edit prefill/normalization/clearing, invalid-field focus, close/reopen, failed save/reload, stale/missing books, pending/duplicate submission, correct selection with duplicate titles, load retry and late listing race. Typed-service tests verify identity/revision payload and native error propagation.
- 18 Edge tests passed. Three editing workflows at 320/640/1100px use a clearly isolated test-only IPC fixture to verify reflow, WCAG scans, keyboard dismissal/focus, draft retention across navigation, failures/conflict recovery and successful list/form updates. Production browser preview still refuses persistence; test fixture is not a production entry.
- Lint, formatting, strict typecheck, production build, Cargo fmt/Clippy and diff checks passed. No real native GUI/IPC restart verification claimed: browser responses and native disposable-database boundary are tested separately. Full desktop restart verification remains 2.12. Next: 2.6, awaiting approval.

## Verification evidence: 2.4

- Added CreateBook.tsx with required title, optional target/daily goal/deadline, linked field errors and first-invalid-field focus. English copy stays centralized. Draft survives dismissal, navigation and failed persistence for the current app session; successful commit resets it. Pending state prevents duplicate submissions and dismissal.
- Added services/books.ts and @tauri-apps/api 2.12.4 (official compatibility/command docs consulted; npm audit: zero vulnerabilities). Registered only create_book; native adapter runs database work on spawn_blocking and serializes safe errors. Existing migration SQL unchanged; no edit/delete/list IPC or cover UI added.
- Native checks: 26 tests passed, including command-boundary real commit/reopen and validation error mapping in disposable databases; fmt and Clippy with warnings denied passed. No actual user database modified.
- Frontend verification: 91 unit/component/service tests, typecheck, lint, formatting and production build. Component tests cover retained drafts, invalid fields, failure/retry, successful reset, pending dismissal and duplicate prevention. Service tests verify native invocation and explicit browser refusal.
- All 15 Edge browser tests passed, including new creation-form validation, focus, draft retention, desktop-only feedback, axe WCAG scans and reflow at 320/640/1100px. Existing navigation/primitives checks still pass.
- No new native GUI launch or end-to-end desktop IPC/restart claim; frontend service and native persistence boundary are tested separately. Book cards/grid remain 2.8/2.9, full actual desktop restart verification remains 2.12. Next: 2.5, awaiting approval.

Each entry describes the repository and environment at that task. Later tasks supersede earlier statements about installed tooling, file paths or pending work.

## Verification evidence: 0.1

- Workspace initially contained only `.git`; `git status --short` was clean.
- `node --version`: v22.12.0; `npm.cmd --version`: 10.9.0; `git --version`: 2.33.0.windows.2.
- `Get-Command` found no Rust/Cargo on PATH. Direct rustc/cargo calls returned 1.61.0; rustup reported the MSVC stable host.
- `vswhere` located VS Build Tools 2017 15.9.40 with C++ tools; SDK directory 10.0.17763.0 exists.
- Registry query detected WebView2 155.0.4283.62.
- No package install, application startup, TypeScript compilation or application tests performed: no application exists.
- Required initial planning documents created and checked for presence; 0.8 acceptance also requires synchronization with the eventual scaffold.

## Verification evidence: 0.2

- Generated official create-vite 9.3.1 react-ts scaffold in a temporary directory; merged selected files without replacing documentation and removed the temporary scaffold.
- Installed React/React DOM 19.3.1, TypeScript 6.0.3, Vite 8.3.5 and plugin-react 6.1.2; lockfile records resolved versions. npm reported zero vulnerabilities.
- `npm.cmd run typecheck`: passed with strict enabled in application and tooling projects.
- `npm.cmd run build`: passed; production assets emitted to ignored dist directory.
- `npm.cmd ls --depth=0`: passed with no missing/invalid top-level dependencies.
- `npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort`: Vite ready; HTTP checks returned 200 for HTML and transformed App.tsx. Server stopped after verification.
- React server-render smoke through Vite SSR loading produced the expected heading and tagline. This is not a visual browser or desktop-window verification.
- `git diff --check`: passed. No test runner yet (Vitest is task 0.6). No Tauri startup claim.
- npm registry access required sandbox escalation after EACCES; installation succeeded with approved network access.

## Verification evidence: 0.3

- Installed local @tauri-apps/cli 2.12.4; npm audit reported zero vulnerabilities. Initialized the official desktop scaffold with existing frontend build/dev hooks.
- Approved rustup update installed rustc/Cargo 1.99.1 MSVC. No C++ tools or WebView2 update was necessary for this build; existing VS 2017 tools linked successfully.
- `npm.cmd run tauri -- info` detected WebView2 155.0.4283.62, VS Build Tools 2017 and the updated Rust/Cargo. @tauri-apps/api is intentionally absent until native commands are needed.
- `npm.cmd run tauri -- build --debug --no-bundle`: passed, including frontend typecheck/build; native compilation finished in 2m 20s and produced `src-tauri/target/debug/write-daily.exe`.
- `npm.cmd run typecheck`: passed separately.
- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`: passed after formatting scaffold files.
- `cargo metadata --manifest-path src-tauri/Cargo.toml --locked --offline --no-deps --format-version 1`: passed. Cargo.lock retained for repeatable dependency resolution.
- Checked desktop version/path configuration and devCsp schema field. Verified target artifacts and generated schemas are ignored by Git.
- No GUI window was opened or visually inspected. Task 0.9 remains incomplete. No installer build/install or application test runner verification was performed.
- `git diff --check`: passed. No automatic commit or push.

## Verification evidence: 0.4

- Checked official Tailwind Vite installation guidance and npm metadata: @tailwindcss/vite 4.3.3 supports Vite 8; project uses Vite 8.3.5.
- Installed tailwindcss and @tailwindcss/vite 4.3.3 as development dependencies and updated npm lockfile; npm audit reported zero vulnerabilities.
- Added the official Vite plugin and CSS import. Moved bootstrap main layout to utilities and explicitly styled the heading because Tailwind Preflight resets default heading styles. Design tokens and components remain milestone 1.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run build`: passed, generated production CSS (5.74 kB).
- Production CSS smoke check: mx-auto, max-w-3xl, px-6, py-16, text-3xl and font-bold selectors exist; Tailwind import resolved.
- `npm.cmd ls tailwindcss @tailwindcss/vite vite`: passed with compatible, deduplicated dependencies.
- No browser visual or desktop launch verification in this subtask. No unit test runner exists yet (task 0.6); no extra test dependencies introduced.
- `git diff --check`: passed.

## Verification evidence: 0.5

- Added ESLint 10.13.0 flat config with @eslint/js, typescript-eslint 8.72.0, React Hooks and Fast Refresh recommended rules. Browser and tooling globals are scoped separately; generated/native build output is ignored. Warning count must be zero.
- Added exact Prettier 3.9.10, eslint-config-prettier, shared EditorConfig defaults and ignores for generated files/lockfiles. Formatted supported existing source/configuration/documentation. Rust remains under cargo fmt.
- Compatibility investigation: Node 22.12 could not satisfy ESLint 10 or transitive eslint-visitor-keys 5. An initial ESLint 9 attempt produced engine/deprecation warnings and was replaced. With explicit installation approval, winget installed official Node LTS 24.22.1 (npm 11.19.1). Final tooling uses ESLint 10 and package engines now reflect its supported Node ranges; npm lockfile synchronized.
- `npm.cmd run lint`: passed. In-memory negative smoke checks confirmed react-hooks/rules-of-hooks and @typescript-eslint/no-explicit-any trigger on violations; generated native output is ignored.
- Prettier negative smoke check rejected deliberately unformatted input.
- `npm.cmd run format:check`: passed after formatting and documentation updates.
- `npm.cmd run typecheck` and `npm.cmd run build`: passed with updated Node/tooling.
- `npm.cmd ls --depth=0`: passed. Final npm installation/audit: zero vulnerabilities.
- `git diff --check`: passed. No desktop recompile or visual launch was needed for tooling configuration; Vitest is still task 0.6.

## Verification evidence: 0.6

- Installed Vitest 5.0.5, jsdom 30.1.3, @testing-library/react 16.3.3, @testing-library/dom 10.4.2 and @testing-library/jest-dom 7.0.1 after checking official guidance and npm compatibility metadata. Installed Node 24.22.1 and Vite 8.3.5 are compatible; package/lockfile Node engine range synchronized with jsdom requirements.
- Added shared test config, explicit DOM cleanup/matchers, npm watch and one-shot test scripts, and a colocated App render smoke test.
- `npm.cmd run test:run`: 1 test file, 1 test passed. Verifies WriteDaily heading and tagline within the main landmark using jsdom.
- `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`: passed; tests/setup are included in strict checking.
- `npm.cmd run format:check` and `git diff --check`: passed after formatting documentation.
- npm reported zero vulnerabilities. No GUI, browser layout, desktop startup, coverage or persistence verification implied by this test.

## Maintenance tasks

- [x] LIB.2 - Move Edit/Delete into card actions. Status: Completed (2026-10-26). Added a top-right three-dot disclosure with labelled toggle, expanded/control semantics, native action buttons, keyboard Tab/Arrow/Home/End, Escape and outside-focus/pointer dismissal. Existing edit/delete dialogs remain mounted so drafts/conflicts/confirmation stay intact; closing returns focus to the visible dots button, while successful deletion keeps library-heading restoration. Open book remains on the card. Added two component cases and three browser scenarios; current coverage is 403 Vitest and 100 Edge tests. The full browser run passed all 97 existing cases; after moving a background-button assertion past modal dismissal (Radix correctly hides the background), all three focused action scenarios passed. Lint, format:check, typecheck/build and diff checks pass. Desktop book scenario selectors now open the disclosure; no desktop rerun or persistence/native change. Roadmap remains awaiting 4.1 approval.
- [x] LIB.3 - Move Manage cover into card actions. Status: Completed (2026-10-27). Moved the existing native details/summary and mounted BookCover controls from the card footer into the dots group between Edit/Delete. File selection survives disclosure/menu dismissal; clicking cover controls keeps the menu open, keyboard traversal includes the summary without intercepting file-control keys, and expanded controls fit a viewport-bounded panel. Added a component retention test and updated card/cover browser paths plus desktop selectors. All 404 Vitest and 100 Edge tests passed; lint, format:check, typecheck, build and diff checks passed. No native/persistence change or desktop rerun. Next roadmap task remains 4.1 awaiting approval.
- [x] LIB.4 - Open Manage cover in a separate modal. Status: Completed (2026-10-27). Replaced the nested disclosure with a secondary button matching Edit/Delete and added BookCoverDialog using the shared Modal. It displays the committed preview and existing choose/save/remove controls, closes the dots group on activation and restores dots focus on dismissal. A synchronous pending callback blocks modal dismissal during save/reload; errors retain the file for retry, and successful results stay visible. Closing ends the file-selection session. Removed obsolete disclosure CSS, updated component/browser tests and native desktop selectors. All 405 Vitest and 100 Edge tests passed; lint, format:check, typecheck, build and diff checks passed. No native/persistence changes or desktop rerun. Roadmap remains awaiting 4.1 approval.
- [x] LIB.5 - Style the cover file picker. Status: Completed (2026-10-27). Added a full-area clickable dashed box with a decorative file-plus SVG matching existing tokens, smaller format guidance and a visible selected filename. The overlaid labelled native input retains keyboard/file-dialog semantics, accept filters, validation and disabled behavior; focus outlines the box. Existing save/remove/commit and pending-modal guards are unchanged. Added one component test and extended three browser cover scenarios with real chooser events at edge/center positions and Space, focus and font-size checks. All 406 Vitest and 100 Edge tests passed, plus lint, format:check, typecheck, build and diff checks. Inspected 320/640px popup screenshots. No dependency/native changes or new drag/drop/clipboard workflow. Roadmap remains awaiting 4.1 approval.
- [x] LIB.6 - Style the committed cover notice above the preview. Status: Completed (2026-10-27). Moved the persistent polite atomic status region above the cover image, using 0.8125rem secondary text and a decorative green outlined check with a shared success token and forced-colors fallback. Commit-only success, cleanup notices and error handling are preserved. All 15 relevant cover/card component tests and all 100 Edge tests passed, including notice geometry/font checks and open-modal axe scans at three widths. Inspected a saved-cover screenshot. Lint, format:check, typecheck, build and diff checks passed. No persistence/dependency changes; next roadmap task remains 4.1 awaiting approval.
- [x] LIB.7 - Center the cover preview in Manage cover. Status: Completed (2026-10-27). Added a scoped controls class and automatic inline margins for the preview. Extended three existing Edge cover scenarios to check horizontal center alignment within 1px at 320/640/1100px; inspected the centered 640px screenshot. All 15 relevant cover/card component tests and all 100 Edge tests passed, plus lint, format:check, typecheck, build and diff checks. No native/dependency changes. Roadmap remains awaiting 4.1 approval.
- [x] LIB.8 - Preview a selected cover before saving. Status: Completed (2026-10-27). Added CoverDraftPreview for bounded local FileReader previews with cleanup/stale-read protection and decode fallback. Selecting a file replaces only the popup image; Save cover still persists bytes before updating the book, and closing discards the unsaved selection. Updated localized copy, existing component/browser paths and added two preview component cases. Browser scenarios verify selection, commit, and discard/reopen for both absent and existing covers at three widths. All 408 Vitest and 100 Edge tests passed, plus lint, format:check, typecheck, build and diff checks. No dependency/native changes. Next roadmap task remains 4.1 awaiting approval.

- [x] LIB.1 - Standardize library card width. Status: Completed (2026-10-26). User-requested fix: one book no longer stretches across the library. Grid uses auto-fill with minmax(min(100%, 18rem), 22rem), retaining aligned empty tracks and a 352px default-size cap. Narrow screens shrink to available width; height remains content-driven. Added three browser regression cases comparing single/populated library widths at 640/1100/1440px. Verified 401 Vitest tests, all 97 Edge tests, lint, format:check, strict typecheck, production build and diff whitespace checks. Persistence/native code is unchanged; no native startup/restart claim. Roadmap remains awaiting 4.1 approval.

- [x] GIT.1 - Extend Git ignore rules. Status: Completed (2026-10-24). Dependencies: existing frontend/Tauri setup. Acceptance: caches, test artifacts and local environment files are ignored; source, lockfiles, required icons and environment templates remain visible.

Verification: `git check-ignore --no-index` assertions passed for 19 ignored paths and 13 retained paths; `git diff --check` passed. Existing src-tauri/.gitignore already excludes native target output and generated schemas. No files deleted or removed from the Git index. At that point task 0.7 was pending; it was subsequently completed as recorded below.

## Verification evidence: 0.7

- Moved App and its existing test to src/app; global stylesheet to src/styles/global.css. Updated React entry imports and extracted the unchanged English messages into app/i18n/en.ts.
- Created approved feature/shared folders using .gitkeep markers. Documented module responsibilities and dependency direction; no product features, persistence implementation or dependencies added.
- `npm.cmd run test:run`: 1 file, 1 test passed at its new location.
- `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`: passed after relocation.
- `npm.cmd run format:check` and `git diff --check`: passed after documentation formatting.
- No Tauri window or installer verification in this task; desktop startup remains task 0.9.

## Verification evidence: 0.8

- Audited all nine required documents against tracked source layout, npm scripts/engines and lockfile, Rust manifest, Tauri configuration/capability and test setup.
- Reconciled current versus planned behavior, historical evidence, milestone counts/status and remaining acceptance gates. Updated setup/build instructions and document links; preserved historical outcomes.
- Corrected inherited Yarn packageManager metadata to npm@11.19.1 to match the actual documented package manager and lockfile. No dependency installation or implementation changes.
- Local Markdown links, documented file paths, npm commands, dependency/version references, task IDs/dependencies and milestone totals passed consistency checks.
- `npm.cmd run format:check` and `git diff --check`: passed. No application tests or native rebuild repeated for documentation/metadata changes.
- Desktop window and React visual verification remain task 0.9; installer/fresh-machine validation remains milestone 8.

## Verification evidence: 0.9

- `npm.cmd run tauri -- dev` (Cargo added to the current session PATH): Vite started at 127.0.0.1:5173; native dev compilation passed in 29.86s; Tauri ran target/debug/write-daily.exe.
- Confirmed the live native window is responsive. Captured only the WriteDaily window through Windows PrintWindow and inspected the screenshot: title bar WriteDaily, React heading WriteDaily, tagline and bootstrap status text are visible; Tailwind spacing/typography is applied. Windows UI Automation also identified WriteDaily web content.
- Local screenshot evidence: `.cache/desktop-verification/writedaily-window.png` (ignored by Git, not a release screenshot). This is visual verification of the actual desktop window, not a simulated DOM test.
- `npm.cmd run test:run`: 1 file, 1 test passed.
- `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run format:check`, `npm.cmd run build`: passed.
- Requested graceful window closure; stopped the development session after inspection. Confirmed WriteDaily process exited.
- Documentation updated and final formatting/diff checks passed. No application behavior or dependency changes were needed.
- Foundation acceptance is complete. Installer, packaged release, macOS, native persistence and extended accessibility checks remain future milestones; only the Windows development window was verified here.

## Verification evidence: 1.1

- Added src/styles/tokens.css with the seven requested palette tokens, accessible secondary text, local UI/writing font stacks and UI/display/writing size/line-height tokens. Imported through global.css and applied semantic utilities to the existing bootstrap page. No font/network dependencies or component features added.
- Calculated sRGB contrast: foreground/background 11.05:1, secondary/background 4.78:1; foreground/surface 12.11:1, secondary/surface 5.24:1. Documented limited use of original muted, accent and sage colors, which do not reach 4.5:1 on these surfaces.
- `npm.cmd run test:run`: 1 file, 1 test passed. Typecheck, lint and production build passed.
- Checked production CSS includes all palette/font variables and the used typography/secondary utilities; CSS imports resolved.
- Ran Tauri dev and inspected a capture of the actual desktop window: warm background, primary text, serif heading/tagline and readable secondary UI copy visible. Local ignored evidence: .cache/desktop-verification/colors-typography.png. Closed window gracefully and stopped test dev session.
- Formatting and git diff checks passed after documentation updates. Application shell remains task 1.2; editor font-size settings remain task 3.11.

## Verification evidence: 1.2

- Added app/AppShell.tsx and app/app-shell.css: semantic header/main, localized keyboard skip link and focusable target, centered readable content, flexible page height and optional navigation slot. Existing bootstrap content renders within the shell.
- Optional sidebar is absent when no navigation is supplied. CSS stacks supplied navigation above content below 48rem; at/above that breakpoint uses a 14rem sidebar and flexible main. No section navigation, fake feature screens or dependencies added.
- Added two shell tests checking skip target/landmarks, absence of empty sidebar and separation of supplied navigation/content. `npm.cmd run test:run`: 2 files, 3 tests passed. Typecheck and lint passed.
- Inspected actual Tauri window at client sizes 1285x812 and minimum 640x480: header/content readable without clipping or visible horizontal overflow. Screenshots ignored locally under .cache/desktop-verification/shell-wide.png and shell-compact.png. Live sidebar navigation remains unimplemented; its keyboard/responsive integration is task 1.3.
- Closed test window gracefully and stopped dev session. Production build, formatting and git diff checks passed after final changes.

## Verification evidence: 1.3

- Added typed section IDs and AppNavigation for My Library, Writing Editor, Goals & Deadlines, Activity Calendar and Achievements. App owns in-memory section state, defaults to My Library and moves focus to the section heading on change. Active button has aria-current=page plus visual weight/background/border cues; native buttons support Tab, Enter and Space.
- Responsive navigation uses two columns above content below 48rem and one sidebar column on larger windows. Brand/tagline remain in the masthead. All section copy is centralized in English messages. Destination views explicitly say Coming soon; no library/editor/statistics/persistence features are claimed or implemented.
- Added @testing-library/user-event 14.6.8 after checking official guidance and npm metadata; npm audit reported zero vulnerabilities. Updated App tests for default section, each of five keyboard destinations, current-item uniqueness, heading focus and pointer return to library.
- `npm.cmd run test:run`: 2 files, 9 tests passed. Typecheck, lint and production build passed.
- Tauri dev visual inspection passed for sidebar and compact layouts. DPI-aware screenshots at 125% Windows scaling covered approximately 1306x862 and 640x481 logical client sizes; all navigation labels remained visible, with vertical scrolling available in compact mode. Local ignored evidence: .cache/desktop-verification/navigation-wide-dpi.png and navigation-compact-dpi.png. Initial non-DPI-aware captures were clipped by the capture tool and superseded.
- Sent Tab/Enter only after confirming WriteDaily was foreground; visually confirmed actual native keyboard transition to Writing Editor. All five destinations additionally verified in DOM keyboard tests.
- Closed the test window gracefully and stopped the dev session. Formatting and git diff checks passed after documentation updates. No router, history persistence or new product feature data added.

## Verification evidence: 1.4

- Added components/ui/Button.tsx and button.css with primary, secondary and ghost variants. Uses native button props/ref, default type=button, explicit submit support, native disabled semantics, visible focus outline, minimum 2.75rem height and wrapping labels. Removed the now-unneeded UI directory .gitkeep marker.
- Navigation uses Button variant=ghost while keeping its active-item styles. No new runtime dependency, demo screen or product action added.
- Added stronger accent/hover tokens to preserve original palette while supporting surface-colored primary-button text. Measured text contrast: 6.62:1 default, 8.66:1 hover. Secondary/ghost text is at least 11.05:1 on supported surfaces; secondary border contrast is at least 4.78:1. Disabled opacity is intentionally distinct; disabled controls remain unavailable to activation/tabbing.
- `npm.cmd run test:run`: 3 files, 13 tests passed. Four new Button tests cover pointer/Enter/Space, disabled interaction and Tab skipping, accidental form submission prevention/explicit submit, ref and native accessible attribute forwarding. All navigation keyboard regressions pass.
- Typecheck, lint and production build passed. Production CSS includes all variants and focus/disabled styles. Formatting and git diff checks passed after documentation updates.
- No native window/screenshot repeated for this component-only change; full visual/accessibility review remains 1.9. To inspect the integrated ghost variant, run npm.cmd run tauri -- dev and Tab through navigation.

## Verification evidence: 1.5

- Added components/ui/Input.tsx and input.css: required visible label, generated or explicit unique ID, optional hint/error, merged external aria-describedby, error-driven aria-invalid, native props/ref and single-line text/numeric/date input types. State and validation stay with the consumer; no form feature or dependency added.
- Styled minimum 2.75rem field height, accessible boundary, focus-visible outline, placeholder, read-only/disabled and error states using shared tokens. Added error #9B443A: contrast 6.34:1 on surface and 5.79:1 on background; normal border/helper contrast remains at least 4.78:1.
- Added six behavioral tests: label focus/keyboard entry, merged descriptions/error removal, unique IDs, disabled Tab skipping/read-only behavior, controlled input and native numeric/ref/required attributes. Corrected the error-removal test fixture to preserve the mounted input when rerendering.
- `npm.cmd run test:run`: 4 files, 19 tests passed. Typecheck, lint and production build passed. A Vite transform smoke check verified Input CSS including label, focus, disabled and error rules.
- Input is not yet used by a product screen, so its component CSS will load when a real consumer imports it. No fake form/search control or visual desktop claim added. Full visual accessibility review remains 1.9 and real form validation remains feature work.
- Formatting and git diff checks passed after documentation updates. Run npm.cmd run test:run -- src/components/ui/Input.test.tsx for focused verification.

## Verification evidence: 1.6

- Added @radix-ui/react-dialog 1.3.1 after checking official docs and npm React 19 peer compatibility; npm audit reported zero vulnerabilities. Radix owns modal focus trapping, Escape/outside dismissal, portal, outside interaction blocking and trigger focus restoration.
- Added Modal.tsx/modal.css with controlled open/onOpenChange, required semantic trigger/title/closeLabel, optional accessible description, shared Button close action, surface/overlay/shadow tokens, scrollable body and persistent visible header. No product dialog or form workflow added.
- Added seven tests covering keyboard open/name/description/initial focus, forward/reverse focus loop, Escape/focus restoration in StrictMode, close/reopen, backdrop dismissal, caller refusal of dismissal while retaining entered data and description omission without Radix warnings.
- `npm.cmd run test:run`: 5 files, 26 tests passed. Typecheck, lint and frontend production build passed.
- Actual Tauri visual preview verified on wide and minimum-size windows with long scrollable content. Compact capture confirms Close remains visible and body scrolling is available. Focus and dismissal behavior are established by automated tests; native SendKeys screenshots were inconclusive and are not counted as additional keyboard evidence.
- Preview HTML/TSX/config were isolated under ignored .cache/modal-preview and removed after closing the window and stopping dev. No permanent demo route or product controls added. Local screenshots remain ignored under .cache/desktop-verification/modal-*.png. Standard debug build without bundling restored the normal desktop configuration afterward.
- Formatting and git diff checks passed after documentation updates. Consumers must decide whether closing an unsaved form is allowed; this component does not implement saving or discard confirmation.

## Verification evidence: 1.7

- Added components/ui/Card.tsx and card.css: a native div container forwarding props/ref and accepting layout className. Uses surface/foreground/border tokens, 0.75rem radius, 1.5rem padding, wrapping text and centralized subtle shadow-card. No interaction, variant abstraction or dependency added.
- Applied Card to existing Coming soon section messages; changed the message title to a level-two heading. These remain unfinished feature notices, not book cards or mock data.
- Updated the existing App render assertion to check the notice heading semantics. `npm.cmd run test:run`: 5 files, 26 tests passed. No separate tests duplicating the presentation-only implementation were added.
- Typecheck, lint and production build passed. CSS smoke check confirmed .card, shadow-card and surface/border variable references in emitted production assets.
- Formatting and git diff checks passed after documentation updates. Native window was not reopened for this simple presentation change; visual review remains 1.9. Run npm.cmd run tauri -- dev to inspect the integrated information cards.

## Verification evidence: 1.8

- Added components/ui/ProgressBar.tsx and progress-bar.css with visible label, stable labelledby ID, progressbar role, minimum 0, configurable maximum/default 100 and synchronized visual/accessibility value. Native div props/ref and caller aria-valuetext pass through; semantics owned by the component cannot be overridden through typed props.
- Finite values clamp to [0,max]. Invalid maxima (nonpositive or nonfinite) fall back to 100. Null/undefined/nonfinite current values are indeterminate: aria-valuenow is omitted and a static centered segment replaces the percentage fill. No animation or new dependencies.
- Added 14 parameterized tests for clamping, invalid maximum, unknown values, ref/ID/localized value text and determinate/unknown transitions. `npm.cmd run test:run`: 6 files, 40 tests passed. Typecheck, lint and production build passed.
- Checked Vite CSS transformation and contrast: strong-accent fill against border track 5.19:1; secondary track boundary against background/surface 4.78:1/5.24:1. Semantics checked against WAI-ARIA progressbar guidance.
- Component is ready for real library/goal consumers; no fictional progress inserted into Coming soon screens. No native visual preview in this task; shared visual/accessibility review remains 1.9.
- Formatting and git diff checks passed after documentation updates. Focused tests: npm.cmd run test:run -- src/components/ui/ProgressBar.test.tsx.

## Verification evidence: 1.9

- Added Playwright 1.64.1 and @axe-core/playwright 4.14.0 after verifying official guidance/npm compatibility. Tests use existing Edge 156.0.4314.42, headless, with an isolated Vite server on 127.0.0.1:5174. No browser download or native configuration change.
- Added typed browser config/tests and a test-only component fixture, included in strict TypeScript through tsconfig.e2e.json. Fixture is not a product route or production JS entry. Generated results/traces are ignored by Git, Prettier and ESLint.
- Browser tests cover all five keyboard destinations, visible skip link/main focus, component disabled/read-only/focus behavior, modal forward/reverse Tab/scroll/Escape/restore, 320/640/1100/1440px layouts, 200% text size and forced colors/reduced-motion media.
- Axe WCAG A/AA tagged scans found zero violations for all five sections, styled shared components and the open modal. No rules were disabled. Browser fixture reported no runtime errors.
- Found/fixed ProgressBar forced-colors contrast loss using scoped Canvas/CanvasText/Highlight rules. Found/fixed test fixture stylesheet import order so scans include actual styled controls; added rendering guards and reran the audit. Reviewed final compact screenshots.
- `npm.cmd run test:e2e`: 12 browser tests passed. `npm.cmd run test:run`: 40 unit/component tests passed. Typecheck, lint, format:check, production build and git diff checks passed.
- Detailed scope/results/limits: [ACCESSIBILITY_REVIEW.md](ACCESSIBILITY_REVIEW.md). No manual screen-reader session, macOS or new native-layer review in this subtask; full release accessibility remains 8.3. Current Milestone 1 keyboard/contrast/responsive acceptance is satisfied.

## Verification evidence: 2.1

- Added features/library/book.ts with readonly BookDetails/Book snapshots and a pure unknown-input metadata validator. Removed the library folder marker now real domain code exists. No dependency, SQL connection, migration, repository, cover import or library UI added.
- Defined title trim/NFC/200-code-point/control-character rules, nullable positive safe-integer goals, canonical calendar dates including leap years and overdue dates, persistence-owned IDs/cover/lifecycle fields and error codes for future localized forms.
- DATA_MODEL.md records SQL field mapping/constraint requirements and future relationships: chapter/settings cascade only on confirmed deletion; activity/achievements remain with detached references; cover cleanup follows successful commit. Derived word counts/progress are not stored redundantly.
- Added 32 domain tests covering normalization/Unicode/title bounds, invalid payloads/counts, safe integer endpoints, real/invalid dates, accumulated errors, input immutability and exclusion of persistence-owned properties.
- `npm.cmd run test:run`: 7 files, 72 tests passed. Typecheck, lint, production build, format:check and git diff checks passed.
- UI/browser tests were not rerun because there is no UI/layout change; the prior 12 browser checks remain recorded in 1.9. No persistence safety or schema execution claim: authoritative native validation and database constraints still require implementation/testing in 2.2/2.3.

## Verification evidence: 2.2

- Added rusqlite 0.40.2 (bundled SQLite), rusqlite_migration 2.6.0, direct thiserror error handling and dev-only tempfile 3.27.0; Cargo.lock updated. Verified dependency compatibility/docs; manifest Rust floor raised from 1.90 to 1.95 for the migration library, with actual checks on installed Rust 1.99.1.
- Added database module and migration 001_books.sql, connected at Tauri setup with app-managed Mutex connection. Debug/release directories are separate. Connection config enables FK, 5s timeout, FULL sync and verified WAL; identity/version/integrity checks precede use. No SQL or CRUD frontend commands added.
- Ten real SQLite native tests passed: fresh/reopen retention/settings, schema constraints, cover uniqueness/title duplication, FK enforcement, initial/upgrade rollback, successful upgrade preserving data/future rejection, unchanged unknown/corrupt files and invalid-directory errors. All test data lives in disposable temp directories.
- `cargo test --manifest-path src-tauri/Cargo.toml --locked --offline`: 10 passed. `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` and `cargo clippy --manifest-path src-tauri/Cargo.toml --locked --offline --all-targets -- -D warnings`: passed.
- `npm.cmd run test:run`: 72 passed; typecheck, lint and production build passed. UI/browser tests were not repeated because UI/layout did not change.
- Tauri dev rebuilt/launched with responsive WriteDaily window. A read-only inspection of the actual development DB confirmed user_version=1, application_id=1464090969, journal_mode=wal and zero books. No real books were inserted/deleted and release DB was not selected. Closed the app gracefully and stopped dev; the empty development DB remains for normal use.
- Added Git ignore rules for local .sqlite3 files/sidecars; migration SQL and both dependency lockfiles remain versioned. Documentation/format/diff checks passed. Native repository validation, CRUD and cover imports remain 2.3 onward.

## Verification evidence: 2.3

- Added src-tauri/src/books/ with native BookDetails/Book DTOs, pure authoritative validation and BookRepository list/get/create/update/delete. Public Rust module only; no book IPC command, frontend persistence mock or UI feature added. Migration 001 is unchanged.
- Writes use bound parameters, IMMEDIATE transactions and return success only after commit. UUID-v4/UTC milliseconds are native-owned; full metadata updates preserve identity/cover/completion. Updates/deletes reject stale updatedAt tokens across connections; timestamps advance monotonically even after clock rollback.
- Read validation rejects noncanonical/malformed stored data without silently repairing/skipping it. Native input decoding rejects unknown/system fields and wrong numeric types. Deleting a book with a cover returns CoverCleanupRequired until confirmed file cleanup is implemented; tests verify the record/file remain intact.
- Added direct chrono/uuid/unicode-normalization/serde dependencies and dev serde_json (most were already transitive); versions/docs checked. Added shared JSON metadata cases exercised by Rust and TypeScript; resolveJsonModule enables typed test fixture imports.
- `cargo test --manifest-path src-tauri/Cargo.toml --locked --offline`: 25 passed (15 repository/contract + 10 database tests). Covers real CRUD/reopen, committed deletion persistence, failure rollback, parameterization, cross-connection conflict, Unicode limits, canonical dates/instants, malformed stored rows and DTO JSON shape. Only temporary databases used.
- `npm.cmd run test:run`: 86 passed, including 14 shared validation fixtures. Typecheck, lint, frontend build, native fmt/Clippy, format:check and git diff checks passed.
- No real app-data books were inserted/updated/deleted. UI/browser checks were not repeated because runtime UI/layout did not change; prior browser evidence remains 1.9. Book creation/IPC wiring is the next task; physical cover validation/deletion remains future work.
