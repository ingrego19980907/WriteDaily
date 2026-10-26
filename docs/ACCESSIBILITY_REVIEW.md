# Accessibility and layout review

Task 3.12 follow-up: real Tauri/WebView2 windows were observed across six launches, with first/final native and pending-write captures inspected. This adds desktop persistence/close/recovery evidence, not a new WCAG or screen-reader review. Production UI/layout is unchanged; the 94 Edge checks remain the 3.11 result. See [EDITOR_PERSISTENCE_REVIEW.md](EDITOR_PERSISTENCE_REVIEW.md) for the commit-based recovery boundary.

Task 3.11 follow-up (2026-10-26): Editor settings uses native details/summary, a labelled integer-size select with linked help, explicit Save, a separate named atomic status and retained alert/reload feedback outside the collapsed control. rem-based manuscript sizing respects root enlargement; no saved content or focus/selection/history is rewritten. Pending settings disable navigation/entry into focus mode and protect close; failures keep the prior display and draft. Seven new Edge cases cover 320/640/1100px, axe, 12/32 px, 200% sizing/reflow (32 becomes 64 CSS px), forced colors/reduced motion, reopen/chapter/focus continuity and load/write/conflict/pending failures. Total coverage: 94 browser scenarios, 401 Vitest and 66 Rust tests. Browser/native-close IPC is test-only; actual desktop editor restart/recovery remains 3.12 and no manual screen-reader session is claimed.

Task 3.10 follow-up (2026-10-26): focus mode uses a visible pressed header toggle, ordinary keyboard activation and Radix's existing focus trap. Entry retains toggle focus; Tab reaches Close and then writing. First Escape restores normal layout and button focus; repeated/composing Escape does not dismiss. Hidden navigation/toolbar/counts leave the accessibility/Tab order, while visually hidden chapter/help context remains available to screen readers. Save status, errors, Save and dirty/pending close protection remain available. Six new Edge cases cover keyboard/formatting/autosave/pending/error/discard/reopen behavior, axe at 320/640/1100px, 640x480, 200% internal reflow and forced colors/reduced motion. Total coverage: 87 Edge scenarios and 375 Vitest tests. No actual native fullscreen/startup/restart or manual screen-reader claim.

Task 3.9 follow-up (2026-10-26): SaveStatus is a stable named role=status with explicit polite/atomic announcements, visible state text, wrapping existing token styles, no animation or Tab stop. Repeated typing while waiting leaves announcement text unchanged. One alert container retains failed-save details through subsequent edits and close notices, including during retry; commit clears obsolete feedback. Six new Edge scenarios cover neutral/waiting/manual/automatic/pending/committed/error/blocked/reopen states, axe at 320/640/1100px, 200% status/modal internal reflow and forced colors/reduced motion. Total browser coverage is 81 tests; Vitest coverage is 371 tests. This does not establish manual screen-reader behavior or native desktop/restart acceptance.

Task 3.8 follow-up (2026-10-26): centralized editor help explains the 2-second autosave delay and manual save option. Persistence failures explicitly announce that automation is paused and identify the retry button; further typing retains that error. Existing pending locks, keyboard controls and commit-only success remain. Six new Edge scenarios cover automatic save/reopen at 320/640/1100px with axe, pending navigation locks, retry/resume and navigation timer isolation. Total browser coverage is 75 tests. The clock is paused for precise timer checks and resumed for axe. No new layout component, native-window run or manual screen-reader claim is added.

Task 3.7 follow-up (2026-10-26): the editor presents current and last committed word counts in a named group with centralized English singular/plural copy and a visible explanation of unsaved edits. The group is intentionally not a live region, avoiding announcements on every keystroke. Pending/failing saves preserve the last committed count. New Edge tests cover 320/640/1100px, axe scans, 200% modal internal reflow, formatting/list invariance, save/reopen and pending/error/retry behavior. The full suite passed 68/69; correcting the final test's unsupported heading-to-list action yielded all six passing counting tests, covering all 69 scenarios across runs. Browser IPC is test-only; no actual native GUI/restart or manual screen-reader session was added.

Task 3.6 follow-up (2026-10-26): all 63 Edge tests pass, including nine chapter-navigation scenarios. A named navigation landmark contains a labelled native select with numbered options and linked save-before-switch help; previous/next buttons communicate collection boundaries and pending states. Selection stays on the current chapter until validated success, then focus moves to its replacement heading after editing/close protection becomes ready. Tests cover duplicate titles/IDs, roundtrip formatted writing, pending save/read locks, errors/conflicts/retry and slow/repeated actions. Axe scans pass at 320/640/1100px; 200% checks cover selector/modal internal overflow. Browser fixtures use test-only IPC, so no actual native desktop/restart or manual screen-reader claim is made.

