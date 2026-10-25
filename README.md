# WriteDaily

Managed covers are implemented: create a book, then choose its Cover image and Save cover. PNG/JPEG/WebP content is validated natively and saved independently under app data. Preview, replacement/removal and confirmed deletion use revision checks and durable cleanup retries. See [cover storage, limits and failure behavior](docs/COVER_STORAGE.md).

A little writing, every day.

WriteDaily is a planned free, offline-first Windows writing application, with future macOS support. It will combine a personal book library, chapter editor, goals, activity calendar, and achievements.

## Current status

Chapter model/repository 3.1–3.2 are implemented: readonly TypeScript contracts, strict native content validation, SQLite migration 003, revision-checked CRUD/reorder and typed IPC services. See [chapter model/repository contract](docs/CHAPTER_MODEL.md). Chapter management UI (3.3) now supports creation, renaming and confirmed deletion; Tiptap integration (3.4) is next. No manuscript editor or autosave exists yet.

Foundation tasks 0.1-0.9 are complete: environment inspection, React/strict TypeScript/Vite, Tauri 2, Tailwind, ESLint/Prettier, Vitest, application structure, synchronized documentation and verified Windows desktop startup. The UI currently shows a responsive application shell with the WriteDaily brand and five navigable sections. My Library offers creation/editing dialogs, confirmed deletion and a responsive grid of accessible book cards; other sections display Coming soon. Library has book domain types/validation and native SQLite initialization/migrations v1-v2. The Rust book repository is implemented; Book creation is connected to SQLite through Tauri. Chapter editor, autosave, export and backup remain planned.

Frontend checks, the React DOM smoke test and native development build passed. The Windows Tauri window was opened and its React heading, tagline and status visually verified in task 0.9. Milestone 0 is complete; Milestone 1 (design system, navigation and accessibility/layout review) is also complete; Milestone 2 (tasks 2.1-2.12) is complete, including verified real desktop process restarts for books/covers. Tasks 3.1–3.3 (chapter model/repository/management UI) are complete; 3.4 (Tiptap integration) awaits approval. See [task status and verification evidence](docs/TASKS.md).

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

The current 251 tests cover chapter management, domain/content contracts and typed IPC services, shared native/frontend validation fixtures, book metadata validation, ProgressBar normalization/semantics, Modal focus/dismissal, Button/Input interactions, native semantics and field accessibility plus shell landmarks/skip target, initial My Library section, all five keyboard navigation destinations, active-item uniqueness, heading focus and pointer return to the library. These simulated DOM tests are complemented by 41 real Edge browser tests. Native persistence has 53 Rust tests; release accessibility testing remains future work.

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

Data model, autosave, streak and backup policies remain proposals until their implementation tasks verify them. Historical decisions describe the environment at the time of each task; current prerequisites are listed above. Fresh-machine setup and Windows installer validation remain release tasks.

## Application shell

`src/app/AppShell.tsx` provides the masthead, keyboard skip link and main content area. App supplies five section buttons through its optional navigation slot. Main content adapts to the supported minimum desktop size (640x480); the layout was visually checked in Tauri at minimum and wider sizes. Accessibility/layout verification passed in 1.9; book metadata, SQLite/migrations and Rust repository are implemented; book creation, editing, confirmed deletion and managed covers are implemented; book cards and library grid are implemented; progress calculation/presentation is implemented; empty/loading/error states and localized validation are implemented; desktop restart persistence is verified; chapter model, repository and management UI are implemented; Tiptap integration is next. Run `npm.cmd run tauri -- dev` with Cargo on PATH to inspect the current shell.

## Section navigation

My Library opens by default. Use Tab/Shift+Tab to reach section buttons, then Enter or Space to select one. After changing sections, focus moves to the new main heading. The active item is emphasized visually and marked aria-current=page. Navigation appears as a sidebar on wide windows and a two-column group above content on compact windows. The keyboard skip link bypasses navigation.

Section selection is local React state; restarting/reloading returns to My Library. No URL routing, history or persistent navigation setting is introduced. The library and selected-book chapter management are connected to native persistence. Opening Writing Editor without selecting a book still shows a placeholder; manuscript editing, goals, activity and achievements remain future work.

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

Requires a supported installed Microsoft Edge (tested with 156.0.4314.42). Playwright uses channel msedge, starts/stops Vite on port 5174 and runs headless; no browser download is performed. Keep that port free. Playwright/axe checks real keyboard interaction, modal focus, responsive reflow, 200% text size, rendered contrast and forced colors. There are 41 passing browser tests and 251 passing Vitest tests. Known-count progress scenarios use isolated presentation fixtures; current library counts remain unknown until chapter aggregation is available.

