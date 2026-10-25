# Decision log

## 2026-10-25 - Book cards (2.8)

Use shared Card and ProgressBar, full wrapped titles and named article semantics; keep edit/delete as native actions. Show managed cover or a code-native decorative fallback, preserving aspect ratio and text reflow. Extract preview reads from mutation controls so each card reads its cover once. Keep cover controls mounted inside a native disclosure to preserve selection/state while collapsed. Actual manuscript counts are absent, so expose indeterminate progress and an unavailable explanation instead of fabricated zero/percent. Completion is an independent persisted label. No dependency, native or schema changes; grid/open behavior remains 2.9.

## 2026-10-24 - Managed covers (2.7)

Use image 0.25.10 (Rust 1.88 minimum, compatible with project 1.95) with default features disabled and PNG/JPEG/WebP only. Decode content natively, reject oversized/invalid input and normalize to bounded PNG with generated UUID names. Transfer selected bytes through typed IPC, with no filesystem plugin or broad asset permissions. Persist relative references; returned data URLs are display-only.

Append migration 002 for durable cleanup. Register file intent before writing, write/sync before committing a new reference, queue old files inside the change/deletion transaction and clean unreferenced validated paths after commit. Return cleanupPending separately and retry on startup/cover operations. Refuse symlinks/reparse points and retain uncertain targets. Cover selection follows creation as a separate commit. Limits/assumptions are documented in COVER_STORAGE.md.

## 2026-10-24 - Confirmed book deletion (2.6)

Reuse Modal with initial focus on Cancel, an explicit permanent-deletion warning naming the book, and a separate unchecked acknowledgement. Require the loaded revision and a true confirmation argument at the native boundary. Never auto-retry a conflict or remove a row on failure/not-found. Reload displays the current snapshot and requires confirmation again. Remove only after commit, retain other drafts, guard late listings, and focus a surviving library heading. Keep covered books blocked until safe managed-file cleanup in 2.7. Test future cascade/history-retention policy through disposable synthetic tables, without prematurely creating product schemas or editing migration 001.

## 2026-10-24 - Book editing (2.5)

Reuse the creation fields/validation/pending behavior through BookDetailsDialog. Add only the native read/update commands required for editing and a basic list of persisted titles/actions; retain cards/grid work for 2.8/2.9. Key drafts by book ID, preserve them across navigation/dismissal/errors, and send the exact base updatedAt token. Conflicts block retry until the user explicitly replaces the draft with a successfully loaded latest version. Never silently rebase a draft or report saved before commit. Use no new dependency or migration.

## 2026-10-24 - Book creation (2.4)

