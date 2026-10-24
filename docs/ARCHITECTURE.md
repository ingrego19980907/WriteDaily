# Architecture

Status: Foundation complete through task 0.9, including Windows development-window visual verification; application structure established in task 0.7. React/Vite, Tauri, Tailwind, lint/format tooling and Vitest are configured. Book metadata, native SQLite/migration and Rust repository are implemented through 2.3; book IPC/UI and other product features remain absent. Runtime entry is `src/main.tsx`, application composition is `src/app/App.tsx`, and global CSS is `src/styles/global.css`.

## Technology direction

Tauri 2 desktop host; React + strict TypeScript + Vite frontend; Tailwind for styling; SQLite for structured data; Tiptap for rich text. Add Lucide, Motion and Playwright only when their approved tasks require them. Vitest currently runs eighty-six domain/component tests plus twelve Edge browser accessibility/layout tests; native persistence is additionally covered by 25 Rust tests. Resolve compatible stable versions during each setup task and commit dependency lockfiles once generated.

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
    library/           book metadata types/validation; future books and covers
    editor/            chapters and writing
    goals/             targets and deadlines
    activity/          writing events, calendar and streaks
    achievements/      achievement evaluation and presentation
  hooks/               shared React behavior when needed
  services/            future typed persistence boundary
  styles/global.css    Tailwind entry and global styles
  styles/tokens.css    palette, fonts and typography theme variables
  types/               genuinely shared types when needed
  utils/               small shared pure functions when needed
  test/setup.ts        test matchers and DOM cleanup
