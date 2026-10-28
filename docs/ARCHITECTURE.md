# Architecture

Desktop editor recovery (3.12): test:desktop:editor drives the real embedded Tauri app across six isolated process launches. Exact persisted/editor snapshots survive normal restarts, rapid navigation and an interrupted active SQLite transaction; normal close protects dirty writing. Recovery restores the last successful commit, not unsaved in-memory drafts. No recovery journal or production hook was added. Private SQL fault injection and owned-child termination live only in the desktop test harness. See [EDITOR_PERSISTENCE_REVIEW.md](EDITOR_PERSISTENCE_REVIEW.md).

Editor preferences (3.11): pure editor-preferences.ts validates global font size/snapshots; a narrow service calls get/save_editor_preferences; EditorPreferencesPanel owns load/draft/commit feedback. ChapterEditorDialog applies only committed sizes through a rem-based manuscript CSS variable and combines preference/content pending refs for navigation/mutation/close locks. Rust editor_preferences owns strict singleton reads and revision-checked IMMEDIATE updates, adapted through preference_commands. Append-only migration 004 advances SQLite to v4 without changing manuscript rows. No dependency/native capability change. See [EDITOR_PREFERENCES.md](EDITOR_PREFERENCES.md).

Focus mode (3.10): ChapterEditorDialog owns a session-local layout flag and pressed header toggle. Modal's optional fullscreen/header-action/Escape props expand the same dialog; ManuscriptEditor hides distractions without remounting Tiptap or changing autosave/revision state. First Escape restores the normal layout and button focus; normal Close still uses existing dirty/pending guards. Header actions remain available during writes and are locked during chapter transitions. No native/dependency/persistence change. See [FOCUS_MODE.md](FOCUS_MODE.md).

Save status (3.9): ManuscriptEditor derives preparing/neutral/waiting/saving/committed/paused/blocked/unavailable state and passes it to the feature-local SaveStatus presentation. The named polite/atomic region never infers success before native commit. Separate retained save errors survive edits and close notices until successful retry; commits clear stale close feedback. Session keys isolate chapter status. No persistence/dependency change. See [SAVE_STATUS.md](SAVE_STATUS.md).

Autosave (3.8): ManuscriptEditor restarts a 2-second timer after accepted content changes. The timer, manual action and navigation flush share one guarded save path with revision reuse after commit; pending writes retain existing editing/toolbar/navigation locks. Failures pause automatic writes until explicit successful retry and remain visible through edits. Session cleanup cancels timers; no native/dependency/schema change or recovery journal. See [AUTOSAVE.md](AUTOSAVE.md).

Word counting (3.7): feature-local TypeScript derives the current editor count; Rust derives the authoritative committed count within the existing content transaction. Both consume the same pinned Unicode 17.0.0 category table under resources/unicode. Current edits and last committed values remain separate in the UI; legacy NULL is preserved until explicit save. Stored known-count mismatches fail without repair. No schema/dependency change or read-side backfill. Book aggregation is implemented in 4.1 and autosave in 3.8. See [WORD_COUNTING.md](WORD_COUNTING.md).

Chapter navigation (3.6): ChapterEditorDialog receives book-scoped ordered summaries and owns selector/previous/next transitions. ManuscriptEditor supplies a prepare-to-leave promise: dirty text must commit through the existing revision-checked save before the target is read. The current editor is locked but retained until validated success; write failures abort navigation, read failures retain the current document with retry. Immediate ref guards serialize transitions, tokens invalidate dismissed reads, and only a successful new chapter ID remounts the editor. Parent mutation locking includes both outgoing saves and target reads. No timer/autosave service, new persistence or dependencies were added. See [TIPTAP_INTEGRATION.md](TIPTAP_INTEGRATION.md).

Formatting toolbar (3.5): FormattingToolbar subscribes to Tiptap selection/transactions using useEditorState and composes existing commands for marks, headings, paragraph, lists and history. It preserves selected text on pointer activation, restores writing focus, exposes pressed/available states and supports roving keyboard navigation. ManuscriptEditor supplies the pending/ready lock. This is feature-local UI; JSON schema, persistence, native code and dependencies are unchanged. See [TIPTAP_INTEGRATION.md](TIPTAP_INTEGRATION.md).

