# Accessibility and layout review

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