Expose only create_book through the official Tauri 2 API (2.12.4), following [official command guidance](https://v2.tauri.app/develop/calling-rust/). Reuse the native repository and managed Mutex connection on spawn_blocking. Keep the dialog draft in the mounted feature across dismissal/navigation, clear only after commit, and block dismissal/repeated submission during a write. Drafts are session-only. Browser preview reports desktop required; no mock persistence. Cover import and book cards/grid remain their approved later tasks.

Entries record decisions and verification at each task, not current implementation claims. Later entries supersede earlier environment/version assumptions; current setup is in [README](../README.md) and progress in [TASKS](TASKS.md).

## 2026-10-24 — Product identity and scope

Use WriteDaily and “A little writing, every day.” The updated master brief supersedes the earlier Cozy Writer brief. Keep the existing `write_daily` workspace path; do not rename the repository to match the suggested folder name without need.

## 2026-10-24 — Incremental execution

Complete one approved subtask at a time and stop for approval. Initial work covers environment inspection and requested planning documentation. Do not scaffold while desktop prerequisites need remediation; do not mark the full foundation complete.

## 2026-10-24 — Stack direction

Follow the requested Tauri 2/React/TypeScript/Vite/Tailwind/SQLite stack. No cloud backend. Versions and exact persistence implementation are deferred to the relevant setup tasks. The architecture and data model documents are proposals, not implemented guarantees.

## 2026-10-24 — Environment evidence

Node 22.12.0, npm 10.9.0, Git 2.33.0.windows.2. PowerShell blocks npm.ps1; npm.cmd works without changing system policy. Rust and Cargo 1.61.0 exist at `C:\Users\suhod\.cargo\bin` but are absent from PATH; rustup reports stable-x86_64-pc-windows-msvc. VS Build Tools 2017 15.9.40 with C++ tools and Windows SDK 10.0.17763.0 are installed. WebView2 155.0.4283.62 is registered. Modern Rust/build tool compatibility is not verified.

Official references checked: [Tauri Windows prerequisites](https://v2.tauri.app/start/prerequisites/) and [Vite Node requirements](https://vite.dev/guide/). Node 22.12.0 meets the documented Vite minimum. Recheck package engine requirements when installing; the old Rust toolchain needs updating before selecting/building current Tauri dependencies.

## 2026-10-24 - Frontend bootstrap (0.2)

User approved React/TypeScript/Vite initialization. Verified create-vite 9.3.1 and Vite 8.3.5 engine ranges against Node 22.12.0 using npm metadata and the official Vite guide. Used the official react-ts template, preserving existing documents. Explicitly enabled strict checking in both TypeScript projects. Omitted the template's Oxlint dependency/configuration because ESLint is approved for task 0.5. Kept English bootstrap copy together in App.tsx; feature organization and design components remain later tasks. No desktop toolchain changes performed.

## 2026-10-24 - Tauri desktop wrapper (0.3)

Used local CLI 2.12.4 and its official init scaffold (tauri 2.12.5, tauri-build 2.7.4, Rust manifest minimum 1.90). Updated the installed stable MSVC Rust/Cargo from 1.61.0 to 1.99.1 with approved rustup access. PATH is set per command/session rather than modifying account-wide settings. Tauri info recognizes existing VS 2017 C++ tools and WebView2; actual build results determine sufficiency. Application version matches frontend 0.0.0; provisional identifier app.writedaily.desktop. Default scaffold icons remain explicitly temporary. No backend, persistence plugin or JavaScript Tauri API dependency is added without use.

Verification outcome: debug desktop build without bundling succeeded using existing VS 2017 tools/SDK and updated Rust 1.99.1. Do not infer installer compatibility or GUI launch from successful compilation; those gates remain unverified. No Build Tools upgrade was needed for this subtask.

## 2026-10-24 - Tailwind integration (0.4)

Followed the official Tailwind CSS 4 Vite installation path with tailwindcss/@tailwindcss/vite 4.3.3; npm peer metadata explicitly supports Vite 8. Kept both as build dependencies. Included Preflight and explicitly styled the bootstrap heading, moving existing main spacing/width into utilities. No legacy init command, PostCSS configuration or design system expansion. Verified strict TypeScript, production build and emitted utility selectors; visual/desktop checks are not implied.

## 2026-10-24 - ESLint and formatting (0.5)

Use supported ESLint 10.13.0, @eslint/js 10.0.1 and typescript-eslint 8.72.0 with recommended Hooks/Refresh configurations. Official ESLint requirements and npm dependency metadata showed Node 22.12 was insufficient; ESLint 9 was also deprecated. Approved winget installation upgraded machine-wide Node to official LTS 24.22.1, with npm 11.19.1. Removed the temporary ESLint 9 installation by upgrading to 10; did not suppress engine warnings or override transitive dependencies. Package Node engine range follows ESLint: ^20.19.0, ^22.13.0 or >=24.

Use standalone, exactly pinned Prettier 3.9.10 and eslint-config-prettier rather than running formatting as a lint rule. No Tailwind sorting plugin, git hooks or automatic commits added. Existing supported files were formatted as part of this task; product behavior is unchanged. In-memory negative checks verified Hooks/any lint rules and formatting drift detection. Official references: https://eslint.org/docs/latest/use/getting-started , https://typescript-eslint.io/getting-started/ , https://prettier.io/docs/install/ .

## 2026-10-24 - Vitest bootstrap (0.6)

Use Vitest 5.0.5 (Vite 8 compatible), jsdom 30.1.3, React Testing Library 16.3.3, its DOM peer 10.4.2 and jest-dom 7.0.1. Verified official setup guidance and npm engines/peers before installation. Installed Node 24.22.1 meets all requirements; project engines updated to ^22.22.2, ^24.15.0 or >=26.0.0 to reflect jsdom. No system update needed.

Keep a single Vite config via defineConfig from vitest/config. Use explicit Vitest imports and explicit cleanup rather than global test functions. Add one meaningful render smoke test with accessible queries; no snapshots, mock persistence, coverage package or browser runner at this stage. References: https://vitest.dev/config/setupfiles and https://testing-library.com/docs/react-testing-library/setup/ .

## 2026-10-24 - Application structure (0.7)

Moved App and its existing test together into src/app; moved global CSS into src/styles/global.css and updated main imports. Extracted existing English copy to app/i18n/en.ts without adding translation infrastructure. Created the approved feature/shared directories with Git markers; these reserve ownership without fake functionality or unnecessary runtime abstractions. Kept test setup in src/test. No new dependencies, aliases, router or barrel exports. Feature-specific code stays within features; shared code is introduced only for demonstrated reuse. Existing render test, lint, TypeScript and frontend build pass after relocation.

## 2026-10-24 - Documentation audit (0.8)

Reconciled documentation with current source/configuration, task status and lockfiles. Clarified which product behavior remains proposed; distinguished historical native compilation from pending GUI startup and installer validation. Added milestone completion gates and document navigation. Fixed damaged separators and historical/current wording without rewriting past verification evidence.

Corrected package.json packageManager from inherited Yarn metadata to npm@11.19.1, matching the existing npm workflow and package-lock.json. No dependency versions, application behavior or native permissions changed. No new dependency installation was required.

## 2026-10-24 - Desktop startup verification (0.9)

Ran the actual Tauri development workflow on Windows and visually inspected a capture of the native WriteDaily window. React heading, tagline and status rendered with Tailwind styles. Native build, unit smoke test, TypeScript, lint, formatting and frontend build passed. Closed the test window gracefully and stopped development processes afterward. No implementation changes required. Local screenshot evidence is ignored under .cache/desktop-verification; it is not a release asset. Foundation acceptance is now complete; installer, macOS and persistence verification remain outside this subtask.

## 2026-10-24 - Colors and typography (1.1)

Define theme tokens in a dedicated tokens.css using Tailwind @theme static, imported by the existing global entry. Preserve the requested palette and add secondary #706B62 because original muted is only 3.36:1 against background. Use local Segoe UI/system UI and Georgia/Times serif stacks with rem-based UI/display/writing sizes; no remote fonts or dependencies. Apply tokens to bootstrap content without starting the shell or editor tasks. Verified compiled utilities, text contrast, frontend checks and actual Tauri appearance. Editor font-size preferences remain 3.11.

## 2026-10-24 - Application shell (1.2)

AppShell owns a semantic masthead/main, skip link and optional navigation slot; App supplies existing bootstrap content. Hide the absent sidebar rather than adding inactive section links before task 1.3. Use a 48rem breakpoint for stacked/side-by-side navigation and existing surface/background tokens. No routing, icons, persistence or extra dependency. Two structural accessibility tests and the existing render test pass. Actual Tauri screenshots verified minimum 640x480 and wide 1285x812 client layouts; future navigation integration still needs its own keyboard/responsive checks.

## 2026-10-24 - Section navigation (1.3)

Use typed section IDs, native buttons and local React state for five desktop sections; no routing dependency or history/persistence behavior is needed yet. My Library is the initial section. aria-current, visible active styles, skip link and heading focus support keyboard navigation. All destination content is explicitly Coming soon, without fake data or unfinished feature controls. Real feature workflows remain in their approved milestones.

Add only @testing-library/user-event 14.6.8 as a development dependency for realistic keyboard/pointer tests. Nine tests pass, including all five keyboard destinations. Verified actual Tauri sidebar/compact layouts and a native Tab/Enter transition. DPI-aware screenshot capture is required at Windows 125% scaling; the initial clipped captures were superseded, with no application layout fix needed.

## 2026-10-24 - Shared Button (1.4)

Use a small native button wrapper with primary/secondary/ghost variants and React 19 native ref/prop forwarding; no extra library. Default type=button, with explicit submit support. CSS component layer allows navigation utilities to retain existing layout/current-page styles. Replace navigation's raw buttons with the ghost variant and remove the UI folder marker now real code exists.

Add strong accent #6F583F and hover #5C4732 rather than using the original accent for insufficient-contrast light button text. Ratios are 6.62:1 and 8.66:1. Verify pointer/keyboard, native disabled/Tab behavior, form submission and ref/aria forwarding; retain all navigation tests. Thirteen tests plus typecheck/lint/build pass. No new dependency or product action; visual state review remains 1.9.

## 2026-10-24 - Shared Input (1.5)

Use a native single-line input wrapper with visible label and optional hint/error strings, useId connections, merged caller descriptions and error-driven aria-invalid. Preserve native ref/props and controlled/uncontrolled behavior; no form state/validation abstraction or dependency. Restrict the type API to text/numeric/date-like fields rather than trying to style checkboxes/file controls with one component.

Add error #9B443A as a semantic token (6.34:1 surface, 5.79:1 background), keeping the original palette. Do not insert an unused field into the product UI; the component's styling loads with a future real form consumer. Six tests plus all existing regressions pass (19 total), alongside TypeScript/lint/build and a Vite CSS transformation smoke check. Full visual form integration remains later work.

## 2026-10-24 - Shared Modal (1.6)

Choose @radix-ui/react-dialog 1.3.1 (React 19 compatible) for established focus trapping, keyboard/outside dismissal and trigger restoration; avoid custom accessibility machinery. See https://www.radix-ui.com/primitives/docs/components/dialog . Modal supplies WriteDaily presentation with required title/closeLabel/semantic trigger, optional description and caller-owned open state. A caller may refuse closing rather than discard unsaved input. No product flow added.

Seven tests cover accessible opening, focus loop, StrictMode Escape/restore, close/reopen, overlay dismissal, refused closing and optional descriptions (26 total tests). Temporary ignored Tauri preview visually verified wide/compact scrolling and visible Close; removed afterward and restored normal debug configuration. Native SendKeys captures were inconclusive, so keyboard assertions rely on behavioral tests. No custom animation, data saving or destructive confirmation policy introduced.

## 2026-10-24 - Shared Card (1.7)

Use a small noninteractive native div wrapper with props/ref and layout className rather than a polymorphic/interactive variant system. Token-based component CSS supplies surface, border, padding, radius and centralized shadow-card. Apply it to existing Coming soon notices with a semantic h2 title; do not start library book cards or introduce fake data. Keep action semantics in child controls.

Existing App/navigation/component tests remain green (26 tests); updated App's notice-heading assertion. TypeScript, lint/build and emitted CSS token checks passed. No new dependencies or tests that mirror the presentation implementation; full visual review remains 1.9.

## 2026-10-24 - Shared ProgressBar (1.8)

Use a labelled read-only progressbar role with a token-styled fill, explicit min/max/current semantics and no keyboard/live-region behavior. Clamp finite current values; treat missing/nonfinite values as unknown rather than claiming completion. Invalid maxima fall back to 100. Unknown state uses a static centered segment, not an animated or fake percentage. No new dependency and no example progress in product screens. Reference: https://www.w3.org/TR/wai-aria/#progressbar .

Strong accent fill on the light border track measures 5.19:1; secondary boundary contrasts with both supported surfaces. Fourteen parameterized range/semantics/transition tests bring the suite to 40 passing tests. TypeScript/lint/build and Vite CSS transformation pass. Full visual/accessibility review is the next approved task (1.9).

## 2026-10-24 - Accessibility and responsive review (1.9)

Add Playwright 1.64.1 and @axe-core/playwright 4.14.0 for real browser checks, using existing Edge rather than downloading/updating a browser. Keep a committed test-only primitive fixture, dedicated port 5174 and strict e2e TypeScript project; no demo route is bundled with the app. Official guidance: https://playwright.dev/docs/accessibility-testing and https://playwright.dev/docs/browsers .

A failing forced-colors regression exposed ProgressBar fill/track becoming identical; fix it with scoped system colors and a decorative-fill-only adjustment exception. Screenshot review exposed incorrect global/component CSS order in the test fixture; correct that order and guard actual styled rendering before rescanning. All 12 browser tests and 40 component tests pass; no axe rules disabled. Review report documents limits rather than claiming complete WCAG conformance. Milestone 1 current keyboard/contrast/responsive acceptance is complete; Milestone 2 still requires approval.

## 2026-10-24 - Book data model (2.1)

Keep editable BookDetails separate from persistence-owned Book identity/cover/lifecycle fields. Use nullable positive safe-integer goals, local calendar deadlines, UTC lifecycle timestamps, explicit completion and UUID identity. Do not persist manuscript counts or progress percentages on books. Normalize titles to NFC after trimming and cap at 200 Unicode code points as a metadata limit; reject embedded control characters without restricting Ukrainian/Unicode text. Pure validation returns codes for future form localization and never coerces numeric strings.

Define future deletion relationships now: owned chapters/settings cascade only after confirmation, historical activity and achievements remain, nullable references detach, and owned cover cleanup happens after committed database deletion. No SQL/file operations in this task. Storage mapping/constraints are documented for 2.2 and authoritative native validation remains mandatory. Thirty-two new domain tests bring Vitest to 72 passing tests; typecheck/lint/build pass. No dependencies or UI changes.

## 2026-10-24 - SQLite and migrations (2.2)

Choose rusqlite 0.40.2 with bundled SQLite and rusqlite_migration 2.6.0 for atomic user_version migrations; keep DB access in Rust rather than exposing SQL through a frontend plugin. The migration library requires Rust 1.95, so raise the manifest floor; installed/tested Rust 1.99.1 already satisfies it. Add direct thiserror handling and dev-only tempfile; retain Cargo.lock. Bundled libsqlite3-sys 0.38.2 ships SQLite 3.53.2.

Use Tauri app_data_dir, development subfolder for debug, a single managed Mutex connection, FK ON, 5s busy timeout, synchronous FULL and verified WAL. Refuse foreign/unversioned nonempty/newer schemas before persistent configuration changes; never reset a failing database. Transactional migration 1 creates STRICT books plus format marker; no downgrade or checksum framework. Constraints supplement, but do not replace, full native input/path validation in 2.3/2.7. Errors stop startup; recovery UI is not implemented.

Ten isolated SQLite tests verify real file behavior and rollback. Actual Tauri startup/read-only inspection confirmed the empty development DB (version 1, expected marker, WAL). Native fmt/Clippy and 72 frontend tests/typecheck/lint/build pass. No book CRUD command, cover import or production data deletion added. Official references are linked in DATA_MODEL.md.

## 2026-10-24 - Native book repository (2.3)

Implement the repository as a public Rust library API borrowing the managed Connection, with no prematurely exposed IPC command/UI. Use serde camelCase DTOs, uuid v4, chrono UTC/calendar parsing and unicode-normalization rather than custom generators/time parsing. Native metadata decoding rejects unknown/system fields; normalization matches ECMAScript trim/NFC through shared fixtures, including BOM/NEL differences. No existing migration is edited.

Use IMMEDIATE transactional writes and expected updatedAt tokens for updates/deletion. Advance update time by at least 1ms even after system-clock rollback. Return only committed snapshots, reject malformed persisted rows without repair/filtering, and keep cover/completion immutable during metadata edits. Refuse covered-book deletion until its explicit cleanup workflow exists; UI confirmation remains task 2.6.

Twenty-five native tests and 86 frontend tests pass, including shared fixtures, SQL failure rollback, two-connection conflicts, real reopen persistence and JSON shape. No actual user-library data modified and no UI/browser behavior changed. Repository errors are typed; a future Tauri adapter must map them to localized outcomes and run blocking work outside the UI thread.