Tiptap integration (3.4): ChapterEditorDialog loads fresh chapter JSON and validates the domain envelope plus installed ProseMirror schema before mounting ManuscriptEditor. editor-schema.ts owns the exact v1 extension subset and bounded transaction/output validation; no HTML persistence or automatic trailing nodes. The editor is a lazy local chunk. Minimal manual save uses existing native revision-checked content IPC and retains writing on failure/conflict. Modal/beforeunload/native close guards require saving or acknowledged discard; core:window:allow-destroy is scoped to main for clean close through the Tauri listener API. Normal-close protection is not durable crash recovery. Toolbar controls are connected in 3.5 and chapter navigation in 3.6; word counts are implemented in 3.7; autosave is implemented in 3.8; save status is implemented in 3.9. See [TIPTAP_INTEGRATION.md](TIPTAP_INTEGRATION.md).

Chapter model/repository (3.1–3.2): features/editor owns readonly chapter contracts and pure validation; src-tauri/src/chapters owns authoritative validation and scoped SQLite CRUD/reorder. Migration 003 adds chapters, chapter_commands registers blocking IPC adapters, and services/chapters.ts supplies typed frontend calls. Metadata normalizes titles; body text is preserved exactly. Read transactions validate stored collections; IMMEDIATE writes compare chapter revisions/full reorder snapshots and commit before returning success. Invalid content/order fails without repair. [CHAPTER_MODEL.md](CHAPTER_MODEL.md) records details/limits. Chapter management UI is connected in 3.3; Tiptap editing with manual saving is connected in 3.4; word counting is implemented in 3.7; autosave is implemented in 3.8.

Desktop restart verification (2.12): a separate Node/Playwright runner builds an isolated Tauri debug variant with CLI-only appDirectoriesOverride, attaches to the actual embedded WebView2 over loopback CDP and exercises native book/cover persistence through real UI controls. Win32 checks/captures prove visible native windows, and process exit/new PIDs prove full restarts. Read-only SQLite checks corroborate committed snapshots/files after shutdown. No production hook, mock IPC, filesystem permission or schema change is added. The ordinary debug build is restored afterward. See [DESKTOP_PERSISTENCE_REVIEW.md](DESKTOP_PERSISTENCE_REVIEW.md).

Library states/validation (2.11): list loading/error/success is independent of mutation success and currently known rows. Only a successful finished list read can establish an empty library; a committed create does not resolve a failed/pending listing. Retry retains failure context, blocks duplicate attempts and restores appropriate focus. Browser-only errors explain the desktop requirement without offering a futile list retry. The service boundary allowlists native metadata field/code issues; BookDetailsDialog renders localized linked errors/summary and focuses the first invalid field after pending ends. Malformed errors stay generic, and drafts survive. Native validation remains authoritative; no schema/persistence change.

Book progress (2.10): book-progress.ts derives a validated unknown/no-target/determinate state from external word count and optional target. BookProgress translates it into centralized English copy and shared ProgressBar semantics. BookCard accepts optional wordCount without adding a persisted field to Book. In 4.1, CountedBookCard supplies totals derived by book-word-count.ts from validated persisted chapter snapshots, refreshed per library visit with stale-response guards. ChapterManager uses the same pure aggregation for its committed collection. Unknown is preserved rather than manufacturing zero; an empty collection is zero. See [BOOK_WORD_COUNTS.md](BOOK_WORD_COUNTS.md). Known counts without goals have no percentage, exceeded goals preserve actual counts/excess with a capped bar, and completion never substitutes for a count. No persistence/native change.

Library grid/opening (2.9): Library preserves the semantic keyed list and uses CSS auto-fill/minmax for responsive columns capped at 22rem (352px at the default root size), keeping a single card the same width as a populated row. AppShell widens only library content to 72rem; other sections keep 48rem. App owns session-only selected Book and guarded asynchronous opening through get_book(id). A successful fresh read selects the editor section and focuses its heading; a failure leaves library rows intact. Navigation/new selection/deletion invalidates older reads. Library mutations synchronize or clear the selected snapshot. The editor destination now includes chapter management (3.3), with Tiptap manual manuscript editing in 3.4. Returning to library keeps its mounted drafts. No router, dependency, native command or schema added.

