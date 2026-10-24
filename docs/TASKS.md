# Task tracker

Source of truth. Checked items have verified acceptance criteria. All unlisted implementation is absent.

Current stop: tasks 0.1-0.9 completed. Milestone 0 (Foundation) acceptance is verified. Tasks 1.1-1.9 are complete; Milestone 1 acceptance is verified for the current shell/shared UI. Task 2.1 (book data model) is complete; awaiting approval before 2.2 (SQLite and migrations). Library UI/repository/persistence remain unimplemented.

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
| [ ]  | 2.2  | Configure SQLite and migrations    | Not started            | 2.1          | Database opens and migrations apply safely on fresh and existing schemas |
| [ ]  | 2.3  | Implement book repository          | Not started            | 2.2          | Validated CRUD operations pass real database tests                       |
| [ ]  | 2.4  | Implement book creation            | Not started            | 2.3          | Valid books persist and invalid input shows errors                       |
| [ ]  | 2.5  | Implement book editing             | Not started            | 2.4          | Changes persist after reopening                                          |
| [ ]  | 2.6  | Implement book deletion            | Not started            | 2.5          | Confirmation and safe dependent-data policy verified                     |
| [ ]  | 2.7  | Implement cover upload and storage | Not started            | 2.6          | Managed covers survive restart and invalid files are rejected            |
| [ ]  | 2.8  | Design book cards                  | Not started            | 2.7          | Cover, title and progress render accessibly                              |
| [ ]  | 2.9  | Implement library grid             | Not started            | 2.8          | Responsive grid opens the correct book                                   |
| [ ]  | 2.10 | Implement book progress            | Not started            | 2.9          | Zero, missing and exceeded targets handled                               |
| [ ]  | 2.11 | Add empty states and validation    | Not started            | 2.10         | Empty, loading and error states work                                     |
| [ ]  | 2.12 | Test persistence after restart     | Not started            | 2.11         | Books and covers survive a real desktop restart                          |

## Milestone 3: Writing Editor

| Done | ID   | Description                   | Status      | Dependencies | Acceptance criteria                                                           |
| ---- | ---- | ----------------------------- | ----------- | ------------ | ----------------------------------------------------------------------------- |
| [ ]  | 3.1  | Design chapter data model     | Not started | 2.12         | Ordering, content schema and revisions specified                              |
| [ ]  | 3.2  | Implement chapter repository  | Not started | 3.1          | Chapter CRUD and revision handling pass persistence checks                    |
| [ ]  | 3.3  | Implement chapter management  | Not started | 3.2          | Create, rename and confirmed deletion work                                    |
| [ ]  | 3.4  | Integrate Tiptap              | Not started | 3.3          | Rich text edits and serialization work                                        |
| [ ]  | 3.5  | Add formatting toolbar        | Not started | 3.4          | Bold, italic, headings, lists and undo/redo work                              |
| [ ]  | 3.6  | Implement chapter navigation  | Not started | 3.5          | Pending edits preserved when switching chapters                               |
| [ ]  | 3.7  | Implement word counting       | Not started | 3.6          | Documented counting policy passes Unicode and empty-content tests             |
| [ ]  | 3.8  | Implement autosave            | Not started | 3.7          | Serialized debounced writes and retry behavior pass failure checks            |
| [ ]  | 3.9  | Implement save status         | Not started | 3.8          | Saved appears only after successful commit; errors remain visible             |
| [ ]  | 3.10 | Add focus mode                | Not started | 3.9          | Focus mode can be entered and exited by keyboard                              |
| [ ]  | 3.11 | Add editor preferences        | Not started | 3.10         | Font size persists within validated limits                                    |
| [ ]  | 3.12 | Test persistence and recovery | Not started | 3.11         | Formatting, rapid navigation, interrupted saves and restart recovery verified |

## Milestone 4: Goals & Deadlines

| Done | ID  | Description                     | Status      | Dependencies | Acceptance criteria                                      |
| ---- | --- | ------------------------------- | ----------- | ------------ | -------------------------------------------------------- |
| [ ]  | 4.1 | Aggregate book word counts      | Not started | 3.12         | Chapter sums stay correct after edits and deletion       |
| [ ]  | 4.2 | Implement daily goals           | Not started | 4.1          | Validated daily targets persist                          |
| [ ]  | 4.3 | Implement total word goals      | Not started | 4.2          | Optional targets persist and handle completion           |
| [ ]  | 4.4 | Implement deadlines             | Not started | 4.3          | Missing, today and overdue dates handled locally         |
| [ ]  | 4.5 | Calculate required writing pace | Not started | 4.4          | Scheduled days and nonnegative remaining words handled   |
| [ ]  | 4.6 | Create progress components      | Not started | 4.5          | Actual goal results render accessibly                    |
| [ ]  | 4.7 | Add calculation tests           | Not started | 4.6          | Missing goals, overdue dates and completed books covered |

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