Task 3.5 follow-up (2026-10-26): all 54 Edge checks pass. The toolbar has a localized name/help, visible labels matching accessible names, aria-pressed states, one Tab stop, remembered control and wrapping Arrow/Home/End navigation that skips disabled actions. Keyboard activation restores editor focus; pointer clicks preserve selected-word formatting. Tests cover pending-save locks, history availability, all heading levels and list types, save/reopen JSON equality, axe scans at 320/640/1100px and 200% toolbar/modal internal reflow. Forced-colors testing verifies a double border on pressed controls. Browser IPC is test-only; no actual native GUI/restart or manual screen-reader verification is claimed.

Task 3.4 follow-up: all 50 Edge tests pass, including nine Tiptap scenarios. The real editable DOM has a localized name, multiline textbox semantics and linked help; supported heading/list typography and keyboard formatting survive save/reopen JSON roundtrips. Tests cover retained text on errors/conflicts, pending editing/close locks, acknowledged discard, unsupported content and plain-text/file paste. Native close events are mocked at the IPC boundary. Axe scans pass at normal text size; 200% reflow checks inspect modal-body/editor internal widths and usable body height, as well as page overflow. Screenshot review found internal grid/header overflow missed by page-only checks; Modal now uses minmax(0, 1fr), wrapping header controls and a shrinkable editor session. Narrow/wide corrected screenshots inspected. No new actual native GUI/restart or manual screen-reader claim; see TIPTAP_INTEGRATION.md.

Task 3.3 follow-up: all 41 Edge checks pass, including five new chapter-management scenarios; the chapter checks pass again after final focus refinements. At 320/640/1100px, tests cover create/rename/delete by ID with duplicate titles, title validation, safe initial Cancel focus and Enter/Escape cancellation, explicit acknowledgement, draft retention across section navigation, committed-only results and surviving heading focus. Conflict cases retain rename drafts, reload revision tokens and require deletion reconfirmation; focus moves to the title or acknowledgement after reload. Read/native-validation/write errors preserve rows/drafts. Axe WCAG scans and 200% text reflow pass; narrow/wide screenshots inspected. The 320px enlarged-text stress case wraps heavily but does not overflow horizontally. Test-only IPC fixtures do not establish actual desktop restart persistence or manual screen-reader behavior. Shared Modal uses an optional Radix close-focus handler for successful chapter mutations while default consumers retain normal focus restoration.

Task 2.11 follow-up: all 36 Edge checks pass. New 320/1100px workflows verify list busy/loading, failed-read versus confirmed-empty feedback, disabled retry/heading focus, local/native validation summaries and linked errors, first-invalid-field focus after pending, retained drafts and WCAG scans/reflow. File validation is linked to the picker and invalid state. Browser fixtures use isolated IPC; no manual screen-reader or actual desktop persistence/restart claim.

Task 2.10 follow-up: all 34 Edge checks pass. Presentation fixtures at 320/640/1100px verify zero versus unknown, partial/reached/exceeded goals, actual counts in accessible text, bounded ARIA ranges, no percentage for a known count without a goal, axe WCAG scans and 200% text reflow. Runtime Library still has unknown counts pending manuscript aggregation. No new native desktop or manual screen-reader claim.

Task 2.9 follow-up: all 31 Edge tests pass. Grid scenarios verify native list/articles and 1/1/2/3 CSS columns at 320/640/1100/1440px, keyboard opening by selected ID with duplicate titles, correct fresh selected-book context, heading focus/return navigation, axe WCAG scans and 200% text reflow. Browser screenshots inspected. Existing card/CRUD/cover/navigation regressions remain covered. IPC fixtures do not establish native desktop restart or manual screen-reader behavior.

Task 2.8 follow-up: all 27 Edge checks pass. New card checks at 320/640/1100px cover full Unicode/unbroken titles, named articles, cover/fallback/error states, unknown progress semantics, no-target/completion labels, axe WCAG scans, native disclosure keyboard access, edit focus restoration and 200% text reflow. Narrow enlarged-text review fixes cover sizing and masthead wrapping. Browser screenshots inspected. Test-only IPC remains separate from native persistence; no manual screen-reader or new desktop-window verification.

Task 2.7 follow-up: all 24 Edge tests pass, including labelled cover picker/limits, disabled actions, invalid-file feedback, persisted-image preview with alt text, removal, 320/640/1100px reflow and axe WCAG scans. Browser cover tests use isolated IPC responses; native tests separately verify file/database reopen retention. No new actual desktop-window or manual screen-reader claim.

Task 2.6 follow-up: all 21 Edge tests pass, including deletion dialogs at 320/640/1100px with safe initial Cancel focus, Enter/Escape cancellation, focus restoration, explicit unchecked acknowledgement, conflict/reconfirmation, WCAG scans without disabled rules and reflow. Successful deletion moves focus to the surviving Books heading after the row/trigger disappears. Browser deletion uses test-only IPC responses; native persistence/rollback tests use disposable SQLite files separately. No new native GUI or manual screen-reader claim.