Book cards (2.8): Library keeps the keyed vertical list and delegates each item to BookCard. Card presentation composes shared Card/ProgressBar, a full-title labelled article, target/completion metadata and existing CRUD controls. CoverImage owns the single managed preview read, stale-response guard and fallback; BookCover retains mutation controls behind a native disclosure with preview disabled to avoid duplicate reads. No manuscript count is available in Book: progress is indeterminate with an explicit unavailable description; cards never synthesize zero/percentage from metadata. Native/data model are unchanged. Grid/open behavior and progress calculations remain separate approved tasks.

Managed covers (2.7): BookCover passes selected bytes through set_cover and reads previews through read_cover by book ID/current reference. Rust CoverStore owns decoding, normalized UUID PNG files and queued cleanup. Migration 002 stores cleanup intent; SQLite transactions coordinate reference changes, old-file queueing and covered-book deletion. Files are written/synced before their references commit. Deferred cleanup is a separate successful-operation warning. See [COVER_STORAGE.md](COVER_STORAGE.md).

Confirmed deletion (2.6): DeleteBook owns the displayed snapshot, explicit acknowledgement, pending state and error/reconfirmation flow. It calls only typed delete_book with id/revision/confirmed=true after user action. Native rejects false confirmation and stale versions; repository deletion returns after commit. Library removes only that ID, guards against resurrection from a late list response, announces success and moves focus to the surviving Books heading. Cancellation preserves editing drafts. In 2.7 the coordinator also handles covered-book deletion and reports queued cleanup separately. Chapters are implemented in 3.2; activity/achievement tables remain planned.

Book editing (2.5): Library loads persisted snapshots through list_books and renders a basic title/action list. BookDetailsDialog shares field parsing, validation and pending guards with creation. Each editor owns its draft and base snapshot/token; props/list changes do not replace unsaved work. update_book requires id plus expectedUpdatedAt, modifies metadata only and resolves after commit. Conflict or missing-book results preserve the draft and block saving. Only an explicit Replace draft with latest details action calls get_book and replaces the draft after success. List loading rejects stale requests after unmount and merges late results with newer committed local snapshots. Browser editing verification uses isolated test-only IPC responses; actual persistence is verified by native temporary-database tests. Cards/grid, deletion and covers remain later tasks.

Book creation (2.4): CreateBook owns an in-memory draft that stays mounted across section changes. Closing/Escape preserves it for the current app session; restart recovery is not promised. The form validates metadata and uses services/books.ts to invoke create_book. Browser preview explicitly reports that desktop is required and never simulates saving. The async native command moves database locking and repository work into spawn_blocking, returns a committed snapshot, and maps failures to codes without exposing SQL/path details. Pending submission blocks duplicate activation and dialog dismissal. Success clears the draft and closes the dialog. Listing/cards, editing, deletion and cover selection remain subsequent tasks.

Status: Foundation complete through task 0.9, including Windows development-window visual verification; application structure established in task 0.7. React/Vite, Tauri, Tailwind, lint/format tooling and Vitest are configured. Book metadata, native SQLite/migration and Rust repository are implemented through 2.12, including creation, revision-checked editing, confirmed deletion and managed covers. Other product features remain planned. Runtime entry is `src/main.tsx`, application composition is `src/app/App.tsx`, and global CSS is `src/styles/global.css`.

## Technology direction

Tauri 2 desktop host; React + strict TypeScript + Vite frontend; Tailwind for styling; SQLite for structured data; Tiptap for rich text. Add Lucide, Motion and Playwright only when their approved tasks require them. Vitest currently runs 446 domain/component/service/editor tests and 110 Edge scenarios verified in the full browser run. Native persistence is additionally covered by 68 Rust tests. Resolve compatible stable versions during each setup task and commit dependency lockfiles once generated.

## Organization

```text
src/
  main.tsx             React DOM mounting and global CSS import
  app/
    App.tsx            application composition and current-section state
    AppNavigation.tsx  accessible section navigation
    navigation.ts      ordered section IDs and SectionId type
    AppShell.tsx       responsive header/main and optional navigation slot
    app-shell.css      shell layout and responsive navigation area
    App.test.tsx       colocated render smoke test
    i18n/en.ts         centralized English UI copy
  components/ui/       shared Button/Input/Modal/Card/ProgressBar
  features/
    library/           book metadata validation and creation dialog; basic selection list and creation/editing dialogs; future cards/covers
    editor/            chapters and writing
    goals/             targets and deadlines
    activity/          writing events, calendar and streaks
    achievements/      achievement evaluation and presentation
  hooks/               shared React behavior when needed
  services/            typed native book creation boundary
  styles/global.css    Tailwind entry and global styles
  styles/tokens.css    palette, fonts and typography theme variables
  types/               genuinely shared types when needed
  utils/               small shared pure functions when needed
  test/setup.ts        test matchers and DOM cleanup
src-tauri/             desktop host; future database and managed filesystem access
docs/                  product, architecture, decisions and task tracking
```