`tests/fixtures/components.html` and its TSX entry are test infrastructure covering otherwise unconnected primitives. Global CSS must load before component imports, as in src/main.tsx. The fixture is absent from the production JS entry bundle. Screenshots and failure traces are generated under ignored test-results directories. Browser test/config/fixture code is strictly checked by tsconfig.e2e.json.

See [accessibility/layout review](docs/ACCESSIBILITY_REVIEW.md) for evidence and limits. Automated passes do not establish full WCAG conformance or replace future manual screen-reader and release checks.

## Book metadata model

`src/features/library/book.ts` defines BookDetails, Book and validateBookDetails. The validator normalizes valid editable metadata or returns field/error codes; it never saves a book or accepts system-owned fields into its output. Titles support Unicode, nullable goals use positive safe integers, and deadlines remain local YYYY-MM-DD dates. See [data model](docs/DATA_MODEL.md) for limits, planned SQL mapping and deletion relationships.

Focused verification: `npm.cmd run test:run -- src/features/library/book.test.ts`. Native SQLite/migrations v1-v2 and Rust repository are implemented. Book creation uses a typed Tauri command; editing uses a revision-checked update command.

## SQLite and native tests

SQLite is bundled through rusqlite; no separate SQLite installation or server is needed. On startup the Rust database module opens/migrates an app-managed database. Debug uses <app_data_dir>/development/write-daily.sqlite3; release uses <app_data_dir>/write-daily.sqlite3. On Windows app_data_dir normally resolves to %APPDATA%/app.writedaily.desktop. Keep the application identifier stable to preserve storage location.

```powershell
$env:Path = "$env:USERPROFILE\.cargo\bin;" + $env:Path
cargo test --manifest-path src-tauri/Cargo.toml --locked
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --locked --all-targets -- -D warnings
```

Fifty-three native SQLite/book/chapter/cover tests use isolated temporary directories and never the actual library. Both npm and native tests matter; Vitest does not exercise native persistence. First native build/test requires network access for Cargo packages; subsequent runs can use --offline when cached. Rust 1.99.1 was verified; older manifest-compatible toolchains were not separately tested.

Database startup enables foreign keys, a 5-second busy timeout, synchronous FULL and WAL, and refuses foreign/newer/corrupt schemas without resetting data. Current initialization failures stop startup and report the native error in the development terminal; there is no recovery UI yet. No arbitrary SQL interface is exposed to React.

Migration SQL under src-tauri/migrations is source code: commit it and never edit released steps; append new ones. Local .sqlite3/-wal/-shm artifacts are ignored. Do not copy a live database file alone for backup because WAL may contain recent commits; snapshot backup/restore is planned in milestone 7. See [data model](docs/DATA_MODEL.md) for constraints, migration behavior and native repository and managed cover storage.

## Native chapter repository

`src-tauri/src/chapters/` implements book-scoped list/get/create/rename/save_content/delete/reorder with authoritative content validation, separate chapter revisions and atomic writes. Migration 003 adds chapters to schema v3; v1/v2 upgrades preserve existing books/cover cleanup. Book deletion cascades to owned chapters. `src/services/chapters.ts` exposes typed commands and refuses browser persistence. ChapterManager connects list/create/rename/delete and conflict reloads in the selected-book editor context. Body/reorder services are not exposed as UI controls yet. Focused native checks: `cargo test --manifest-path src-tauri/Cargo.toml --locked chapters::tests`. See [chapter contract](docs/CHAPTER_MODEL.md) for IPC, limits and failure behavior. Chapter persistence is verified with disposable native databases and reopen tests; the 2.12 real desktop restart record covers books/covers only.

## Native book repository

`src-tauri/src/books/` provides native list/get/create/update/delete with validated metadata and real SQLite transactions. Create/list/get/update and confirmed delete are exposed through typed Tauri commands. The library uses a basic list for selecting metadata to edit; the responsive grid opens the selected persisted book in a read-only editor context; chapter management is connected; manuscript editing remains planned. UUIDs/timestamps are generated natively; update/delete require the loaded updatedAt token and return Conflict if stale. Malformed stored data is reported rather than silently filtered or rewritten. Covered-book deletion queues cleanup transactionally and reports deferred cleanup separately from committed deletion.

Focused native tests: `cargo test --manifest-path src-tauri/Cargo.toml --locked books::tests`. Existing migration SQL is unchanged. Shared test fixtures in tests/fixtures/book-details.json exercise Rust/TypeScript normalization and dates; no test writes to the actual user library. Library CRUD, managed covers, cards/grid, progress presentation and state/validation handling are implemented. Real desktop restart persistence is verified; chapter model, repository and management UI are implemented; Tiptap integration is next.
