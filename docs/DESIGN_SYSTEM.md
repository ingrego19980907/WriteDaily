# Design system

## Writing toolbar (3.5)

The editor's feature-local FormattingToolbar uses shared secondary Buttons in a wrapping bordered group. Existing accent-strong/surface tokens distinguish pressed controls; aria-pressed carries the same state. Full text labels match accessible names. Forced colors use a double ButtonText border for pressed buttons, while normal focus/disabled styling stays with Button. One Tab stop, Arrow/Home/End navigation and native Enter/Space activation provide keyboard access. Headings 1–6, marks, lists and history are exposed without new tokens or icons. See TIPTAP_INTEGRATION.md and ACCESSIBILITY_REVIEW.md for behavior and checks.

## Library states and form feedback (2.11)

Loading is announced through status text while the semantic list is aria-busy. Confirmed empty and failed reads have distinct shared Card presentations with level-three headings and clear guidance. Create book remains the primary action; transient read failures provide a disabled-while-pending retry, while browser preview explains the desktop requirement. Existing committed cards stay visible during unresolved reads. Forms announce one validation summary, associate field messages with inputs and focus the first invalid field; native field focus waits for disabled pending inputs to become editable. File-validation feedback is linked to the picker. These states do not rely on color alone or silently discard entered details.

## Book progress (2.10)

BookProgress owns progress labels/descriptions around shared ProgressBar. A known zero has determinate zero semantics; unknown omits aria-valuenow. Reached/exceeded goals cap the bar and percentage at 100 while the visible/accessible description preserves actual words and separately shows excess. Below-target percentages floor to one decimal so 99.999% never appears as reached. A known count without a goal displays the count and a target hint, without a percentage/bar. Counts use English number formatting and all copy stays centralized. Completion badges remain independent; the component does not aggregate or persist words.

## Library grid (2.9)

Card actions (LIB.2): a 2.75rem three-dot button in the top-right opens an anchored action group containing Edit book, Manage cover and Delete book. This is a disclosure of native buttons, not an ARIA menu widget. Enter/Space toggles, Tab reaches actions, Arrow/Home/End moves inside, and Escape/outside interaction closes it. Selection opens existing guarded dialogs and hides the disclosure; cancellation/edit completion restores focus to the visible toggle. Edit/delete components stay mounted to preserve drafts. Open book remains the primary visible card action. Existing commit-only edit announcements remain available to screen readers outside the hidden group.

Single-card width follow-up (LIB.1): cards stop growing at 22rem (352px with the default root size). Empty columns are retained so one book does not expand across the library; columns stay aligned to the start. On narrower screens the minimum contracts to available width. Height remains content-driven to preserve wrapped titles, actions and expanded cover settings.

The library uses a native list with CSS Grid auto-fill columns, minmax(min(100%, 18rem), 22rem) and 1.5rem gaps. Only library content expands to max 72rem; standard reading sections remain max 48rem. Cards stack their cover/content within each column and preserve full wrapped titles and native actions. Verified column counts are 1 at 320/640px, 2 at 1100px and 3 at 1440px; text enlargement reduces columns naturally without horizontal overflow. Open book is an explicit native button, with disabled pending feedback, not a nested clickable card. Successful loading focuses the editor heading; return navigation focuses the library heading. No arrows/grid widget roles or hover-only controls.

## Book cards (2.8)