Reserved directories contain only `.gitkeep` markers so Git retains the approved structure. They contain no working features, placeholder services or mock persistence. Add implementations during their approved tasks; avoid empty abstractions. UI invokes typed services; services cross a narrow Tauri boundary; persistence owns validation, migrations, transactions and managed file access. Components never issue raw SQL or arbitrary filesystem calls. Decide exact Rust command/plugin boundaries before task 2.2; only the existing main-window core capability is granted; no persistence plugin permissions are configured.

## Reliability contract (verified in 3.12)

Debounce chapter saves by 2 seconds after edits (implemented in 3.8); serialize writes per chapter, attach revisions, and atomically persist content and word count. Activity capture and atomic persistence are implemented in 5.2; reporting/calendar/streaks remain 5.3 onward. Status transitions: unsaved → saving → saved only after successful commit; errors remain visible with retry and retained text. Flush pending work on chapter navigation. Closing must wait for pending saves or show a recoverable failure decision, never silently discard text. Last committed body/count/revision recovery after forced transaction interruption is verified in 3.12. Edits still only in memory before commit are non-durable and were lost in the explicit interruption test. No durable recovery journal or zero-loss crash/power-loss guarantee is implemented.

## Cross-platform and localization

Resolve storage paths via Tauri application directories, never hardcode user paths. Keep UI messages centralized; use locale-aware formatting and local calendar-day activity keys. No network services, account system or production backend. The Vite development server is development tooling only.

## Desktop bootstrap (0.3)

`src-tauri` contains the Rust entry point, Tauri build script, configuration, generated scaffold icons and default core capability for the main window. Custom commands expose book CRUD/covers and chapter list/get/create/rename/save_content/delete/reorder; no arbitrary filesystem, shell or SQL commands are exposed. Native SQLite initialization runs internally. The frontend uses @tauri-apps/api 2.12.4 for typed invocation. serde_json is a production dependency for bounded manuscript decoding; chapter management/body commands are wired to selected-book UI; reorder commands remain unused. Main-window core:window:allow-destroy supports the registered close guard's clean-close API path.

Desktop hooks run the existing npm dev/build scripts. Vite uses fixed loopback port 5173 and ignores Rust changes; Tauri owns Rust rebuilds. Production CSP restricts scripts to bundled code; development CSP additionally permits Vite's loopback HTTP/WebSocket endpoint and React refresh preamble. No remote content is loaded.

## Styling bootstrap (0.4)

Tailwind CSS 4.3.3 runs as the official Vite plugin, supporting the installed Vite 8.3.5. The CSS entry imports Tailwind, including Preflight. Static React class names generate build-time CSS; there is no runtime CDN dependency. Bootstrap layout uses utilities; tokens and component design remain deferred to milestone 1. No extra PostCSS configuration or legacy Tailwind configuration file is introduced.

## Quality tooling (0.5)

ESLint 10 flat configuration uses recommended JavaScript/TypeScript rules plus React Hooks and Fast Refresh checks for frontend files. Browser globals apply only to source files; root tooling uses Node globals. Strict TypeScript compilation remains separate from linting. Prettier 3 runs independently, with eslint-config-prettier last to disable conflicting style rules. EditorConfig aligns indentation and line endings. Native/generated artifacts and lockfiles are excluded from formatting; Rust uses cargo fmt. Node LTS 24.22.1 was installed to meet supported tooling requirements.

## Frontend testing (0.6)

Vitest 5.0.5 uses shared Vite configuration with jsdom 30.1.3 and React Testing Library. Only colocated src/**/*.test.{ts,tsx} files are collected; no test globals are injected. Setup imports jest-dom Vitest matchers and registers explicit afterEach cleanup. TypeScript includes both tests and setup. The initial test exercises accessible main/heading semantics and product identity. Node engine requirements now reflect the stricter jsdom range; installed Node 24.22.1 already satisfies it. DOM tests do not establish layout correctness or desktop integration.