src-tauri/             desktop host; future database and managed filesystem access
docs/                  product, architecture, decisions and task tracking
```

Reserved directories contain only `.gitkeep` markers so Git retains the approved structure. They contain no working features, placeholder services or mock persistence. Add implementations during their approved tasks; avoid empty abstractions. UI invokes typed services; services cross a narrow Tauri boundary; persistence owns validation, migrations, transactions and managed file access. Components never issue raw SQL or arbitrary filesystem calls. Decide exact Rust command/plugin boundaries before task 2.2; only the existing main-window core capability is granted; no persistence plugin permissions are configured.

## Reliability proposal (verify in milestone 3)

Debounce chapter saves by 750 ms after edits; serialize writes per chapter, attach revisions, and atomically persist content and corresponding activity. Status transitions: unsaved → saving → saved only after successful commit; errors remain visible with retry and retained text. Flush pending work on chapter navigation. Closing must wait for pending saves or show a recoverable failure decision, never silently discard text. Preserve last committed revision on interruption; assess a durable recovery journal for edits still inside the debounce window during 3.8/3.12. Do not promise zero-loss recovery until tested.

## Cross-platform and localization

Resolve storage paths via Tauri application directories, never hardcode user paths. Keep UI messages centralized; use locale-aware formatting and local calendar-day activity keys. No network services, account system or production backend. The Vite development server is development tooling only.

## Desktop bootstrap (0.3)

`src-tauri` contains the Rust entry point, Tauri build script, configuration, generated scaffold icons and default core capability for the main window. No filesystem, shell, SQL or custom application commands are exposed to the frontend. Native SQLite initialization now runs internally (2.2). The frontend does not yet need @tauri-apps/api; add it when an approved feature invokes native functionality. Removed unused logging/serialization scaffold dependencies.

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

This document distinguishes installed foundation tooling from proposed product architecture. Database schema, native persistence API, autosave recovery journal, precise streak rules and restore transaction strategy must be finalized and tested in their respective tasks.

## Colors and typography (1.1)

Central CSS theme variables live in src/styles/tokens.css using Tailwind 4 @theme static; global.css imports them and applies base styles in @layer base. Components reference semantic utility classes. Local UI and serif font stacks keep typography offline. The original palette is preserved with one darker secondary text token to meet normal-text contrast on background/surface. Size/line-height tokens define baseline UI, display and writing styles; editor settings are not yet implemented. Design system documentation contains measured contrast and usage limits. The running Windows Tauri window was visually checked after application of the tokens.

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

Modal wraps @radix-ui/react-dialog rather than implementing a focus trap manually. The component owns presentation (portal, overlay, title/optional description, header Close and scrollable content); the consumer owns open state and whether a dismissal request may proceed. A required semantic trigger provides deterministic focus restoration. Shared Button's ref/prop forwarding supports Radix asChild composition. No app-to-UI imports or localization dependency are added: callers supply text. Like Input, Modal is not yet used by a product feature; styles/dependency load with its eventual consumer.

Seven behavioral tests cover focus, description and dismissal boundaries, including StrictMode and a refused dismissal retaining form input. A temporary ignored Tauri preview verified layout/scrolling, then was removed. Native keyboard capture was inconclusive and is not substituted for test evidence. The normal desktop configuration was rebuilt after preview. Future destructive confirmations may need a dedicated alert-dialog pattern; unsaved-form decisions remain explicit feature responsibilities.

## Shared Card (1.7)

Card is a small native div wrapper with component-layer styles and native props/ref forwarding. It owns surface, border, radius, padding and the shared shadow-card token; the consumer owns content/heading/interactive children. App composes it into existing Coming soon notices. No feature-specific book data or interaction is placed in the primitive. Existing App tests cover the integrated heading/content; the production CSS check verifies token/style inclusion. No new dependencies or presentation-mirroring test suite were needed.

## Shared ProgressBar (1.8)

ProgressBar normalizes a configurable range and synchronizes its read-only progressbar ARIA values with a token-styled fill. The visible label stays outside the progressbar node and is linked through useId. Unknown current values omit aria-valuenow; invalid maximum falls back to 100. This presentation primitive does not calculate manuscript totals or daily activity and adds no feature data, polling, live region or persistence. Static unknown-state styling avoids motion requirements. Consumers supply actual values and optional localized aria-valuetext. Fourteen boundary/semantics tests accompany the component; CSS transformation/contrast checks pass. Current visual/accessibility review passed in 1.9.

## Browser accessibility/layout verification (1.9)

Playwright tests run the actual Vite frontend in installed Edge (channel msedge) with a dedicated port-5174 server owned by the test runner. Axe scans all current sections and a test-only component fixture; no rules are disabled. Browser/config/fixture TypeScript lives under tsconfig.e2e.json, referenced by the main typecheck/build. Vitest still collects only src test files; the test fixture is not a production route or JS entry. Generated screenshots/traces/reports are excluded from Git, lint and formatting.

The fixture imports global styles before component modules to establish Tailwind cascade layers, matching main.tsx. Integration guards confirm styles are applied before accessibility assumptions. ProgressBar's forced-colors fill uses system Highlight with a narrow forced-color-adjust exception; no native permissions or desktop configuration changed. Current responsive/keyboard acceptance passed; the detailed review records remaining screen-reader/native/macOS limits.

## Book domain model (2.1)

Library owns book.ts: readonly persisted snapshot and editable metadata types plus pure validation from unknown input. Book IPC/UI is not implemented; native initialization is in 2.2 and the Rust repository in 2.3. The validator normalizes title/optional nulls and returns localized-message codes, not UI strings; storage-owned identity, paths and timestamps do not enter its output. Native persistence must enforce the same contract before writing; this frontend type/validator is not a security or database boundary by itself.

DATA_MODEL.md defines canonical local deadlines versus UTC instants, safe numeric counts, nonduplicated derived progress, SQL mapping and future delete/reference behavior. No validation library, repository interface or SQL migration is introduced prematurely. Code stays feature-local rather than adding generic shared entity abstractions.

## Native SQLite and migrations (2.2)

Rust owns rusqlite (bundled SQLite) and rusqlite_migration. Tauri setup resolves app_data_dir, adds a development subdirectory for debug builds, and manages a Mutex<Connection>. No frontend SQL/plugin permission or IPC command is added. Future repositories use this native state and validate authoritative inputs; frontend validation alone cannot authorize a write.

The database module sets per-connection FK/timeout/FULL sync, checks ownership marker and schema version, rejects foreign/future databases, checks integrity and applies ordered SQL atomically before enabling verified WAL. Migration 1 creates STRICT books; user_version is the migration index and the application marker is set transactionally. Errors propagate from setup without reset/fallback or empty-library claims. No custom repair/recovery UI yet.

Native tests isolate temporary files and cover data retention, constraints, atomic rollback, upgrade/refusal and unchanged invalid files. SQL steps must remain append-only after release. WAL files stay under SQLite control; snapshot backups remain milestone 7 and are a prerequisite to future destructive production schema changes. Current Rust floor is 1.95 due to the migration dependency, verified on Rust 1.99.1.

## Book repository (2.3)

Public native books module supplies typed DTOs, validation and BookRepository; it borrows the app-managed Connection and does not expose SQL/CRUD commands to JavaScript. List/get validate full stored snapshots; create/update/delete use bound parameters and IMMEDIATE transactions. Success is returned after commit only. Snapshot updatedAt is required for update/delete to prevent stale writes across connections, with monotonically advancing UTC millisecond timestamps.

Native validation matches frontend metadata normalization through shared JSON fixtures, and additionally checks UUIDs, full stored timestamps/order and managed cover reference shape. Serde maps camelCase DTOs and rejects unsupported input fields/types. No silent row repair/filtering. Covered-book deletion is explicitly blocked until file cleanup is implemented; no file IO occurs in the repository. Future IPC wraps this blocking API, handles database lock/errors and owns user confirmation policy. Existing migration SQL is unchanged.
