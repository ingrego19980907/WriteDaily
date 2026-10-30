# WriteDaily

Library restore (7.5): choose **Restore library** beside Back up library in My Library, select a WriteDaily ZIP and confirm the checked preview. The app creates a safety backup before replacing the saved library, retains the previous files and rolls back an incomplete swap. After success, **close WriteDaily and open it again**. All **193 Rust, 1049 Vitest and 246 final full-run Edge tests** pass, plus lint/format/typecheck/build and Cargo fmt/Clippy. Real isolated Windows verification passed replacement, safety-copy content and process reopen. No schema or dependency changes. See [restore behavior, safety and limits](docs/LIBRARY_RESTORE.md) and [verification](docs/TASKS.md#verification-evidence-75). Next: 7.6, backup integrity review, after approval.

Repeat the real private Windows restore/reopen scenario with `npm.cmd run test:desktop:restore` after the Cargo PATH setup below. Artifacts are under `.cache/desktop-restart`; the actual library is untouched and the ordinary debug build is restored.

Library backup (7.4): **Back up library** at the bottom of My Library creates a new ZIP with a consistent saved SQLite snapshot, referenced covers and a versioned SHA-256 manifest. It includes goals, activity, achievements and settings, never replaces an existing file and leaves the source library unchanged. All **181 Rust, 1010 Vitest and 238 full-run Edge tests** pass, plus lint/format/typecheck/build and Cargo fmt/Clippy. A real isolated Windows run verified native Save As cancellation, database/cover content and a second backup after process restart. See [format, safety and limits](docs/LIBRARY_BACKUP.md). Restore is now implemented in 7.5 above; these are the historical backup verification totals.

Repeat the real private Windows backup scenario with `npm.cmd run test:desktop:backup` after the Cargo PATH setup below. It stores artifacts under `.cache/desktop-restart`, uses an isolated library and restores the ordinary debug build. Restore is now implemented separately in 7.5, described above.

Portable text export (7.3) is verified for both existing export actions. UTF-8 TXT preserves saved text, readable paragraphs/headings/lists, Unicode and empty blocks; list continuations now keep their indentation after structural hard breaks. Eight new native tests include byte-exact fixtures and chapter/book file checks across disposable database reopen, with unchanged source records. All **170 Rust and 977 Vitest tests** pass, along with lint/typecheck/build and Cargo fmt/Clippy; formatting/diff checks complete documentation review. UI/pickers are unchanged; the Edge/native GUI evidence below belongs to 7.2. See [portable-text contract](docs/PORTABLE_TEXT_EXPORT.md). Next: 7.4, library backup, after review.

Whole-book export (7.2): open a book in Writing Editor and choose **Export book** beside Back to library. One new UTF-8 `.txt` file contains the saved book title and every chapter in manuscript order, including empty chapters. Export reads one consistent SQLite snapshot, refuses stale sources and never overwrites existing files or changes writing/activity. All **977 Vitest, 162 Rust and 234 full-run Edge tests** pass, plus lint/typecheck/build and Cargo fmt/Clippy; formatting checks complete final documentation review. A real isolated Windows run verified native Save As, reordered chapters, exact bytes, individual-export regression and repeat export after restart. See [book export contract and limits](docs/BOOK_EXPORT.md) and [task evidence](docs/TASKS.md#verification-evidence-72). Next: 7.3, portable-text export review, after review.

To repeat real whole-book verification after the Cargo PATH setup below, run `npm.cmd run test:desktop:export -- --book`. The original command without `--book` still verifies individual chapter export. Both use private app data/files and restore the ordinary debug build.

Individual chapter export (7.1): Writing Editor now has an **Export chapter** action in each chapter row. Choose a new `.txt` filename in the native Save As dialog. Export reads the selected saved revision, preserves readable paragraphs/lists and Unicode text, and never overwrites an existing file or changes writing/activity. All **950 Vitest, 153 Rust and 228 full-run Edge tests** pass, plus lint/format/typecheck/build and Cargo fmt/Clippy. A real isolated Windows run verified cancellation, exact file contents, unchanged SQLite tables and repeat export after a full process restart. See [export contract and limits](docs/CHAPTER_EXPORT.md) and [task evidence](docs/TASKS.md#verification-evidence-71). Next: 7.2, whole-book export, after review.

Real native picker/export verification: after the README Cargo PATH setup, run `npm.cmd run test:desktop:export`. It uses a private library, briefly focuses its owned Save As dialog, stores files/reports under `.cache/desktop-restart` and restores the ordinary debug build. It never uses the actual library.

Achievement coverage review (6.7): added eight native integration tests and three notification lifecycle tests; production logic/schema are unchanged. All 922 Vitest and 140 Rust tests pass, along with lint/format/typecheck/build and Cargo fmt/Clippy. The full Edge run passed 222 cases and hit one calendar module-load error (`ERR_NO_BUFFER_SPACE`); all 22 achievement cases passed, and the unchanged calendar suite then passed all 18 cases across three repetitions. See [coverage matrix, evidence and limits](docs/ACHIEVEMENTS_REVIEW.md). Milestone 6's implemented rules/persistence/UI are reviewed; the missing explicit book-completion action remains ACH.1. Next numbered task: 7.1, individual chapter export, after review.

Unlock notifications (6.6): quiet, dismissible notices now appear after confirmed native achievement commits, including inside focus-mode dialogs without taking typing focus. SQLite schema v8 records one-time claims; existing v7 unlocks are silently baselined. Notices close after eight seconds, pausing for hover, keyboard focus and hidden windows. Claims prevent replay after restart; a crash/lost reply after a committed claim can miss the transient notice, while the permanent achievement remains saved. All 919 Vitest, 132 Rust and 223 full-run Edge tests pass, plus lint/format/typecheck/build and Cargo fmt/Clippy. See [notification contract](docs/ACHIEVEMENTS.md#unlock-notifications-66) and [task evidence](docs/TASKS.md#verification-evidence-66). No new native GUI/process-restart session or real-library operation was performed. Next: 6.7, final achievement test coverage review, after review.

Achievements page (6.5): the existing navigation destination now shows all eight milestone cards, confirmed native unlock counts/dates and loading/empty/error/retry states. Existing unlocks stay visible after a failed refresh and across navigation; hidden pages stop their reader. Native reconciliation owns eligibility and persistence. Locked numeric progress stays unavailable because the current native API supplies unlock rows, not aggregate counters. All 900 Vitest and 216 full-run Edge scenarios pass, plus lint/format/typecheck/build. See [page contract](docs/ACHIEVEMENTS.md#production-page-65). No new native GUI/restart session or real-library operation was performed. Next: 6.6, unlock notifications, after review.

Achievement cards (6.4): read-only cards for all eight milestones are ready, with saved-unlock dates, explicit locked/unavailable states and optional confirmed progress. The preview fixture is `/tests/fixtures/achievement-cards.html`; it never writes native data or adds records to the actual library. All 886 Vitest and 206 full-run Edge scenarios pass, along with lint/format/typecheck/build. See [design](docs/DESIGN_SYSTEM.md#achievement-cards-64) and [accessibility review](docs/ACCESSIBILITY_REVIEW.md#achievement-cards-64-2026-10-29). Next: 6.5, the production Achievements page and native data loading, after review.

Achievement persistence (6.3): SQLite schema v7 stores permanent unique unlocks. Native reconciliation runs at startup and atomically with chapter/activity saves and confirmed book deletion. Receipt retries and concurrent refreshes preserve each achievement's original UTC timestamp. Typed read/refresh services are ready for the upcoming achievements UI; cards and notifications remain later tasks. Checks: 867 Vitest tests, 126 Rust tests, lint/typecheck and Cargo Clippy pass; see [persistence contract and verification limits](docs/ACHIEVEMENTS.md#permanent-native-unlocks-63). No new desktop GUI startup was observed. Next: 6.4, achievement cards, after review.

Managed covers are implemented: create a book, then choose its Cover image and Save cover. PNG/JPEG/WebP content is validated natively and saved independently under app data. Preview, replacement/removal and confirmed deletion use revision checks and durable cleanup retries. See [cover storage, limits and failure behavior](docs/COVER_STORAGE.md).

A little writing, every day.

WriteDaily is a planned free, offline-first Windows writing application, with future macOS support. It will combine a personal book library, chapter editor, goals, activity calendar, and achievements.

## Current status

Chapter model/repository 3.1–3.2 are implemented: readonly TypeScript contracts, strict native content validation, SQLite migration 003, revision-checked CRUD/reorder and typed IPC services. See [chapter model/repository contract](docs/CHAPTER_MODEL.md). Chapter management UI (3.3) supports creation, renaming and confirmed deletion. Tiptap 3.32.0 integration (3.4) adds JSON-based chapter editing with manual saving and unsaved-close protection. Formatting (3.5) and chapter navigation (3.6) are implemented. Navigation saves dirty writing before switching; ordinary editing now autosaves after 2 seconds of inactivity. Manual saving remains available. Word counting (3.7) shows live and committed chapter counts using a shared Unicode policy. See [word counting](docs/WORD_COUNTING.md). Autosave (3.8) is implemented; see [autosave and retry policy](docs/AUTOSAVE.md). Save-status presentation (3.9) is implemented; see [save states and error retention](docs/SAVE_STATUS.md). Focus mode (3.10) is implemented; see [focus-mode keyboard and safety behavior](docs/FOCUS_MODE.md). Editor preferences (3.11) persist global manuscript text size from 12 to 32 px in SQLite; see [editor settings](docs/EDITOR_PREFERENCES.md). Desktop editor persistence/recovery checks (3.12) passed across six real Tauri launches; see [editor restart/recovery evidence](docs/EDITOR_PERSISTENCE_REVIEW.md). Recovery preserves the last committed document; unsaved memory-only drafts are not durable. Book aggregation (4.1) is next. See [Tiptap integration](docs/TIPTAP_INTEGRATION.md) for usage and verification limits.

Foundation tasks 0.1-0.9 are complete: environment inspection, React/strict TypeScript/Vite, Tauri 2, Tailwind, ESLint/Prettier, Vitest, application structure, synchronized documentation and verified Windows desktop startup. The UI currently shows a responsive application shell with the WriteDaily brand and five navigable sections. My Library offers creation/editing dialogs, confirmed deletion and a responsive grid of accessible book cards; Writing Editor supports selected-book chapter management and manual text editing; other unfinished sections display Coming soon. Library has book domain types/validation and native SQLite initialization/migrations v1-v4. The Rust book repository is implemented; Book creation is connected to SQLite through Tauri. Editor commit-based recovery is verified; individual chapter export is implemented (7.1); whole-book export, portable text, library backup and validated restore are implemented through 7.5.

Frontend checks, the React DOM smoke test and native development build passed. The Windows Tauri window was opened and its React heading, tagline and status visually verified in task 0.9. Milestone 0 is complete; Milestone 1 (design system, navigation and accessibility/layout review) is also complete; Milestone 2 (tasks 2.1-2.12) is complete, including verified real desktop process restarts for books/covers. Milestone 3 (tasks 3.1–3.12) is complete for the implemented editor and commit-based recovery; 4.1 (book word-count aggregation) awaits approval. See [task status and verification evidence](docs/TASKS.md).

## Prerequisites

- Node.js compatible with all tooling: ^22.22.2, ^24.15.0, or >=26.0.0. Installed LTS version: 24.22.1.
- npm; installed version: 11.19.1. Use `npm.cmd` in this PowerShell environment because its execution policy blocks npm.ps1.
- Rust MSVC toolchain and Cargo on PATH. The manifest minimum is Rust 1.95 (required by the migration library); the verified installed toolchain is 1.99.1. Use the recorded working toolchain or recheck compatibility before updating.
- Supported Microsoft C++ Build Tools with Desktop development with C++ and a Windows SDK.
- Microsoft Edge WebView2 Runtime (detected).

See the official [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) and [Vite guide](https://vite.dev/guide/). Recheck release requirements before installation.

## Setup and frontend commands

```powershell
npm.cmd ci
npm.cmd run dev
```

Open the local URL printed by Vite. Stop the server with Ctrl+C.

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd run preview
```

`typecheck` checks the strict application and tooling TypeScript projects. `build` checks TypeScript and emits production frontend assets to `dist/`. `preview` serves that build locally; it is not a production backend. npm is the project package manager (`packageManager: npm@11.19.1`). Installation is locked by `package-lock.json`; use `npm.cmd ci` for subsequent installations. Do not generate a second package-manager lockfile. Initial dependency installation and the first native compilation require network access; the planned application itself is offline-first.

## Initialization record

The official create-vite 9.3.1 React/TypeScript template was generated in a temporary workspace directory. Selected files were merged without replacing documentation; the temporary scaffold was removed. Template demo assets and its Oxlint setup were omitted: the approved linting choice is ESLint in task 0.5. Both TypeScript projects explicitly enable `strict`.

## Verification status

Tauri 2 compilation and Windows development-window startup are verified using the existing Windows C++ tools, Rust 1.99.1 and Node 24.22.1. React content was visually inspected in the native window, and frontend checks passed. Installer and packaged release verification remain pending; details are tracked in docs/TASKS.md. Native book/cover persistence is additionally verified by five isolated real desktop launches in 2.12. macOS and installer/release packaging remain unverified.

## Desktop development

Real book/cover persistence across process restarts is verified in task 2.12. Run `npm.cmd run test:desktop` with Cargo on PATH for the isolated Windows/WebView2 scenario. It opens five native windows sequentially, stores all test data under ignored .cache/desktop-restart, performs real UI/IPC writes, closes each process gracefully and restores the ordinary debug build. No real library data is used. See [desktop persistence review](docs/DESKTOP_PERSISTENCE_REVIEW.md) for prerequisites, scoped PowerShell execution, artifacts and coverage limits.

Rust/Cargo 1.99.1 MSVC are installed on this machine. Cargo is not in the inherited terminal PATH; add it for the current PowerShell session (adjust for a different account):

```powershell
$env:Path = "$env:USERPROFILE\.cargo\bin;" + $env:Path
npm.cmd run tauri -- info
npm.cmd run tauri -- dev
```

Vite is fixed to 127.0.0.1:5173 with strict port selection so Tauri always loads the intended frontend. Close the application and stop the development process when finished.

```powershell
npm.cmd run tauri -- build --debug --no-bundle
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
```

The build checks the frontend and compiles `src-tauri/target/debug/write-daily.exe` on Windows without creating an installer. Release compilation/packaging uses `npm.cmd run tauri -- build`; that command and the generated installers have not yet been verified. Both npm and Cargo lockfiles should be retained. Windows installer verification is deferred to release tasks. The bundled icons are temporary Tauri scaffold assets, to be replaced in task 8.5. The application identifier is `app.writedaily.desktop`; review it before first distribution because it affects platform identity and storage paths.

## Styling

Tailwind CSS 4.3.3 is integrated using @tailwindcss/vite, following the [official Vite setup](https://tailwindcss.com/docs/installation/using-vite). `src/styles/global.css` imports Tailwind; use static utility class names in React components. No separate Tailwind or PostCSS configuration is needed for this setup. The shell and navigation use semantic utility classes. Palette and typography tokens are centralized in `src/styles/tokens.css`; the existing page uses the warm background, readable text colors and local UI/serif fonts. The responsive AppShell is implemented; Button, Input, Modal, Card and ProgressBar are implemented; accessibility/layout review passed in task 1.9. See [design system](docs/DESIGN_SYSTEM.md) for token usage and contrast limits.

## Linting and formatting

```powershell
npm.cmd run lint
npm.cmd run lint:fix
npm.cmd run format:check
npm.cmd run format
```

`lint` checks JavaScript/TypeScript plus recommended React Hooks and Fast Refresh rules, failing on warnings. `lint:fix` applies available safe lint fixes. Prettier checks/formats supported source, configuration and documentation files. Generated output, native icons and lockfiles are excluded. Prettier uses two-space indentation, single quotes for JavaScript, no semicolons, trailing commas and LF line endings; `.editorconfig` shares whitespace defaults with editors. Rust remains formatted by `cargo fmt`.

ESLint uses flat configuration in `eslint.config.js`. `eslint-config-prettier` disables conflicting stylistic lint rules; Prettier runs separately. TypeScript's strict compiler checks remain a separate command. Optional editor extensions: ESLint (`dbaeumer.vscode-eslint`) and Prettier (`esbenp.prettier-vscode`); command-line checks work without them.

## Tests

```powershell
npm.cmd run test:run  # Run once (also suitable for CI)
npm.cmd test          # Watch mode in an interactive terminal; press q to exit
```

Vitest 5 uses the shared Vite configuration and jsdom for DOM tests. React Testing Library checks rendered UI through accessible queries; jest-dom adds DOM assertions. Tests are colocated as `src/**/*.test.ts` or `src/**/*.test.tsx`. Import `test`, `expect` and hooks explicitly from `vitest`; test globals are disabled. `src/test/setup.ts` registers matchers and cleans up mounted React trees after each test. Strict TypeScript checks include tests and setup code.

The current 446 tests cover editor preference validation/IPC/pending/commit-only display, focus-mode keyboard/state preservation, save-state transitions/error retention, autosave debounce/serialization/retry, word counting/live-versus-committed values, navigation save/read/failure handling, formatting toolbar state/commands/keyboard behavior and Tiptap schema/serialization/manual saving/close guards, chapter management, domain/content contracts and typed IPC services, shared native/frontend validation fixtures, book metadata validation, ProgressBar normalization/semantics, Modal focus/dismissal, Button/Input interactions, native semantics and field accessibility plus shell landmarks/skip target, initial My Library section, all five keyboard navigation destinations, active-item uniqueness, heading focus and pointer return to the library. These simulated DOM tests are complemented by 110 real Edge browser tests. Native persistence has 68 Rust tests; release accessibility testing remains future work.

## Application structure

- `src/main.tsx`: React mounting and global stylesheet import.
- `src/app/`: App composition, colocated smoke test and centralized English copy in `i18n/en.ts`.
- `src/styles/`: Tailwind entry and global CSS.
- `src/features/library/`: book domain types, validation and library UI; `src/features/editor/`: chapter contracts/validation, with chapter management UI. Goals, activity and achievements remain reserved.
- `src/components/ui/`: shared Button, Input, Modal, Card and ProgressBar components; `src/services/`: typed book/chapter IPC; `src/hooks/`, `types/`, `utils/`: shared code boundaries.
- `src/test/`: shared test setup.
- `src-tauri/`: Rust desktop host and Tauri configuration.

Reserved folders use `.gitkeep` markers; product feature implementations come later. See [architecture](docs/ARCHITECTURE.md) for responsibilities and dependency boundaries. The current interface and test behavior are unchanged by the reorganization.

## Documentation

| Document                                             | Purpose                                                          |
| ---------------------------------------------------- | ---------------------------------------------------------------- |
| [PRODUCT](docs/PRODUCT.md)                           | Product vision, version 1 scope and exclusions                   |
| [ARCHITECTURE](docs/ARCHITECTURE.md)                 | Current structure, module boundaries and proposed persistence    |
| [DESIGN_SYSTEM](docs/DESIGN_SYSTEM.md)               | Implemented tokens/typography and planned component rules        |
| [DATA_MODEL](docs/DATA_MODEL.md)                     | Proposed entities, activity policy and backup design             |
| [ROADMAP](docs/ROADMAP.md)                           | Milestone goals and completion gates                             |
| [TASKS](docs/TASKS.md)                               | Progress source of truth, dependencies and verification evidence |
| [DECISIONS](docs/DECISIONS.md)                       | Dated decisions and historical environment changes               |
| [ACCESSIBILITY_REVIEW](docs/ACCESSIBILITY_REVIEW.md) | Audit matrix, findings, reproduction and limits                  |
| [AGENTS](AGENTS.md)                                  | Concise instructions for future agent sessions                   |

Unimplemented data models and durable crash-draft recovery remain proposals until their implementation tasks verify them. Activity/streaks and backup/restore now have the verified contracts linked above. Historical decisions describe the environment at the time of each task; current prerequisites are listed above. Fresh-machine setup and Windows installer validation remain release tasks.

## Application shell

`src/app/AppShell.tsx` provides the masthead, keyboard skip link and main content area. App supplies five section buttons through its optional navigation slot. Main content adapts to the supported minimum desktop size (640x480); the layout was visually checked in Tauri at minimum and wider sizes. Accessibility/layout verification passed in 1.9; book metadata, SQLite/migrations and Rust repository are implemented; book creation, editing, confirmed deletion and managed covers are implemented; book cards and library grid are implemented; progress calculation/presentation is implemented; empty/loading/error states and localized validation are implemented; desktop restart persistence is verified; chapter model, repository, management and Tiptap manual editing are implemented; the formatting toolbar is implemented; chapter navigation is implemented; word counting is implemented; autosave is implemented; save-status presentation is implemented; focus mode is implemented; editor preferences are implemented; desktop editor commit-based restart/recovery is verified; book aggregation is implemented; daily goal configuration/display (4.2) is implemented; total word goals (4.3) are implemented; deadlines (4.4) are implemented; required writing pace (4.5) is next. Run `npm.cmd run tauri -- dev` with Cargo on PATH to inspect the current shell.

## Section navigation

My Library opens by default. Use Tab/Shift+Tab to reach section buttons, then Enter or Space to select one. After changing sections, focus moves to the new main heading. The active item is emphasized visually and marked aria-current=page. Navigation appears as a sidebar on wide windows and a two-column group above content on compact windows. The keyboard skip link bypasses navigation.

Section selection is local React state; restarting/reloading returns to My Library. No URL routing, history or persistent navigation setting is introduced. The library and selected-book chapter management are connected to native persistence. Opening Writing Editor without selecting a book still shows a placeholder; manual manuscript editing and formatting controls are available; goals, activity and achievements remain future work.

## Shared Button

Import Button from `src/components/ui/Button.tsx`. Choose primary, secondary or ghost using variant, and pass native props such as onClick, disabled, aria-label and ref. Default type is button; explicitly pass type=submit for form submission. Text labels and keyboard focus are supported; no loading or link behavior is built in. Navigation already uses ghost. See [design system](docs/DESIGN_SYSTEM.md) for colors, contrast and state rules.

## Shared Input

Import Input from `src/components/ui/Input.tsx` and provide a visible label. Optional hint/error strings are linked to the field, with generated IDs unless you supply a unique id. Native props/ref, controlled or uncontrolled values, required, disabled and readOnly are supported. Supply localized messages from the consuming feature; the component does not validate or save values. The book creation dialog uses it.

```tsx
<Input label="Book title" hint="Use a working title." required />
```

Focused verification: `npm.cmd run test:run -- src/components/ui/Input.test.tsx`. Full visual integration comes with real forms; see [design system](docs/DESIGN_SYSTEM.md) for the supported types and error/focus rules.

## Shared Modal

Import Modal from `src/components/ui/Modal.tsx` and supply controlled state, one semantic trigger (such as Button), title, closeLabel and children. Description is optional. Text comes from the caller's localized copy.

```tsx
<Modal
  open={open}
  onOpenChange={setOpen}
  trigger={<Button>Open details</Button>}
  title="Details"
  description="Review the details below."
  closeLabel="Close"
>
  <p>Dialog content</p>
</Modal>
```

Radix Dialog handles trapped focus, background interaction, Escape/backdrop/Close dismissal and focus restoration. The caller can refuse a closing state change when unsaved content needs a decision. Modal does not save data or confirm discarding edits. Long content scrolls under a visible header/Close action. No product screen opens a modal yet. Focused tests: `npm.cmd run test:run -- src/components/ui/Modal.test.tsx`.

## Shared Card

Import Card from `src/components/ui/Card.tsx` to group related content on a warm surface with consistent border, padding, rounding and subtle shadow. It accepts native div props/ref and className; use semantic headings and buttons/links inside as needed. It adds no automatic interactivity or keyboard stop.

Existing Coming soon messages use Card, so `npm.cmd run tauri -- dev` shows the integration. Library book cards and their data/actions remain later feature work.

## Shared ProgressBar

Import ProgressBar from `src/components/ui/ProgressBar.tsx`, provide label and actual value/max. It clamps finite values to the range; invalid maximum falls back to 100. Omit value (or pass null) for unknown progress; nonfinite current values also become indeterminate. Unknown state has no completion percentage and does not animate. The component has no interactive keyboard behavior or automatic live announcements.

```tsx
<ProgressBar label="Book progress" value={wordCount} max={targetWordCount} />
```

The visible label names the progressbar for assistive technology. Optional aria-valuetext can provide localized word-count wording. No real progress feature is wired yet, so no example values appear on product screens. Focused verification: `npm.cmd run test:run -- src/components/ui/ProgressBar.test.tsx`.

## Browser accessibility and layout checks

```powershell
npm.cmd run test:e2e
```

Requires a supported installed Microsoft Edge (tested with 156.0.4314.42). Playwright uses channel msedge, starts/stops Vite on port 5174 and runs headless; no browser download is performed. Keep that port free. Playwright/axe checks real keyboard interaction, modal focus, responsive reflow, 200% text size, rendered contrast and forced colors. There are 110 browser scenarios verified in the full regression run, and 446 passing Vitest tests. Library progress uses persisted chapter totals; empty books are zero and legacy unknown counts remain unknown. See [book word counts](docs/BOOK_WORD_COUNTS.md) for refresh and failure behavior.

`tests/fixtures/components.html` and its TSX entry are test infrastructure covering otherwise unconnected primitives. Global CSS must load before component imports, as in src/main.tsx. The fixture is absent from the production JS entry bundle. Screenshots and failure traces are generated under ignored test-results directories. Browser test/config/fixture code is strictly checked by tsconfig.e2e.json.

See [accessibility/layout review](docs/ACCESSIBILITY_REVIEW.md) for evidence and limits. Automated passes do not establish full WCAG conformance or replace future manual screen-reader and release checks.

## Book metadata model

`src/features/library/book.ts` defines BookDetails, Book and validateBookDetails. The validator normalizes valid editable metadata or returns field/error codes; it never saves a book or accepts system-owned fields into its output. Titles support Unicode, nullable goals use positive safe integers, and deadlines remain local YYYY-MM-DD dates. See [data model](docs/DATA_MODEL.md) for limits, planned SQL mapping and deletion relationships.

Focused verification: `npm.cmd run test:run -- src/features/library/book.test.ts`. Native SQLite/migrations v1-v2 and Rust repository are implemented. Book creation uses a typed Tauri command; editing uses a revision-checked update command.

## SQLite and native tests

Real editor process restart/interruption verification (isolated Windows Tauri windows):

```powershell
$env:Path = "$env:USERPROFILE\.cargo\bin;" + $env:Path
npm.cmd run test:desktop:editor
```

This performs six real process launches with private app-data, including two deliberate forced stops. It verifies committed content/formatting/count/revision, font settings, rapid navigation, native close protection and recovery of the last commit after an interrupted SQLite write. Unsaved memory-only drafts do not survive a forced stop. The ordinary debug build is restored afterward. See [editor persistence/recovery review](docs/EDITOR_PERSISTENCE_REVIEW.md).

SQLite is bundled through rusqlite; no separate SQLite installation or server is needed. On startup the Rust database module opens/migrates an app-managed database. Debug uses <app_data_dir>/development/write-daily.sqlite3; release uses <app_data_dir>/write-daily.sqlite3. On Windows app_data_dir normally resolves to %APPDATA%/app.writedaily.desktop. Keep the application identifier stable to preserve storage location.

```powershell
$env:Path = "$env:USERPROFILE\.cargo\bin;" + $env:Path
cargo test --manifest-path src-tauri/Cargo.toml --locked
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --locked --all-targets -- -D warnings
```

Sixty-six native SQLite/book/chapter/cover/preference tests use isolated temporary directories and never the actual library. Both npm and native tests matter; Vitest does not exercise native persistence. First native build/test requires network access for Cargo packages; subsequent runs can use --offline when cached. Rust 1.99.1 was verified; older manifest-compatible toolchains were not separately tested.

Database startup enables foreign keys, a 5-second busy timeout, synchronous FULL and WAL, and refuses foreign/newer/corrupt schemas without resetting data. Current initialization failures stop startup and report the native error in the development terminal; there is no recovery UI yet. No arbitrary SQL interface is exposed to React.

Migration SQL under src-tauri/migrations is source code: commit it and never edit released steps; append new ones. Local .sqlite3/-wal/-shm artifacts are ignored. Do not copy a live database file alone for backup because WAL may contain recent commits; snapshot backup/restore is implemented in tasks 7.4–7.5. See [data model](docs/DATA_MODEL.md) for constraints, migration behavior and native repository and managed cover storage.

## Native chapter repository

`src-tauri/src/chapters/` implements book-scoped list/get/create/rename/save_content/delete/reorder with authoritative content validation, separate chapter revisions and atomic writes. Migration 003 adds chapters to schema v3; v1/v2 upgrades preserve existing books/cover cleanup. Book deletion cascades to owned chapters. `src/services/chapters.ts` exposes typed commands and refuses browser persistence. ChapterManager connects list/create/rename/delete and conflict reloads in the selected-book editor context. Chapter text uses the revision-checked body service through Tiptap manual saving and debounced autosave; chapter order can be changed using drag handles or accessible up/down controls (ED.19). Focused native checks: `cargo test --manifest-path src-tauri/Cargo.toml --locked chapters::tests`. See [chapter contract](docs/CHAPTER_MODEL.md) for IPC, limits and failure behavior. Chapter persistence is verified with disposable native databases and the actual desktop editor restart/recovery run in 3.12. The historical 2.12 record covers books/covers only.

## Native book repository

`src-tauri/src/books/` provides native list/get/create/update/delete with validated metadata and real SQLite transactions. Create/list/get/update and confirmed delete are exposed through typed Tauri commands. The library uses a basic list for selecting metadata to edit; the responsive grid opens the selected persisted book in its chapter management/editor context; manuscript editing with manual saving and debounced autosave is connected. UUIDs/timestamps are generated natively; update/delete require the loaded updatedAt token and return Conflict if stale. Malformed stored data is reported rather than silently filtered or rewritten. Covered-book deletion queues cleanup transactionally and reports deferred cleanup separately from committed deletion.

Focused native tests: `cargo test --manifest-path src-tauri/Cargo.toml --locked books::tests`. Existing migration SQL is unchanged. Shared test fixtures in tests/fixtures/book-details.json exercise Rust/TypeScript normalization and dates; no test writes to the actual user library. Library CRUD, managed covers, cards/grid, progress presentation and state/validation handling are implemented. Real desktop restart persistence is verified; chapter model, repository, management and Tiptap manual editing are implemented; the formatting toolbar is implemented; chapter navigation is implemented; word counting is implemented; autosave is implemented; save-status presentation is implemented; focus mode is implemented; editor preferences are implemented; desktop editor commit-based restart/recovery is verified; book aggregation is implemented; daily goal configuration/display (4.2) is implemented; total word goals (4.3) are implemented; deadlines (4.4) are implemented; required writing pace (4.5) is next.

Daily goals: set an optional positive whole number in Create book or dots > Edit book. Blank removes the goal. The saved target appears on cards and in the editor; today's activity/progress remains later work. See [daily goals](docs/DAILY_GOALS.md).

Font size now formats selected text or future typing, alongside bold/italic, and saves with chapter content. The editor does not change the whole document through a global font preference or display settings-save captions. Existing v1 content remains supported; inline sizes use content v2. See [inline font size](docs/INLINE_FONT_SIZE.md).

Underline (ED.13) is available after Italic in both toolbar modes and persists with chapter content v3. Versions 1 and 2 remain readable; no SQL migration is required. Current verification: 459 Vitest, 112 Edge and 69 Rust tests. See [underline formatting](docs/DESIGN_SYSTEM.md#underline-formatting-ed13).

Focus alignment (ED.15) supports left/center/right/justified paragraph and heading alignment, persisted in chapter content v4 with v1-v3 compatibility. The formatting panel uses smaller 36px baseline controls. Current verification: 491 Vitest, 113 Edge and 70 Rust tests. See [alignment controls](docs/DESIGN_SYSTEM.md#focus-alignment-and-smaller-controls-ed15).

Named fonts (ED.16): the editor has twenty system-font choices for selections or subsequent typing, saved with content v5 (v1-v4 compatible). Fonts are resolved locally with generic fallbacks; no font binaries/network fonts are added. Current verification: 547 Vitest, 113 Edge and 71 Rust tests. See [named font families](docs/DESIGN_SYSTEM.md#named-font-families-ed16).

Chapter text now opens as a read-only preview. Select Start writing to edit in focus mode; leaving writing preserves the session while hiding formatting/save controls. Preview restrictions, autosave and close guards are covered by updated component/browser tests. See [preview flow](docs/DESIGN_SYSTEM.md#preview-before-writing-ed17).

A4 writing pages (ED.18): text automatically flows through fitted A4-proportion sheets; Add page appends a manual sheet at the chapter end. Manual breaks save with content v6, with v1-v5 compatibility. Current verification: 565 Vitest, 119 Edge and 72 Rust tests, plus final dedicated repagination tests. See [A4 pages](docs/A4_PAGES.md).

Total word goals (4.3) use saved chapter counts and optional book targets. A reached target is shown on cards and editor book headers; it does not automatically mark the book complete. See [total goals](docs/TOTAL_WORD_GOALS.md).

Task 4.3 verification: 569 Vitest, 124 Edge and 73 Rust tests passed, including optional total-target persistence, committed-count achievement and safe recalculation. Next: 4.5 (required writing pace).

Deadlines (4.4) appear on cards and editor book headers using local-calendar missing/upcoming/today/overdue states, refreshing across midnight/resume. Completed books keep dates informationally. See [deadlines](docs/DEADLINES.md). Next: 4.5 (required writing pace).

Task 4.4 verification: 597 Vitest, 130 Edge and 74 Rust tests passed, including local-midnight/timezone interpretation, retained deadline drafts, native reopen/removal and completed-book presentation.

Required writing pace (4.5): the pure calculation handles inclusive scheduled days, rounded-up words/day, missing configuration, unknown totals, overdue dates and reached/completed books. See [writing pace](docs/WRITING_PACE.md). Presentation follows in 4.6; preferred-day configuration follows in 5.7.

Writing pace presentation (4.6): library cards and editor headers now show the required words per writing day and available days, with missing/unknown/overdue/reached/completed guidance. Values use committed totals and refresh across local midnight. See [writing pace](docs/WRITING_PACE.md#presentation-46). Next: 4.7 (calculation coverage review).

Milestone 4 is complete through 4.7. The calculation review adds cross-domain goal/deadline/pace tests and independent schedule/rate checks; see [calculation test review](docs/GOAL_CALCULATION_TESTS.md). Next: 5.1 (activity record design).

Chapter ordering (ED.19): drag the dotted handle or use up/down buttons in Writing Editor. Order updates appear after a successful commit; Reload chapters is now an icon beside Create chapter. See [ordering and verification](docs/CHAPTER_ORDER.md). Next numbered subtask: 5.1 (activity record design).

Activity model (5.1): readonly domain contracts and a tested net-delta policy define paste credit, import/restore exclusion, local edit-time attribution and retained history. Atomic receipts, capture and persistence remain 5.2; schema and existing saves are unchanged. See [activity model](docs/ACTIVITY_MODEL.md). Checks: 636 Vitest tests, lint, formatting, strict TypeScript/build and diff checks passed. Next numbered task: 5.2 (atomic activity recording).

Activity recording (5.2): content saves now atomically persist edit-time activity, receipts and day plans in SQLite schema v5 (migration 005). Retries reuse frozen operation IDs; subsequent edits save separately, without duplicate credit. Existing writing upgrades without fabricated history. See [activity recording](docs/ACTIVITY_MODEL.md#save-integration-and-final-checks-52). Checks: 642 Vitest, 142 Edge and 83 Rust tests plus lint/format/typecheck/build and Cargo fmt/Clippy. No new native GUI session was run. Next: 5.3 (daily statistics).

Daily statistics (5.3): read-only native queries now provide inclusive local-date totals and sealed per-book goal results, with validated frontend service getDailyStatistics. Global history retains deleted sources; empty days do not inherit current goals. Checks: 662 Vitest and 92 Rust tests, lint/format/typecheck/build, Cargo fmt/Clippy and diff checks passed. Schema stays v5; no UI/native GUI run added. See [daily statistics](docs/DAILY_STATISTICS.md). Next: 5.4 (activity calendar).

Activity calendar (5.4): open Activity Calendar to browse monthly credited-word intensity, select day details and historical book goals, filter a book or view retained global history. Includes Today/Refresh, keyboard navigation and compact/enlarged layouts. Checks: 672 Vitest and 148 Edge scenarios passed, with six final calendar reruns plus lint/format/typecheck/build and diff checks. See [calendar behavior and verification](docs/ACTIVITY_CALENDAR.md). Next: 5.5 (current streak).

Current streak (5.5): My Library and Activity Calendar now show completed goal days and today credited words from native history. An unfinished today has grace; confirmed scoped days off are neutral. Missing history shows a lower bound or insufficient-history message instead of an invented break/zero. Calendar month navigation does not change the current streak; book filtering changes its scope. Checks: 696 Vitest, 152 Edge and 99 Rust tests plus lint/format/typecheck/build, Cargo fmt/Clippy and diff checks. See [streak rules](docs/STREAKS.md). Next: 5.6 (longest streak).

Longest recorded streak (5.6): My Library and Activity Calendar show the historical maximum, its completed date interval and the recorded-history start. Confirmed scoped rest is neutral; unknown past dates split runs and show a lower bound. Equal records keep the earliest run. The read-only calculation scans all recorded dates in one snapshot, including histories longer than a year; source deletion does not erase global history. All 717 Vitest, 154 Edge and 103 Rust tests passed, plus lint/format/typecheck/build and Cargo fmt/Clippy. See [streak rules](docs/STREAKS.md). Next: 5.7 (preferred writing days).

Preferred writing days (5.7): choose weekdays for all books in Goals & Deadlines. Save applies changes from the next local day; clearing every day pauses scheduled goals while writing remains available. SQLite schema v6 (migration 006) retains effective schedule and book-goal history so old results stay stable and empty dates can be classified honestly. Required pace uses today's original and tomorrow's changed schedule. Checks: 737 Vitest, 110 Rust, lint/format/typecheck/build and Cargo fmt/Clippy passed. Browser evidence covers 158 distinct scenarios: 157 passed in the full run; a book-creation Vite bootstrap failure passed on an isolated three-viewport rerun. All four new schedule cases passed in the full run. No new desktop GUI observation. See [preferred days](docs/WRITING_SCHEDULE.md). Next: 5.8 (date/timezone edge-case review).

Editor entry (ED.20): Writing Editor shows Start editing when no book is active. Choose a saved book in the popup to open its chapters; an empty library shows No books have been created yet. Loading errors offer retry, and cancelling the chooser prevents a late response from activating a book. Checks: all 740 Vitest and 163 Edge tests passed, plus lint, formatting, strict TypeScript/build and diff checks.

Cozy sidebar (LIB.9): a 220px default-size desktop rail holds the feather wordmark and Lucide navigation icons, with warm cream/beige styling and a wrapping top layout on narrow windows. Existing destinations, including Writing Editor, stay available. Statistics is disabled because it has no route yet. Library content and persistence are unchanged. Lucide React 1.63.0 is pinned after checking its React 19 peer support and [official React guidance](https://lucide.dev/guide/react/getting-started).

Sidebar verification (LIB.9): all 742 Vitest tests and 166 full-run Edge cases passed, plus final app/navigation cases, lint, formatting, strict TypeScript/build and diff checks. Desktop/compact screenshot review and 200%/forced-color/axe checks passed. See [task tracker](docs/TASKS.md) and [accessibility review](docs/ACCESSIBILITY_REVIEW.md). Redesign is paused at the review boundary; library content is unchanged.

My Library header (LIB.10): the page title now uses a larger fluid serif treatment, a decorative brown leaf and the existing story subtitle in warm brown, with generous left-aligned spacing. It reuses local font/color tokens and the existing Lucide dependency; other page headers, library features and persistence stay unchanged.

Header verification (LIB.10): all 742 Vitest and 166 Edge tests passed, plus lint, formatting, strict TypeScript/build and diff checks. Dedicated header crops/reflow were checked at normal and 200% text across four window sizes. See [task tracker](docs/TASKS.md); awaiting review before another redesign task.

Header writing statistics (LIB.11): My Library shows a compact real-data summary of current streak, saved credited words today and recorded book goals completed today. It reuses the current streak read and existing daily statistics API, retains lower-bound/unavailable states, refreshes with the library lifecycle and ignores stale day replies. The responsive surface uses Flame/Pencil/Target icons and existing typography, with a decorative muted-orange token. Existing calculations and persistence are unchanged; no sample product values are introduced.

Writing statistics verification (LIB.11): all 750 Vitest tests and 171 Edge cases passed, plus lint, formatting, strict TypeScript/build and diff checks. Loading/zero/unavailable/lower-bound states, native response values, read sharing, midnight/stale/inactive behavior and compact/200%/axe/forced-color presentation are covered. No existing calculation or persistence changes. See [task tracker](docs/TASKS.md); awaiting redesign review.

Header alignment (LIB.12): statistics sit to the right of My Library on wide windows, with an italic subtitle and a brighter filled orange/gold flame. The header wraps on narrow/enlarged layouts; compact metric labels/values stay aligned. Data sources and calculations are unchanged.

Header alignment verification (LIB.12): all 750 Vitest and 171 Edge tests passed, with explicit side-by-side/top/value alignment and italic-subtitle checks plus compact/200%/axe/forced-color coverage. Lint, formatting, strict TypeScript/build and diff checks passed. See [task tracker](docs/TASKS.md); awaiting review.

## Date/timezone verification (5.8)

Milestone 5 acceptance is complete. The date/timezone audit found no production logic defect: tests verify edit-time local labels, midnight/DST refresh, travel across the date line, immutable retries, daily totals, both streaks and next-day schedules without rewriting recorded history. All 778 Vitest, 114 Rust and 201 full-run Edge tests passed, plus lint, formatting, typecheck/build and Cargo fmt/Clippy. No real library or host clock/timezone was changed. Run the focused browser matrix with `npm.cmd run test:e2e -- tests/e2e/date-time.spec.ts`; see [review and limits](docs/DATE_TIME_REVIEW.md). Next: 6.1, define achievement rules, awaiting approval.