## Module boundaries (0.7)

`main.tsx` only mounts React and imports global styling. `app` composes the application and owns application-wide messages. Features own their UI, domain calculations and colocated tests. Keep feature-specific hooks/types/helpers within their feature; move them to shared folders only when there is actual reuse. Shared UI and utilities must not depend on feature implementations. Features may use shared UI/services but must not reach into another feature's internal files; define a small explicit interface if a real cross-feature need emerges. Do not add barrel exports or path aliases until useful.

Persistence belongs behind `services` and native Tauri code, with UI consuming typed operations. Do not add direct SQL/filesystem access to components. `test/setup.ts` is testing infrastructure only and is not imported by runtime code. English strings are centralized in `app/i18n/en.ts`; no translation runtime or language switching is claimed yet.

## Current configuration and pending gates

npm 11.19.1 is the declared package manager; package-lock.json and src-tauri/Cargo.lock are the dependency resolution records. package.json requires Node ^22.22.2, ^24.15.0 or >=26.0.0; installed Node 24.22.1 meets that range. The Rust manifest uses edition 2024 and minimum Rust 1.95; native compilation passed with Rust/Cargo 1.99.1 in task 0.3.

Tauri identifies the application as app.writedaily.desktop, version 0.0.0 (matching npm and Cargo manifests). The main window defaults to 1100 by 760, minimum 640 by 480. Dev hooks use npm run dev at http://127.0.0.1:5173; build hooks use npm run build and embed ../dist relative to src-tauri. Bundling is configured but installer creation/testing is not verified. Scaffold icons are temporary. Windows GUI startup and React rendering were visually verified in task 0.9; no production-ready or macOS validation is claimed.

This document distinguishes installed foundation tooling from proposed product architecture. Implemented schema/native persistence and commit-based editor recovery are verified in their task records. A durable draft journal is not implemented; precise streak rules and backup/restore transaction strategy remain their respective tasks.

## Colors and typography (1.1)

Central CSS theme variables live in src/styles/tokens.css using Tailwind 4 @theme static; global.css imports them and applies base styles in @layer base. Components reference semantic utility classes. Local UI and serif font stacks keep typography offline. The original palette is preserved with one darker secondary text token to meet normal-text contrast on background/surface. Size/line-height tokens define baseline UI, display and writing styles; global manuscript size preferences are implemented in 3.11 through native SQLite; only manuscript text uses the committed rem-based size. Design system documentation contains measured contrast and usage limits. The running Windows Tauri window was visually checked after application of the tokens.

## Application shell (1.2)

App composes AppShell with section navigation and the current section presentation. AppShell owns the semantic header, skip-to-content link and single focusable main landmark. It accepts children and an optional navigation ReactNode; no router is added; App owns current-section state as of task 1.3. Without navigation the sidebar is omitted. With navigation the body stacks at narrow widths and switches at 48rem to a 14rem sidebar plus minmax(0,1fr) content. Main content is centered at max-w-3xl with fluid padding; intrinsic min-width and long text wrapping protect compact layouts. Styling remains in Tailwind's component layer and uses existing tokens. Navigation is implemented in 1.3; actual product page features remain later milestone work.

## Navigation (1.3)

A small ordered section ID list defines the SectionId union. App owns useState for the current section and renders centralized English title/subtitle/Coming soon copy. AppNavigation receives the active ID and typed selection callback; its native buttons use aria-current=page, visible focus outlines and standard keyboard activation. An effect moves focus to the new page heading after section changes without stealing initial mount focus. All five sections have explicit unfinished views; library now contains domain metadata types/validation (2.1); other feature folders remain reserved.

This desktop foundation needs no URL router or persistence for navigation. Reload/restart returns to library; browser history behavior is not implemented. Future unsaved-editor guards must be added before navigation can leave real editable content. Tests use user-event to cover keyboard and pointer interactions. Actual Windows navigation layout and one native keyboard transition were also visually verified.

## Shared Button (1.4)