Task 2.5 follow-up: all 18 Edge tests pass. Editing at 320/640/1100px covers prefilled fields, invalid-title focus, Escape/focus restoration, draft retention across navigation, persistence-error feedback, disabled saving during conflict, explicit reload, successful UI update and axe WCAG scans without disabled rules. Editing browser workflows use test-only IPC responses; they are not proof of native desktop persistence. Native reopen tests use disposable SQLite files separately. Existing screen-reader/platform limitations remain.

Task 2.4 follow-up: all 15 Edge tests pass, including the creation dialog at 320/640/1100px, linked invalid-title feedback/first-field focus, Escape/trigger focus restoration, retained draft, explicit desktop-only persistence feedback and axe WCAG scans. These browser tests do not exercise native SQLite IPC or constitute manual screen-reader verification.

Date: 2026-10-24. Task: 1.9. Scope: current application shell/navigation and shared Button, Input, Modal, Card and ProgressBar. Product features remain unimplemented.

## Method and results

Playwright 1.64.1 ran against installed Microsoft Edge in headless mode with the real Vite frontend. @axe-core/playwright 4.14.0 scanned WCAG A/AA rule tags (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`) without disabling rules. All 12 browser tests passed; all 40 Vitest tests passed. TypeScript includes the browser test/configuration/fixture code.

| Check                   | Evidence / outcome                                                                                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Section keyboard access | Real Tab reaches skip link and each of five native navigation buttons; Enter/Space selects sections; changed-section heading receives focus               |
| Skip link               | Becomes visible on focus, enters the viewport and moves focus to main when activated                                                                      |
| Semantics               | One main landmark, heading hierarchy, labelled navigation and unique current section; axe scans passed for all five sections                              |
| Shared controls         | Visible labels and errors, disabled controls skipped, read-only field focusable/unchanged, visible button outline and native typing verified              |
| Modal                   | Actual browser Tab/Shift+Tab loop at 320px and 640px; initial focus, scrollable content, visible Close, Escape dismissal and trigger restoration verified |
| Compact/wide reflow     | Application and component fixture have no horizontal page overflow at 320x800, 640x480, 1100x760 and 1440x900 CSS pixels                                  |
| Text enlargement        | Application and fixture reflow at 200% root text size in a 640x480 viewport; modal Close remains in the viewport                                          |
| Contrast                | Axe contrast checks pass for rendered controls/default/error states and open modal; token calculations are recorded in DESIGN_SYSTEM.md                   |
| Forced colors           | Progress fill stays distinct from its track using Windows system colors; tested with forced colors active and reduced motion requested                    |
| Runtime                 | No page errors while loading the component fixture and opening the modal                                                                                  |
| Visual inspection       | Reviewed generated compact application and 320px component screenshots after confirming styles are correctly applied                                      |

320px testing covers effective narrow/reflow layouts beyond the native window's 640px minimum; it does not change that desktop minimum. Text-size testing and narrow viewports are complementary checks, not a claim that every browser/OS zoom combination was tested.

## Findings and fixes

1. **Progress disappeared in forced colors.** The first browser run reproduced identical white track/fill backgrounds. Added a scoped forced-colors rule using Canvas, CanvasText and Highlight; only the decorative fill opts out of automatic color replacement. The regression test now passes. Normal palette and behavior are unchanged.
2. **Test fixture loaded reset styles too late.** Screenshot inspection revealed missing button fills, field borders and Card padding despite valid semantics. Moved the global CSS import before component imports, matching src/main.tsx, and added browser guards for actual button fill/padding and input boundary styling. All accessibility scans were rerun on correctly styled controls.

No application keyboard or reflow defects were found by this review. Browser tests are retained as regression coverage; results are not inferred from jsdom alone.

## Reproduction

```powershell
npm.cmd ci
npm.cmd run test:run
npm.cmd run test:e2e
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
```

Install a supported Microsoft Edge beforehand; the current config uses channel msedge and does not download/update browsers. Playwright starts/stops its own loopback Vite server on port 5174, separate from Tauri's 5173. Keep 5174 free. The fixture at tests/fixtures/components.html is test infrastructure, not a product route; it is absent from the production JS entry bundle.

Screenshots for the layout matrix are under ignored test-results directories; failed tests retain screenshots/traces. Open an existing trace with `npm.cmd exec playwright -- show-trace <trace.zip>`. A new run may replace old artifacts. The committed test cases are the reproducible record.

## Scope limits and follow-up

Automated checks and this visual/keyboard review do not establish full WCAG conformance. No manual NVDA/Narrator session, user accessibility study, macOS/WebKit validation or new native WebView2 inspection was performed in 1.9. Earlier foundation tasks verified Tauri startup; these browser checks exercise the actual frontend in Edge, not the Tauri permission/native layer.

Recheck newly implemented screens and forms as milestones proceed; audit real validation, destructive confirmations and autosave announcements when those features exist. Release accessibility checks remain task 8.3. Milestone 1 acceptance (reusable components, coherent tokens, responsive layout and keyboard access) is satisfied for the current foundation.