BookCard composes the shared surface/border/radius/shadow with a 2:3 managed-cover area, full serif title, optional word target, explicit unknown-progress state, persisted completion label and native edit/delete actions. It is a named article rather than a nested clickable card. Covers use contain to preserve the image; absent/failed covers have a decorative book outline and readable fallback. Narrow layouts stack cover/content; long Unicode/unbroken titles wrap without truncation. Fallbacks grow with text enlargement. Manage cover is a secondary button matching Edit/Delete in the dots group. It opens a separate shared Modal with immediate local draft preview, file selection, Save cover and optional Remove cover. Selection hides the action group; dismissal restores dots focus. The modal stays open to display committed results or failures; pending save/reload blocks dismissal. Choosing a supported file within the size limit immediately replaces the popup preview without changing the book. Closing ends the file-selection session and restores the saved cover on reopening; failed saves retain the selected file for retry. Only successful Save cover updates the library. Async FileReader work is aborted on replacement/unmount, and failed decoding falls back to the saved cover. The cover preview is horizontally centered within the cover controls. Committed cover results appear above the preview in a polite atomic status line using 0.8125rem text and a decorative outlined check in the muted-green success token (#4c6746). Forced colors use system colors. The chooser is a full-area native file input over a warm-background dashed box with a decorative file-plus SVG, visible focus outline and selected filename. Format/size guidance uses 0.8125rem type with unchanged contrast and validation. No hover-only actions, animation, new colors/fonts or external image assets. The responsive library grid and progress calculations remain 2.9/2.10.

Status: colors/typography implemented in 1.1 and application shell in 1.2; navigation implemented in 1.3 and Button in 1.4, Input in 1.5 and Modal in 1.6; Card implemented in 1.7; ProgressBar implemented in 1.8; accessibility/layout review completed in 1.9. `src/styles/tokens.css` defines centralized Tailwind theme variables; `src/styles/global.css` imports them and applies base styling.

| Token               | Value   |
| ------------------- | ------- |
| Background          | #F7F3EC |
| Surface             | #FFFEFA |
| Primary text        | #38352F |
| Accent brown        | #8B7355 |
| Sage green          | #A8B5A2 |
| Muted text          | #89847B |
| Border              | #E8E2D9 |
| Secondary text      | #706B62 |
| Strong accent       | #6F583F |
| Strong accent hover | #5C4732 |
| Error               | #9B443A |

## Token usage

The original seven palette colors are preserved. `@theme static` emits all tokens as CSS variables and exposes Tailwind utilities: `bg-background`, `bg-surface`, `text-foreground`, `text-secondary`, `text-accent`, `bg-sage`, `text-muted`, `border-border`. Use semantic utilities or `var(--color-...)` in CSS; do not scatter raw colors through components. See the [official Tailwind theme guidance](https://tailwindcss.com/docs/theme).

Base page styling uses background and foreground tokens. Secondary text uses the added darker #706B62 color. Muted, accent and sage remain available for decoration, fills or appropriately tested large text; they are not suitable defaults for normal small text on these light backgrounds. Border is a decorative separator, not a sufficient accessible control boundary on its own. Interactive control states/contrast will be defined and verified with the corresponding components.

### Measured text contrast

Ratios calculated from sRGB relative luminance, rounded for display. The foreground and secondary pairs exceed 4.5:1 for normal text.

| Text token | On background | On surface | Usage                                       |
| ---------- | ------------- | ---------- | ------------------------------------------- |
| foreground | 11.05:1       | 12.11:1    | Primary text                                |
| secondary  | 4.78:1        | 5.24:1     | Normal helper text                          |
| muted      | 3.36:1        | 3.68:1     | No normal small text                        |
| accent     | 4.06:1        | 4.45:1     | No normal small text                        |
| sage       | 1.94:1        | 2.12:1     | Decorative fills; no text on light surfaces |

## Typography

No font downloads or font dependencies are needed. Fonts resolve locally, with Ukrainian-capable system fallbacks; exact glyph appearance may vary by OS and installed fonts.

| Token / utility               | Value                                                              | Use                                                  |
| ----------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------- |
| --font-sans / font-sans       | Segoe UI, system-ui, -apple-system, BlinkMacSystemFont, sans-serif | Default UI                                           |
| --font-writing / font-writing | Georgia, Times New Roman, serif                                    | Reading/writing typography and current brand heading |
| --text-ui / text-ui           | 1rem, line-height 1.6                                              | Default UI and helper copy                           |
| --text-display / text-display | 2.5rem, line-height 1.2                                            | Bootstrap heading                                    |
| --text-writing / text-writing | 1.125rem, line-height 1.8                                          | Comfortable serif text                               |

Root font size remains 1rem so system/browser scaling is respected. Base styles live in Tailwind's base layer so utilities can override them. Section headings/subtitles use the serif stack; navigation and descriptive copy use the UI stack. Task 3.11 adds a labelled native manuscript-size select (12–32 px, default 18) with explicit commit-only apply. Saved size uses rem units so root enlargement still applies. UI fonts and persisted text/formatting are unchanged. See [editor preferences](EDITOR_PREFERENCES.md).

## Later component guidance

Proposed spacing scale: 4, 8, 12, 16, 24, 32, 48 px. Use generous space, comfortable reading width, restrained rounded corners, soft shadows and subtle motion respecting reduced-motion preferences.

Reusable Button, Input, Modal, Card and ProgressBar need visible focus states, semantic markup, labels, keyboard access and appropriate disabled/error states. Modals require focus management and restoration. Use modern minimalist book cards with attractive covers, never a wooden bookshelf. No glassmorphism, neon colors, dense dashboards or excessive gradients.

## Application shell

The shell uses a surface-colored masthead with a decorative border and a warm background main area. Content is limited to 48rem with fluid 1.5-3rem padding. Supplied navigation uses a surface sidebar, stacked above main below 48rem and 14rem wide alongside it on larger windows. Task 1.3 supplies five navigation buttons: a two-column grid in compact mode and one column in the sidebar. Native title bar is unchanged.

A localized skip link appears on keyboard focus with foreground-colored outline and border; its main target has tabindex=-1 for focus without adding a normal Tab stop. Main/aside content can wrap long text. Visual checks passed at actual Windows client sizes 1285x812 and 640x480. Section keyboard navigation is verified in 1.3; the current accessibility/layout audit passed in 1.9.

## Section navigation

Navigation buttons use foreground text on surface/background, a visible foreground outline on keyboard focus and generous padding. Current selection combines weight, background and a decorative accent border, with aria-current=page for assistive technology. Do not rely on the accent border alone to identify selection. Selecting a different section moves focus to its heading. At the supported minimum window size, vertical page scrolling is expected rather than hiding sections behind a menu. Native title-bar behavior remains unchanged.

## Button

`src/components/ui/Button.tsx` accepts native React button props (including ref, disabled, type and aria attributes) plus variant: primary (default), secondary or ghost. CSS lives in button.css in the components layer; className can add layout utilities. Native type defaults to button to avoid accidental submission; form actions explicitly request type=submit. Give every button visible text or an accessible aria-label. Icon-only buttons still require a label.

| Variant   | Appearance                                                                 | Use                          |
| --------- | -------------------------------------------------------------------------- | ---------------------------- |
| primary   | Surface text on strong accent; darker strong-accent hover                  | Primary action               |
| secondary | Foreground text on surface with secondary-colored border; background hover | Supporting action            |
| ghost     | Foreground text with transparent background; background hover              | Navigation and quiet actions |

Primary text contrast is 6.62:1, increasing to 8.66:1 on hover. Primary fill has at least 6.04:1 contrast against page surfaces. Secondary/ghost text and secondary borders retain the documented accessible foreground/secondary pairings. Original accent remains a decorative color, not primary button text/fill pairing.

All variants have minimum 2.75rem height, wrapping labels, 2px foreground focus-visible outline with 3px offset, native pointer/Enter/Space activation and disabled styling (opacity 0.5, unavailable cursor, no hover change). Native disabled removes the control from tab order and blocks activation; aria-disabled alone is not a substitute. No loading behavior, link rendering or destructive-action semantics are introduced. Navigation uses the ghost variant with existing layout/current-page utilities. Current visual/browser state review passed in 1.9.

## Input

`src/components/ui/Input.tsx` is a labelled single-line field. Required label is a visible string; optional hint and error are strings supplied by the consumer's localized copy. It accepts native input props/ref plus text, email, password, search, tel, url, number and date/time types; it is not a checkbox, file picker, select or textarea.

A generated useId connects label and input unless the caller supplies a unique explicit ID. Hint/error IDs derive from the field ID; aria-describedby merges those with caller-provided IDs. Error sets aria-invalid=true even if the caller supplied false; when error clears, the supplied aria-invalid value is restored or omitted. Error text is visible and described, so invalid state does not rely on color. No automatic validation timing or live announcement policy is introduced; forms own those decisions.

Input defaults to type=text, supports controlled or uncontrolled usage, and forwards required, disabled, readOnly, name, min/max, autocomplete and other native attributes. Disabled skips Tab and blocks editing; read-only stays focusable. className applies to the input itself; field layout is a full-width grid with wrapping labels/messages.

The surface field has a secondary-colored border, foreground text, 2.75rem minimum height, 2px foreground focus-visible outline/3px offset and an accessible secondary placeholder. Placeholder never replaces the visible label. Error #9B443A has 6.34:1 contrast on surface and 5.79:1 on background. Read-only uses background fill; disabled uses opacity 0.5. Native date/time chrome may vary by platform. No form screen currently imports Input; real feature-form integration remains later work; shared states were audited in 1.9.

## Modal

Task 3.10 adds optional fullScreen, headerActions and onEscapeKeyDown props. Fullscreen fills the app viewport with a non-scrolling header and scrolling body; it does not request native/browser fullscreen. Header actions precede Close in the normal focus order. Consumers can prevent Escape dismissal before applying their own visual-mode exit. All defaults and Radix focus/close behavior remain unchanged for existing callers. See [focus mode](FOCUS_MODE.md) for the editor consumer and checks.

`src/components/ui/Modal.tsx` composes Radix Dialog with WriteDaily styling and shared Button. Required props: open, onOpenChange, trigger (one semantic button element), title, closeLabel and children. Optional description is rendered visibly and connected to the dialog; if omitted, its description reference is also omitted. Title, close label and content come from the caller's localized messages. Use Button or another trigger that forwards native props/ref.

Radix portals the modal into document.body, blocks outside interaction, traps focus, handles Escape/backdrop/Close requests and restores focus to its trigger. The controlled onOpenChange callback lets a caller refuse a close request while an unsaved form needs confirmation. Default focus follows Radix's first-focusable policy (the header Close action in the tested content); forms can manage their own initial field focus. No automatic saving, discard confirmation or destructive alert-dialog behavior is included.

Content uses a surface background, secondary border, 1rem radius and a soft --shadow-modal. The --color-overlay token mixes foreground at 40% opacity; the shadow mixes foreground at 20%. Default width is min(32rem, 100vw - 2rem), maximum height 100dvh - 2rem. Chapter text opts into size=large with width 100vw - 2rem and height 100dvh - 2rem, leaving 1rem around the popup. Its body fills the remaining height and aligns content to the top. Full-screen focus mode overrides this size. The body scrolls independently while header/Close stay visible. No animation or runtime font request is introduced. Compact and wide visual previews were inspected in actual Tauri; temporary preview sources were removed. Current application accessibility/layout review passed in 1.9.

## Card

`src/components/ui/Card.tsx` provides a noninteractive div surface, forwarding native div props/ref and accepting className for layout. Content, headings and any child actions belong to the caller. It does not add a role, heading, Tab stop or click behavior automatically; use native buttons/links for actions instead of treating the whole div as a control.

Card uses surface background, foreground text, decorative border, 0.75rem radius and 1.5rem padding. The --shadow-card token is a subtle 0 2px 8px shadow using foreground at 4% opacity. min-width:0 and overflow-wrap:anywhere let it fit compact grids and long content; focus outlines of child controls are not clipped. Component-layer CSS permits utility overrides without a variants library.

Existing Coming soon notices now use Card with a level-two heading. This is a shared presentation primitive; library-specific covers, book progress and book actions remain milestone 2. Current visual review passed in 1.9.

## ProgressBar

`src/components/ui/ProgressBar.tsx` is a read-only progress indicator with required visible label, optional numeric value (or null) and max (default 100). The labelled role lives separately from the label text because progressbar descendants are presentational. It exposes aria-valuemin=0, normalized aria-valuemax and aria-valuenow for known values. It adds no Tab stop, live region or keyboard interaction. Native div props/ref apply to the bar; custom localized aria-valuetext may describe word counts. Keep that text synchronized with the actual value.

| Input                              | Behavior                                         |
| ---------------------------------- | ------------------------------------------------ |
| Finite value below 0               | Clamp to 0                                       |
| Finite value above max             | Clamp to max                                     |
| Positive finite max                | Preserve that range, including fractional values |
| Nonpositive/nonfinite max          | Fall back to 100                                 |
| Null, undefined or nonfinite value | Indeterminate; omit aria-valuenow                |

The bar is 0.75rem high, rounded and full-width in its grid wrapper. Shared border color is the track, secondary is its visible boundary and strong accent is the fill (5.19:1 fill/track contrast). Known fill width follows normalized value/max; unknown state uses a static centered 30% segment, which is not a percentage completion claim. No animation is needed, including in reduced-motion mode. Do not use the pale sage as a low-contrast progress fill on the light track.

See [WAI-ARIA progressbar guidance](https://www.w3.org/TR/wai-aria/#progressbar). The component is not yet used by a real progress feature; do not insert example counts into product screens. Visual/browser review passed in 1.9; actual book/daily aggregation remains feature work.

## Accessibility/layout audit (1.9)

Current foundation passed 12 Edge browser checks and 40 component tests. Axe WCAG A/AA-tagged scans found zero violations on all section views, the correctly styled component fixture and the open modal, with no disabled rules. Keyboard navigation, visible skip/focus, modal trapping/restoration, compact reflow and 200% text enlargement passed. See [review report](ACCESSIBILITY_REVIEW.md) for the full matrix and limits.

ProgressBar has a forced-colors override: Canvas track, CanvasText boundary, Highlight fill. Only its decorative fill uses forced-color-adjust:none so the chosen system Highlight remains visible; the rest of the interface follows the user's forced palette. Static progress has no motion to suppress.

Global Tailwind/base CSS must be imported before component modules at an application/test entry point to establish cascade layer order. The browser fixture now follows this rule and guards actual button fills/padding and field borders. Recheck real feature screens and manual assistive-technology behavior as they are added; release accessibility remains task 8.3.

Daily goals (4.2): a shared text-secondary, wrapping DailyGoal paragraph displays the committed target or No daily goal in the card/editor context. The existing labelled form input includes whole-number/blank-removal help and existing inline errors/focus. No target-derived daily completion percentage or achievement color is shown.

Editor footer (ED.2): the existing manual Save action remains full-sized at the left; compact SaveStatus and the current/saved numeric pair align right in a sticky surface-backed footer. Secondary text uses 0.75rem type, wrapping at narrow widths. Visible suffixes are omitted while complete count labels remain screen-reader-only; unknown numeric values use an em dash. Counting policy is native hover-title help on the focusable autosave hint, with an aria-describedby equivalent for keyboard/screen-reader access. Focus mode hides the numeric pair and retains the save status.

ED.3: the autosave/plain-text-paste hint now sits in the footer information group immediately before the compact counters, inheriting its small type and wrapping. The native counting-policy hover title and accessible description stay attached to the same focusable hint.

ED.4: footer information uses a two-row grid: save status above, shortened autosave hint followed by the current/saved numeric pair below. The hint reads Changes save automatically after 2 seconds without editing. Its counting-policy hover help is retained.

Editor keyboard save (ED.5): the existing Save chapter text action supports Ctrl+S and Command+S inside the active chapter dialog. A localized button hover title and aria-keyshortcuts expose the binding. The same save guards, pending lock and commit-only status apply.

Compact styles (ED.6): a sticky, wrapping surface panel above manuscript text combines font-size minus/select/plus controls with formatting. B/I use typographic glyphs, pressed colors and complete accessible names/tooltips; other normal-mode operations retain their full labels. Buttons keep 2.75rem targets. Focus mode shows the font controls plus B/I. Each size action automatically persists the selected global text size, applying it only after success; settings errors/status remain visible. No underline mark or per-selection font-size schema is added.

ED.7: the compact style panel omits the font apply/check button and successful-save caption. Each accepted size/step action starts persistence automatically; pending controls are disabled. Failures remain visible and offer retry or reload as appropriate.

ED.8 current font semantics: the size selector and minus/plus format the selection or future typing, with Mixed for heterogeneous ranges. They no longer alter global preferences or show settings-save captions. Inline formatting uses chapter autosave/Ctrl+S and the existing save status. Normal/focus panels share this behavior; legacy global-control notes above are superseded.

## List controls (ED.9)

Bullet and numbered lists use 20px currentColor outline SVG icons with rounded strokes, accessible English names/tooltips and existing pressed/disabled/focus states. List actions precede bold/italic in the wrapping toolbar beside font-size controls. The toolbar aligns to the top of the font controls; narrow screens wrap without horizontal overflow. Focus mode includes both list actions. Arrow/Home/End navigation follows the visible action order; font controls retain native Tab behavior. No dropdown is shown because each button directly toggles its list type.

## Focus toolbar pinning (ED.10)

In focus mode the toolbar wrapper itself is sticky within the full manuscript container, so the panel stays at the modal scroll viewport top through long documents and new paragraphs. Regular-mode toolbar positioning is unchanged. The modal header remains outside the scroll body. Focus-mode browser coverage checks middle/end scrolling and typing at 320/1100px.

## Focus header and footer (ED.11)

Focus mode uses the current chapter title as the dialog heading. The compact formatting panel renders into a header slot alongside the title and focus/close controls; responsive wrapping accommodates small viewports. Long titles truncate visually while retaining their full accessible name. Header/footer heights are capped with independent scrolling at large text sizes to preserve writing space. The save footer renders outside the scrolling body: save action at the left edge, compact live status at the right. React portals preserve the existing editor instance, guarded save action and save-status lifecycle. Exiting focus mode restores regular controls. This supersedes the ED.10 in-body sticky wrapper.

## Centered focus formatting and history (ED.12)

The focused header uses equal flexible side columns around the formatting panel, keeping its center at the viewport center regardless of title/action widths. At 64rem and below it stacks title, centered formatting and right-aligned close/focus controls in DOM order. Header/footer height limits and scroll access remain. Undo/redo are available in compact mode as mirrored 20px currentColor rounded-stroke arrows, with English names/tooltips, native disabled history state and existing keyboard navigation. The same history icons appear in regular mode.

## Underline formatting (ED.13)

An underlined U button follows Italic in normal and focus toolbars. It preserves selection, exposes an English name/tooltip and pressed state, and uses the same disabled guards and keyboard navigation as bold/italic. Cursor-only activation formats subsequent input. Chapter content v3 adds the attribute-free underline mark, compatible with bold/italic/fontSize (four unique marks maximum); v1/v2 remain readable and strict. Saves retain existing debounce, Ctrl+S and revision checks. No SQL migration or dependency is required.

## Focus headings (ED.14)

Focus formatting includes H1, H2, H3 and H4 after Underline and before history controls. Labels, tooltips and accessible names use the same compact English copy; pressed states reflect the active block. Clicking the active heading returns to paragraph. Regular mode keeps Heading 1 through Heading 6. The focused action group wraps onto its own row when needed so the larger set remains usable on narrow screens. Content grammar/persistence are unchanged.

## Focus alignment and smaller controls (ED.15)

Focus mode adds left/center/right/justified paragraph alignment using matching 18px outline icons and centralized English labels/tooltips. Alignment affects the current paragraph/heading or all intersecting text blocks in a selection; mixed selections have no active alignment. Default alignment is left. Marks, heading levels, text and word counts are preserved. Toolbar buttons and size selector use a 2.25rem (36px baseline) minimum height; buttons retain visible focus and exceed the 24px target-size minimum.

Content v4 adds optional textAlign attributes to paragraphs/headings, restricted to left/center/right/justify. v1-v3 remain readable and the serializer emits the oldest grammar preserving all formatting. Editor-generated null/default alignment attributes are omitted from persisted JSON, without changing writing or other attributes. Native saves keep body/count/revision atomic; no SQL migration or dependency is required.

## Named font families (ED.16)

Both toolbar modes include a labelled native font-family selector before size controls, with twenty named Windows system fonts from resources/manuscript-fonts.json. Georgia matches the existing unmarked writing default. Mixed selections show Mixed; cursor changes become stored typing marks. Selector ranges are captured on pointer/keyboard focus, restored only when necessary, and consumed once so later typing keeps its current cursor and other marks. The bounded family mark saves through the existing chapter autosave/Ctrl+S flow.

The shared catalog contains Arial, Bahnschrift, Calibri, Cambria, Candara, Consolas, Constantia, Corbel, Courier New, Georgia, Lucida Console, Lucida Sans Unicode, Palatino Linotype, Segoe UI, Segoe Print, Segoe Script, Tahoma, Times New Roman, Trebuchet MS and Verdana. System fonts are used locally; no proprietary font files are redistributed or network fonts loaded. Missing fonts on another machine use the catalog's serif/sans-serif/monospace/cursive fallback while retaining the selected family name.

Content v5 adds fontFamily marks with one allowlisted family attribute and up to five unique composed marks. v1-v4 remain readable; the serializer emits the oldest grammar preserving the document. Native validation reads the same catalog. Header stacking begins at 80rem to accommodate the wider centered panel; controls continue to wrap at compact sizes. No SQL migration or dependency is required.

## Preview before writing (ED.17)

Chapter text now opens as a selectable read-only preview, with chapter navigation and a Start writing action (English copy for the requested writing-entry label). The preview has no formatting controls, manual save button or editing footer. Its textbox declares aria-readonly and remains keyboard-focusable for reading/copying; typing, paste/drop and formatting/undo shortcuts cannot modify it. Start writing enables the existing focused editor, toolbar and save footer.

Exiting focused writing returns to preview without replacing the editor, writing, selection or history. Unsaved drafts remain intact, existing autosave can finish, failed saves remain visible and dismissal guards still require explicit discard. Users can re-enter writing to retry saving. Pending-save completion consults the current preview state before enabling editing, preventing a late commit from unlocking preview. No persistence format or service changes.

## A4 writing sheets (ED.18)

Chapter writing/preview uses A4-proportion paper sheets, scaled margins, warm surface/border/shadow tokens and decorative page numbers. Automatic line flow preserves document text and formatting. The writing footer adds Add page at the chapter end; preview stays read-only. See [A4_PAGES.md](A4_PAGES.md) for persistence, layout semantics and limits.

## Chapter order controls (ED.19)

Dotted drag handles, currentColor rounded up/down SVG buttons and a drop-target outline use existing tokens. Native buttons have accessible direction/title names, visible focus and boundary/pending disabling; a text hint explains both interaction methods. Controls wrap at compact widths and 200% enlargement. The reload icon retains its accessible name and tooltip beside Create chapter. See [CHAPTER_ORDER.md](CHAPTER_ORDER.md).