Button wraps a native button with typed primary/secondary/ghost variants and component-layer CSS. Native props and React 19 refs pass through; default type=button prevents implicit form submission. AppNavigation consumes its ghost variant with current-page/layout utilities. No form state abstraction, styling dependency or routing behavior added. UI directory now contains real code and its .gitkeep was removed. Strong accent tokens supply accessible primary-button text contrast without changing the original palette. Tests verify behavior, native disabled semantics, submission and forwarding; CSS build/contrast checks verify styling integration.

## Shared Input (1.5)

Input is a native single-line field wrapper with a required visible label and optional hint/error. useId supplies stable distinct field IDs; helper IDs are joined with caller descriptions. An error marks the field invalid, but form state, validation rules and timing remain the consuming feature's responsibility. Native props/ref and controlled/uncontrolled values pass through; no form library is added. Component CSS imports with Input when consumed and uses shared palette/error tokens. The application does not import it yet because no actual form feature exists. Six tests verify labeling, accessibility descriptions/error recovery, unique IDs, keyboard/read-only/disabled behavior, controlled values and native constraints/ref forwarding.

## Shared Modal (1.6)

Modal wraps @radix-ui/react-dialog rather than implementing a focus trap manually. The component owns presentation (portal, overlay, title/optional description, header Close and scrollable content); the consumer owns open state and whether a dismissal request may proceed. A required semantic trigger provides deterministic focus restoration. Shared Button's ref/prop forwarding supports Radix asChild composition. No app-to-UI imports or localization dependency are added: callers supply text. Input and Modal are used by book creation.

Seven behavioral tests cover focus, description and dismissal boundaries, including StrictMode and a refused dismissal retaining form input. A temporary ignored Tauri preview verified layout/scrolling, then was removed. Native keyboard capture was inconclusive and is not substituted for test evidence. The normal desktop configuration was rebuilt after preview. Future destructive confirmations may need a dedicated alert-dialog pattern; unsaved-form decisions remain explicit feature responsibilities.

## Shared Card (1.7)

Card is a small native div wrapper with component-layer styles and native props/ref forwarding. It owns surface, border, radius, padding and the shared shadow-card token; the consumer owns content/heading/interactive children. App composes it into existing Coming soon notices. No feature-specific book data or interaction is placed in the primitive. Existing App tests cover the integrated heading/content; the production CSS check verifies token/style inclusion. No new dependencies or presentation-mirroring test suite were needed.

## Shared ProgressBar (1.8)

ProgressBar normalizes a configurable range and synchronizes its read-only progressbar ARIA values with a token-styled fill. The visible label stays outside the progressbar node and is linked through useId. Unknown current values omit aria-valuenow; invalid maximum falls back to 100. This presentation primitive does not calculate manuscript totals or daily activity and adds no feature data, polling, live region or persistence. Static unknown-state styling avoids motion requirements. Consumers supply actual values and optional localized aria-valuetext. Fourteen boundary/semantics tests accompany the component; CSS transformation/contrast checks pass. Current visual/accessibility review passed in 1.9.

## Browser accessibility/layout verification (1.9)

Playwright tests run the actual Vite frontend in installed Edge (channel msedge) with a dedicated port-5174 server owned by the test runner. Axe scans all current sections and a test-only component fixture; no rules are disabled. Browser/config/fixture TypeScript lives under tsconfig.e2e.json, referenced by the main typecheck/build. Vitest still collects only src test files; the test fixture is not a production route or JS entry. Generated screenshots/traces/reports are excluded from Git, lint and formatting.

The fixture imports global styles before component modules to establish Tailwind cascade layers, matching main.tsx. Integration guards confirm styles are applied before accessibility assumptions. ProgressBar's forced-colors fill uses system Highlight with a narrow forced-color-adjust exception; no native permissions or desktop configuration changed. Current responsive/keyboard acceptance passed; the detailed review records remaining screen-reader/native/macOS limits.

## Book domain model (2.1)

Library owns book.ts: readonly persisted snapshot and editable metadata types plus pure validation from unknown input. Book creation IPC/UI is implemented in 2.4; native initialization is in 2.2 and the Rust repository in 2.3. The validator normalizes title/optional nulls and returns localized-message codes, not UI strings; storage-owned identity, paths and timestamps do not enter its output. Native persistence must enforce the same contract before writing; this frontend type/validator is not a security or database boundary by itself.

DATA_MODEL.md defines canonical local deadlines versus UTC instants, safe numeric counts, nonduplicated derived progress, SQL mapping and future delete/reference behavior. No validation library, repository interface or SQL migration is introduced prematurely. Code stays feature-local rather than adding generic shared entity abstractions.

## Native SQLite and migrations (2.2)

Rust owns rusqlite (bundled SQLite) and rusqlite_migration. Tauri setup resolves app_data_dir, adds a development subdirectory for debug builds, and manages a Mutex<Connection>. No frontend SQL/plugin permission or IPC command is added. Future repositories use this native state and validate authoritative inputs; frontend validation alone cannot authorize a write.

The database module sets per-connection FK/timeout/FULL sync, checks ownership marker and schema version, rejects foreign/future databases, checks integrity and applies ordered SQL atomically before enabling verified WAL. Migration 1 creates STRICT books; user_version is the migration index and the application marker is set transactionally. Errors propagate from setup without reset/fallback or empty-library claims. No custom repair/recovery UI yet.

Native tests isolate temporary files and cover data retention, constraints, atomic rollback, upgrade/refusal and unchanged invalid files. SQL steps must remain append-only after release. WAL files stay under SQLite control; snapshot backups remain milestone 7 and are a prerequisite to future destructive production schema changes. Current Rust floor is 1.95 due to the migration dependency, verified on Rust 1.99.1.

## Book repository (2.3)

Public native books module supplies typed DTOs, validation and BookRepository; it borrows the app-managed Connection and does not expose arbitrary SQL to JavaScript; a separate adapter exposes create/list/get/update and confirmed delete. List/get validate full stored snapshots; create/update/delete use bound parameters and IMMEDIATE transactions. Success is returned after commit only. Snapshot updatedAt is required for update/delete to prevent stale writes across connections, with monotonically advancing UTC millisecond timestamps.

Native validation matches frontend metadata normalization through shared JSON fixtures, and additionally checks UUIDs, full stored timestamps/order and managed cover reference shape. Serde maps camelCase DTOs and rejects unsupported input fields/types. No silent row repair/filtering. Direct repository deletion without a cleanup coordinator still refuses covered books. CoverStore uses the internal transactional deletion method that enqueues old cover paths before commit; filesystem work stays outside the repository. Future IPC wraps this blocking API, handles database lock/errors and owns user confirmation policy. Existing migration SQL is unchanged.

Daily goal configuration (4.2): DailyGoal renders committed Book.dailyWordGoal on cards and editor headers. BookDetailsDialog reuses the existing metadata validation/save path with daily-specific help; blank removes the optional target. No native schema/command change or activity-derived percentage is introduced. See [DAILY_GOALS.md](DAILY_GOALS.md).

ED.6 style panel: ChapterEditorDialog retains the single EditorPreferencesPanel state owner across chapters; its compact form is portalled into a stable slot above the active ManuscriptEditor. FormattingToolbar keeps Bold/Italic available in focus mode and the complete existing toolbar otherwise. Global text-size persistence and native/close guards are unchanged; no second preference service or per-selection font schema is introduced.

ED.7 preference autosave: compact font controls pass the explicit next size into the existing guarded settings-save operation on change. Loading and moving the portal do not save. No queue or optimistic applied font is introduced: pending controls are disabled, commits alone apply presentation, and failed selections remain available for retry. Manuscript content saving remains independent.

ED.8 supersedes global font controls: FontSizeControls operates on Tiptap selection/stored marks; ChapterEditorDialog no longer mounts the preference panel or routes its portal/pending state. Content serializer/validators support v1 and v2, with bounded inline fontSize attributes in v2 only. Save/count/revision atomicity stays native-owned. Legacy preference services/table remain retained but are not the product font-formatting path. See [INLINE_FONT_SIZE.md](INLINE_FONT_SIZE.md).

Total goals (4.3): calculateBookProgress derives reached from committed totals and the saved target; cards and editor book headers reuse BookProgress. Goal edits retain the existing metadata commit/conflict guards. Achievement is recalculated and never mutates completedAt. See [TOTAL_WORD_GOALS.md](TOTAL_WORD_GOALS.md).

Deadlines (4.4): utils/calendar-date holds canonical validation and calendar-day arithmetic; book-deadline derives pure states. useLocalCalendarDate owns midnight/resume/polling lifecycle, while BookDeadline renders committed metadata in cards/headers. No state transition writes to persistence. See [DEADLINES.md](DEADLINES.md).

Task 4.5 adds the pure library-domain `calculateWritingPace`, reusing validated book progress and Gregorian date arithmetic. Callers provide the local date and committed count; no clock, persistence or UI dependencies enter the calculation. Optional weekdays are a calculation input, not a new persisted schedule. See [WRITING_PACE.md](WRITING_PACE.md).

Task 4.6 adds shared `WritingPace` presentation to BookCard and ChapterManager. It combines the pure calculation with `useLocalCalendarDate`, receives existing committed totals/metadata and uses centralized English copy. Existing BookProgress, DailyGoal and BookDeadline keep their distinct meanings; daily activity remains Milestone 5.

ED.19: ChapterManager connects the existing native reorder service to drag/drop and up/down UI actions. Full prior revision vectors prevent stale overwrites; a synchronous pending guard prevents overlapping moves, and only committed responses replace displayed order. The window disables the native file-drop handler to permit HTML5 drag on Windows. See [CHAPTER_ORDER.md](CHAPTER_ORDER.md).

Task 5.1 adds the activity domain contract and pure delta policy in src/features/activity/activity.ts. The editor will capture edit-time contexts and stable save operation IDs; native persistence will validate/count and atomically save content, receipts, segments and day plans in 5.2. Task 5.2 implements capture and native transactional persistence; statistics remain 5.3. See [ACTIVITY_MODEL.md](ACTIVITY_MODEL.md).

Task 5.2: feature-local ActivityRecorder captures edit-time contexts; frozen operation payloads survive transient/uncertain failures in memory while later edits form another operation. Production save IPC supplies bounded activityJson. ChapterRepository commits content/count/revision, receipt, segments and day plans together. Native activity validation/derivation lives under chapters/activity.rs; migration 005 adds schema v5 and history-retaining references. Receipt IDs plus canonical SHA-256 fingerprints prevent duplicate credit. See [ACTIVITY_MODEL.md](ACTIVITY_MODEL.md).

Task 5.3 separates daily-statistics reads under native activity/ from chapter transactional writes. A single SQLite read transaction streams selected events, validates facts and sealed plans, and checks integer sums. The registered command exposes bounded date/book scope; src/services/activity.ts validates complete IPC results against feature-local contracts. No statistics screen, schema or write path changes; see [DAILY_STATISTICS.md](DAILY_STATISTICS.md).

Task 5.4 adds feature-local ActivityCalendar/ActivityDayDetails and civil-month/intensity/summary helpers. App mounts the calendar for the activity section; it consumes the validated 5.3 native service and separately resolves book names. Query keys/effect cleanup protect view identity; focus/resume/local-day changes refresh committed data. No new persistence, native command or schema. See [ACTIVITY_CALENDAR.md](ACTIVITY_CALENDAR.md).

Task 5.5 adds native activity/streak.rs and get_current_streak IPC. Current-series reads page through the shared daily reader under one transaction snapshot; public daily queries retain their own transaction wrapper. The frontend validates the native result and shares CurrentStreakSummary between active library and calendar scopes. No month-derived streak, redundant persisted counter or new write/migration is introduced. See [STREAKS.md](STREAKS.md).

Task 5.6 adds activity/longest_streak.rs and get_longest_streak IPC, scanning ascending 366-day pages in one snapshot with the shared day classifier. LongestStreakSummary shares the current summary lifecycle but handles its result independently. Recorded maxima include dates, earliest ties and explicit history bounds. No persistence/schema change. See [STREAKS.md](STREAKS.md).

Task 5.7 adds schedule.rs/schedule_commands.rs and append-only migration 006. The provider shares validated effective schedule history between Goals & Deadlines, edit-time capture and prospective pace. Native metadata writes maintain effective per-book goals atomically; statistics combine these with sealed plans inside their existing read snapshot. Current/longest streaks include tracked empty dates. See [WRITING_SCHEDULE.md](WRITING_SCHEDULE.md).

Editor entry (ED.20): when no book is selected, Writing Editor mounts EditorBookPicker instead of a placeholder. It reads the real library, distinguishes loading/error/empty states and opens a labelled book-selection modal. App reuses getBook before activating ChapterManager, checks request identity and cancels late replies when the chooser closes or navigation changes. Existing selected editor sessions retain their previous lifecycle. No persistence/schema/dependency changes.
