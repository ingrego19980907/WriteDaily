# Design system

## Achievement notifications (6.6)

Unlock feedback uses a compact shared Card with existing cream, sage and warm brown tokens, a decorative Lucide Trophy, small sans-serif status, serif achievement names and a labelled 44px Dismiss control. New names from one claim appear together; later batches queue. Outside dialogs the surface sits at the lower right, at most 26rem wide and bounded by the viewport. Inside a shared Modal it uses an inline slot below the header, including focus mode. Narrow containers put text below the icon/control; long names wrap without horizontal overflow at 320px and 200% text.

A pre-mounted polite live region announces confirmed names without moving focus. The eight-second timeout pauses for hover, contained keyboard focus and hidden documents; interaction resumes with a full eight seconds. Explicit dismissal restores the previous connected control when the notice owned focus. There is no global Escape handler, sound or animated entrance. Forced colors preserve the surface/borders/control; reduced motion disables transitions. Existing historical unlocks do not replay on upgrade or restart. See [accessibility evidence](ACCESSIBILITY_REVIEW.md#achievement-notifications-66-2026-10-29) and [delivery limits](ACHIEVEMENTS.md#unlock-notifications-66).

## Achievements page (6.5)

The existing Achievements navigation destination now displays the production page instead of Coming soon. It retains the shared H1/subtitle and keyboard focus handoff, uses the wide shell container, and wraps its header at enlarged/narrow sizes. Your milestones, the confirmed unlocked/total count and a labelled Refresh/Retry button form a lightweight toolbar. All eight existing cards appear in a native list with an auto-fit grid using `minmax(min(100%, 18rem), 1fr)` and 1.25rem gaps. Existing cream/brown/sage tokens, serif hierarchy and shared controls remain in force.

Initial loading does not invent zero unlocks or an empty-success illustration. A successfully reconciled empty collection shows Your next milestone awaits alongside eight locked milestones. Initial failures show unavailable states; later failures keep the last confirmed cards/counts with an explicit retained-data hint. Browser preview explains the desktop requirement and disables the unsupported refresh action. All production copy remains centralized in `en.ts`.

Saved rows and their original dates are read through the native services; refresh reconciles on the native date and displays its committed result. No client eligibility or toast notification is fabricated. The current native endpoints expose unlocks, not per-rule numeric progress; locked cards therefore retain their honest Progress unavailable state. The page does not guess counters from manuscript length or a partial calendar range. Date formatting resolves the current display timezone on render after travel/focus updates, preserving the original UTC `datetime`.

The page retains validated unlocks across section navigation while unmounting its active reader, date timer and focus/visibility listeners when hidden. Loading/error announcements are request feedback, not milestone notifications (6.6). Native list semantics, header focus, keyboard retry, forced colors and 200% reflow are verified at 320/640/1440px; normal wide/narrow captures were inspected. All 900 Vitest and 216 full-run Edge scenarios pass, with zero axe A/AA-tagged violations in the tested page states. This completes the production integration that remained pending in 6.4.

## Achievement cards (6.4)

`AchievementCard` composes shared Card and ProgressBar with the existing cream/surface, brown, sage, success, secondary and border tokens. It uses a 1rem radius, subtle shared shadow, 1.25rem padding, a 3.25rem rounded icon medallion, a 1.375rem serif title and readable sans-serif requirements. Eight decorative Lucide illustrations distinguish the product milestones; icons use the established thin strokes. Unlocked surfaces have a quiet sage border and green emblem/badge; locked and unavailable cards retain full text contrast. Text and separate check/lock/help icons convey state without relying on color or opacity.

The card is a named read-only article with an H3, visible requirement and noninteractive state badge. It adds no Tab stop, action button, hover-only explanation or live notification. A validated persisted unlock owns the Unlocked badge and original UTC `time[datetime]`, displayed as a local English date. Evaluation alone cannot unlock it. Null/malformed saved status is explicitly unavailable; a successful empty unlock list means Locked (not yet persisted), independent of whether eligibility has been established.

Optional checks show full formatted confirmed counts and a thin sage progress bar with a named label, numeric bounds and explanatory value text. Positive incomplete-history bounds say At least; uncertain zero/absent/invalid/mismatched progress renders Progress unavailable instead of a fabricated zero. Eligible unpersisted checks retain Locked with a confirmation hint. Saved unlocks ignore reduced/unknown current progress and omit the bar. The End explains its missing explicit-completion action without adding a placeholder control.

Cards wrap intrinsically without clipping titles, descriptions, badges or counts. Natural content height and a footer pushed to the bottom support aligned grid rows; the production collection/grid belongs to 6.5. Border/background/fill transitions are 160ms, disabled for reduced motion. Forced colors use system surfaces/borders and Highlight progress. All new production copy is in `app/i18n/en.ts`; no new palette, font, dependency or external image is introduced.

The isolated `/tests/fixtures/achievement-cards.html` preview covers all eight cards and saved, locked, eligible and unavailable cases without touching native storage or adding demo records. At 320/640/1100px, normal and 200% text, browser checks verify no overflow, full long Cyrillic/unbroken labels, named progress, native keyboard traversal, reduced motion and forced colors. Axe A/AA-tagged scans report zero violations. All 886 Vitest and 206 full-run Edge scenarios pass; library/editor regressions remain passing. The component is ready for the separate 6.5 page; it is not mounted in production navigation yet.

## Library cards without Writing details (LIB.22)

BookCard no longer renders the Writing details disclosure or its secondary daily-goal, detailed-progress and required-pace panel. Its footer retains Open, with existing row alignment and 44px action targets. Grid/list cards keep their cover, full accessible title, target, deadline, compact progress bar/percentage and saved counts, plus the floating book-actions menu. Removed unused disclosure styling and the obsolete label; no hidden version of the panel remains in card markup.

Daily goals stay editable in Edit book. The existing Writing Editor retains DailyGoal, BookProgress and WritingPace, using the same saved data and calculations. This supersedes the earlier LIB.17 contextual-panel and LIB.21 action/details-footer descriptions; the current library footer contains Open only. No editor, persistence or domain-logic changes.

## Final My Library polish (LIB.21)

My Library now places the collection directly after its introduction. Books, search/view controls and New Book share a wrapping toolbar; filters follow, then the collection or its empty state. The existing detailed current/longest streak cards remain fully available in an adaptive grid below the books, separated by a subtle border. Their readers, calculations, refresh policy and header summary portal are unchanged. Header and library content share the existing 70rem maximum width; established card caps and one/two-column behavior remain.

library-layout.css owns this feature-local spacing. A named library-screen container switches the toolbar to search above view/New Book controls below 36rem. Filters become two columns there; below 15rem they stack to accommodate enlarged text. The toolbar aligns 44px action targets with the padded view group, including an initially empty creation live region that remains mounted without taking layout space. The compact Books H2 uses the existing serif stack; metadata retains sans-serif type and full tabular counts. Detailed streak headings have equal minimum height.

BookCard content is a flex column with the action/details footer pushed to the bottom of the available row height. Covers retain their fixed 3:4 frames and proportional image fitting. Natural heights, two-line title previews and hover/focus expansion remain; long Cyrillic/unbroken titles wrap and large word counts stay complete. No fake placeholders or counts are added. Existing cover, menu, create/edit/delete and empty-state behavior is preserved.

Hover/focus-within card borders transition for 160ms; library button/search/disclosure and sidebar color/border feedback use 150ms. No geometry, progress width, outline or page transition is animated. Reduced motion disables these transitions. Selected filters keep a darker warm brown and surface-colored text under hover instead of falling through to inactive styling; active navigation retains beige. Focus outlines remain immediate and visible, and forced colors retain system-color selection boundaries/text. The existing strong primary colors provide 6.62:1 normal and 8.66:1 hover text contrast; secondary text stays at least 4.78:1 on the cream background. Archive copy explains availability without exposing schema details.

Review used earlier reference fragments and the approved tokens because no new full-page reference was attached. Existing feature gaps are Archive/duplicate operations, Statistics and the Achievements Coming soon view; they were not expanded by this visual task. See TASKS.md and ACCESSIBILITY_REVIEW.md for checks and limits.

## Library empty states (LIB.20)

The confirmed-empty library uses a centered Card below the filters/search controls, with the existing warm cream background, subtle border, 1.5rem corners and generous responsive padding. A decorative 40px Lucide BookOpen sits in a soft sage/cream circle. The serif heading reads Your story starts here; the description is Create your first book and begin writing, one day at a time. The primary Create your first book button reuses the warm brown New Book styling, Plus icon, visible focus and 44px target. Text/buttons wrap on narrow windows and at 200% text size. Forced colors retain system-color boundaries and text. No artwork dependency, remote image or new palette is used.

The new action opens the same BookDetailsDialog instance as the toolbar button. A feature-local portal places the second button in the empty-state slot, preserving one draft and one guarded save flow. Closing returns focus to the invoking button while it remains connected; after a successful creation removes that state, the surviving New Book trigger receives focus. Existing validation, cover workflow and persistence remain unchanged.

A separate No books found state uses a Search icon, existing search guidance and a secondary Clear search action. It clears only the query and focuses the search input, retaining the filter/view and loaded records. The existing empty-filter message uses the same surface with an All Books recovery button. Loading, failed reads and desktop-required states remain distinct; no empty illustration or invented book is used as a loading/error substitute. Copy is centralized in en.ts.

## New Book and creation modal (LIB.19)

New Book is a native primary Button aligned at the right of the top library toolbar, with a decorative 18px Lucide Plus, warm strong-accent fill, near-white surface-colored content, 12px corners and a subtle hover transition. Existing visible focus and 44px targets remain; reduced motion removes transitions. Its polite committed-result message wraps beneath the action.

Create New Book uses a cream background, 20px rounded corners and the existing serif stack in warm brown. At up to 56rem width, a two-column form places the optional cover picker/preview left and metadata right. A 40rem content-container query stacks columns on narrow windows or enlarged text. The header is independently scrollable and capped at 40dvh so 200% text retains a usable body. Title, target word count, daily word goal and deadline keep their existing validation/help. Only the creation title label changes to Book title; editing keeps its prior labels and layout.

CoverPicker reuses the existing native full-area file input, dashed box, filename, linked hints/errors and focus styling. The centered 3:4 preview uses contain fitting with bounded local FileReader work; the empty state is local CSS/book-icon art. Selection alone writes nothing. Creating with a cover composes existing metadata and cover services. A failed second commit clearly retains the created book, locks its metadata and offers cover-only retry or Finish without cover, preserving the saved identity across dismissal. Pending operations block dismissal and double submission. No schema, repository, editor or global modal appearance changes; Modal only gains an optional className for scoped styling.

## Floating book actions (LIB.18)

The top-right 44px target uses a small decorative Lucide Ellipsis. Its native-button disclosure is portalled to document.body, fixed-positioned beside the trigger, clamped to 8px viewport margins and flipped above when necessary. A warm rounded surface contains Pencil Edit book, ImagePlus Manage cover and Trash2 Delete book; Delete uses the existing error token and a subtle divider. Focus remains visible inside the scrollable panel. Enter/Space and Tab work with arrow/Home/End shortcuts, Escape and outside dismissal. Modal confirmation, commit guards and draft retention remain unchanged. Duplicate and Archive are absent pending the separate TASKS.md follow-ups.

## Compact card progress and deadlines (LIB.17)

The primary BookCard hierarchy is title, Target-icon word goal, CalendarDays deadline, a 0.375rem progress bar with a right-aligned percentage, full current/target word count and Open. No deadline is explicit; due-today and overdue states retain visible text/color, while upcoming/completed relative hints remain accessible without another visible line. BookDeadline's compact flag is opt-in, leaving the editor presentation unchanged.

BookCardProgress consumes the existing calculateBookProgress result. Normal fill mixes 25% sage with the existing success green for 3.63:1 track contrast; a reached word target uses the strong warm accent. Reaching a word target does not mutate explicit book completion. The existing rounding/capping rules remain: 99.9% below target, at most 100% visually, actual counts preserved beyond target. Unknown counts remain indeterminate with an unavailable description, and missing targets show known words or unavailable without a fake percentage. Counts use tabular numerals and wrap without abbreviation, including maximum safe integers. Forced colors use Highlight.

A native Writing details disclosure sits in the footer alongside Open when width permits. Its default-collapsed panel contains the saved daily goal, detailed progress/remaining/excess messages and the existing full WritingPace component. Its summary supports native Tab/Space/Enter, visible focus and a 44px minimum target. Opening details changes no data. Shared editor progress and pace components/calculations are unchanged.

## Library cover presentation (LIB.16)

My Library uses consistent 3:4 frames for uploaded, default, loading and failed covers, with 0.625rem rounded corners and the existing border token. Uploaded local PNG data uses object-fit: cover and centered proportional cropping; it is never stretched, regenerated or rewritten. Loading/read-error text sits below the fixed frame. Manage cover previews keep contain rendering for inspecting the whole selected image.

For books without a custom cover, CSS draws a warm pastel gradient, inset border, subtle spine and abstract arc using existing orange/sage/cream/brown tokens. A bundled decorative Lucide BookOpen icon and three-line serif title complete the book art. Titles hide below 6rem of cover width to preserve legibility; the adjacent full book heading remains accessible. The art is hidden from assistive technology to avoid repeating that title, with the existing No cover yet screen-reader text retained. Defaults generate no image file or persistence write and naturally reflect the saved title after restart. Forced colors use system-color borders and text.

## Compact horizontal book cards (LIB.15)

Book cards use the existing warm surface, #E8E2D9 border token and soft card shadow, with a 1rem radius and 0.875rem padding (16/14px at the normal root size). The left cover is 8.75rem wide (140px), framed at 3:4 with cover rendering (LIB.16); a CSS default handles absent uploads, and loading/read feedback stays below the fixed frame. Card container queries shrink covers to 5.25rem below 24rem of inner width and stack content below 13rem, including enlarged text layouts. Cover-dialog previews retain their previous sizing.

The right side uses a 1.25rem serif title and 0.8125rem sans-serif metadata. Titles show two lines by default; their full text remains in the DOM, accessible name and native title, and expands on hover or keyboard focus. Focus has a visible outline and centralized explanatory copy. Target, daily goal, deadline, progress, completion and pace semantics/calculations remain available. LIB.17 places the compact primary progress summary above Open and moves daily goals, detailed progress and pace into the Writing details disclosure; shared editor presentations are unaffected. The Open button has a short visible label, its existing Open book accessible name and callback/pending behavior, and a 44px minimum target. Ghost dots keep the same 44px target and existing action disclosure/modal behavior.

## Library search and views (LIB.14)

A compact pill-shaped search field with a decorative Lucide Search icon and an accessible label sits above the book collection, alongside a rounded Grid view/List view icon-button group. Shared input contrast/focus styles and Button targets remain in use; strong brown aria-pressed buttons distinguish the selected view, including hover. Reduced motion removes transitions; forced colors preserve a double selection border. Query and view are local React state, initially empty/grid. Title search trims the query, normalizes canonical Unicode forms and compares lowercase substrings; it combines with status selection without changing category counts. A polite result count and visible no-match guidance distinguish search results from loading/errors and an empty library. Both layouts retain the same list, cards and book actions. Both modes use the LIB.15 horizontal card and its container-based cover sizing; List remains a single column.

## Library filters (LIB.13)

A wrapping pill-shaped group of native pressed buttons sits immediately above the book grid. Shared cream/surface and warm strong-accent tokens distinguish inactive and selected states; count badges use the complete loaded library snapshot, independent of selection. Focus outlines, reduced-motion transitions and forced-color selection borders remain visible. Buttons support native Tab, Enter and Space. Unknown reads show unavailable counts rather than zeros. Archived stays disabled with a visible explanation; an empty selected category offers guidance back to All Books without claiming the library is empty.

## Writing toolbar (3.5)

The editor's feature-local FormattingToolbar uses shared secondary Buttons in a wrapping bordered group. Existing accent-strong/surface tokens distinguish pressed controls; aria-pressed carries the same state. Full text labels match accessible names. Forced colors use a double ButtonText border for pressed buttons, while normal focus/disabled styling stays with Button. One Tab stop, Arrow/Home/End navigation and native Enter/Space activation provide keyboard access. Headings 1–6, marks, lists and history are exposed without new tokens or icons. See TIPTAP_INTEGRATION.md and ACCESSIBILITY_REVIEW.md for behavior and checks.

## Library states and form feedback (2.11)

Loading is announced through status text while the semantic list is aria-busy. Confirmed empty and failed reads have distinct shared Card presentations with level-three headings and clear guidance. New Book remains the primary action; transient read failures provide a disabled-while-pending retry, while browser preview explains the desktop requirement. Existing committed cards stay visible during unresolved reads. Forms announce one validation summary, associate field messages with inputs and focus the first invalid field; native field focus waits for disabled pending inputs to become editable. File-validation feedback is linked to the picker. These states do not rely on color alone or silently discard entered details.

## Book progress (2.10)

BookProgress owns progress labels/descriptions around shared ProgressBar. A known zero has determinate zero semantics; unknown omits aria-valuenow. Reached/exceeded goals cap the bar and percentage at 100 while the visible/accessible description preserves actual words and separately shows excess. Below-target percentages floor to one decimal so 99.999% never appears as reached. A known count without a goal displays the count and a target hint, without a percentage/bar. Counts use English number formatting and all copy stays centralized. Completion badges remain independent; the component does not aggregate or persist words.

## Library grid (2.9)

Card actions (LIB.2): a 2.75rem three-dot button in the top-right opens a body-portalled, viewport-clamped action group containing Edit book, Manage cover and Delete book. This is a disclosure of native buttons, not an ARIA menu widget. Enter/Space toggles, Tab reaches actions, Arrow/Home/End moves inside, and Escape/outside interaction closes it. Selection opens existing guarded dialogs and hides the disclosure; cancellation/edit completion restores focus to the visible toggle. Edit/delete components stay mounted to preserve drafts. Open book remains the primary visible card action. Existing commit-only edit announcements remain available to screen readers outside the hidden group.

Single-card width follow-up (LIB.1, superseded by LIB.15): the original 22rem cap is now 34rem to accommodate horizontal covers and metadata. Empty columns remain, preserving the same card width for single and populated libraries. Height remains content-driven, with grid cards stretching to match their row.

The library keeps its native list and CSS Grid auto-fill columns, now minmax(min(100%, 26rem), 1fr) within 70rem, with 1.25rem gaps and a 34rem cap per card. At most two columns fit; verified counts are 1 at 320/640/1100px and 2 at 1440px. Text enlargement reduces columns without horizontal overflow. List mode remains a single column using the same compact cards. Open book is an explicit native button with pending feedback; successful opening and return navigation preserve their existing focus targets. No ARIA grid widget or hover-only actions.

## Book cards (2.8)

BookCard uses the LIB.15 compact horizontal layout with a 3:4 managed-cover frame, serif title, optional word target, explicit unknown-progress state, persisted completion label and native edit/delete actions. It is a named article rather than a nested clickable card. Library uploads use proportional cover fitting; missing uploads use the LIB.16 CSS default, while loading/read failures retain explicit feedback below the fixed frame. Dialog previews use contain rendering to inspect the whole image. Narrow cards shrink their covers before stacking at extreme/enlarged sizes; long Unicode/unbroken titles wrap within a two-line preview that expands on hover/focus and retains its full accessible text. Fixed frames retain their ratio with text enlargement; status text below them wraps without clipping. Manage cover is an icon-and-label ghost button matching Edit/Delete in the dots group. It opens a separate shared Modal with immediate local draft preview, file selection, Save cover and optional Remove cover. Selection hides the action group; dismissal restores dots focus. The modal stays open to display committed results or failures; pending save/reload blocks dismissal. Choosing a supported file within the size limit immediately replaces the popup preview without changing the book. Closing ends the file-selection session and restores the saved cover on reopening; failed saves retain the selected file for retry. Only successful Save cover updates the library. Async FileReader work is aborted on replacement/unmount, and failed decoding falls back to the saved cover. The cover preview is horizontally centered within the cover controls. Committed cover results appear above the preview in a polite atomic status line using 0.8125rem text and a decorative outlined check in the muted-green success token (#4c6746). Forced colors use system colors. The chooser is a full-area native file input over a warm-background dashed box with a decorative file-plus SVG, visible focus outline and selected filename. Format/size guidance uses 0.8125rem type with unchanged contrast and validation. No hover-only actions, animation, new colors/fonts or external image assets. The responsive library grid and progress calculations remain 2.9/2.10.

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

The cozy sidebar (LIB.9) uses the existing warm cream background and subtle border tokens. At 48rem and wider, the feather/WriteDaily banner sits above navigation in the left 13.75rem column (220px at the default root size); the main spans both grid rows to its right. Existing main padding and 48rem/72rem content limits remain. Below 48rem, the brand and navigation become a full-width top area. Navigation wraps naturally into fewer columns when space or enlarged text requires it, with readable 0.875rem labels at widths up to 24rem. No section is hidden behind an extra menu; native title-bar behavior is unchanged.

A localized skip link appears on keyboard focus with foreground-colored outline and border; its main target has tabindex=-1 for focus without adding a normal Tab stop. Main/aside content can wrap long text. Visual checks passed at actual Windows client sizes 1285x812 and 640x480. Section keyboard navigation is verified in 1.3; the current accessibility/layout audit passed in 1.9.

## Section navigation

Navigation reuses ghost Buttons with rounded 0.75rem corners, 2.875rem minimum height, subtle surface hover and a visible strong-accent focus outline. Current selection combines a soft beige background (the existing border token), stronger text weight and aria-current=page. Forced colors add a double Highlight border and system-color icons. All five existing destinations and their order are preserved, including Writing Editor and the existing Achievements route. Short visible Goals/Activity labels keep their original full accessible names and section headings. Statistics is a disabled, described button without a route/click handler. Disabled entries are skipped by Tab. Selecting an available section still focuses its heading.

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

## Activity calendar (5.4)

A Monday-first semantic month table uses existing surface/background, sage, success and strong-accent tokens for fixed credited-word bands (0, 1-249, 250-499, 500-999, 1000+). Bar lengths and numeric labels supplement color. Current day is underlined; selection uses a double outline and aria-pressed; focus keeps an outer outline. Native date buttons retain 2.75rem target height with a roving Tab stop. Filters/metrics wrap and an explicitly labelled local scroll region preserves table geometry at compact/200% layouts without page overflow. Forced colors use system colors and retain bar lengths/selection. English copy is centralized. See [ACTIVITY_CALENDAR.md](ACTIVITY_CALENDAR.md).

## Lucide sidebar icons (LIB.9)

Pinned lucide-react 1.63.0 supplies Feather for the wordmark and BookOpen, PenLine, Target, CalendarDays, Trophy and ChartNoAxesColumn for navigation. Only named components are imported; there is no dynamic icon registry. Icons are decorative beside visible text, aria-hidden and nonfocusable, with currentColor and 1.5/1.7 stroke widths. Sidebar icons scale with rem dimensions. Existing book/editor icons are outside this task. Compatibility was checked against npm peer metadata (React 19 supported) before installation. See [official React installation and named-import guidance](https://lucide.dev/guide/react/getting-started). No palette/font token changes or image assets were introduced.

## My Library page header (LIB.10)

The library-only page header uses the existing Georgia/Times/serif writing stack and charcoal foreground token, with a fluid display size derived from text-display (about 35px at 320px, 43px at 1100px and 46px at 1440px with the default root size). A small 1.5rem decorative Lucide Leaf follows the title in the existing accent brown. The exact title/subtitle remain centralized in en.sections.library. The subtitle uses the existing writing size/line-height and strong-accent brown for readable normal-text contrast.

Left alignment and fluid block padding distinguish the page introduction from navigation and book cards. The title and leaf may wrap under constrained widths or enlarged text instead of clipping; the subtitle has a 40rem maximum reading width. Leaf is aria-hidden and nonfocusable, using CanvasText in forced colors. The H1 retains its existing navigation focus ref/tabindex. Other page headers retain their prior typography/spacing. Styling is feature-local in library-header.css; no global token, font/dependency, sidebar, book-card or persistence changes.

LIB.10 verification: all 742 Vitest tests and all 166 Edge scenarios passed, with explicit normal/200% header capture and reflow at 320/640/1100/1440px. Desktop/compact crops were inspected. Lint, format:check, strict TypeScript/build and diff checks passed. See [accessibility review](ACCESSIBILITY_REVIEW.md).

## Header writing statistics (LIB.11)

A single shared Card below the My Library subtitle contains a semantic definition list for Current streak, Words written today and Daily goals completed. Named Flame, Pencil and Target icons are decorative, with soft brown/sage treatments and one centralized decorative writing-orange token (#B9794F). Values use the existing serif stack at 1.5rem in the compact LIB.12 layout; smaller labels/units use readable secondary text, and numeric content stays charcoal. A thin decorative border separates columns. Container queries stack the items with horizontal separators below 24rem and use a compact icon/label layout below 20rem, including enlarged text. Forced colors use system colors.

The library reuses its existing current-streak snapshot through a render slot and portal into the header, avoiding an extra history scan. One validated native daily-statistics read for the current local date supplies credited words and book goals whose existing state is reached. Daily goal completions mean today, globally including retained sources; saves, unconfigured goals, pending goals and rest days do not add completed goals. No target/streak/activity formula changes. Current streak lower bounds keep a visible ? and spoken At least; uncertain zeros are Unavailable with an explanation. Genuine recorded zeros remain zero. Loading/read failures never become invented counts, and daily results can remain available if the independent streak read fails.

Refresh streak, focus/resume, returning to the library and local-date changes refresh the header. Hidden library summaries stop reading, and late prior-date replies cannot replace the new day. Existing detailed current/longest cards and their controls remain available. No new dependency, mock product data, native command, migration or persistence write.

LIB.11 verification: all 750 Vitest and 171 full-run Edge cases passed, with presentation-state tests, one-read sharing, explicit local-day refresh/stale/inactive behavior and compact/200%/axe/forced-color coverage. Successful desktop/compact summary screenshots were inspected. Lint, format:check, strict TypeScript/build and diff checks passed. See [accessibility review](ACCESSIBILITY_REVIEW.md).

## Header row and brighter flame (LIB.12)

My Library's introduction and statistics share a wrapping flex row, aligned at the top. The introduction has an 18rem flex basis and the summary a 27rem basis, so wide windows place the summary beside the title while constrained/enlarged layouts stack naturally. Only the library subtitle is italic. Compact metric padding and 24px/12px default value/label sizes preserve three columns in the narrower side panel; equal minimum label height aligns values when labels wrap. The existing one-column container fallback remains available.

The streak icon now reuses the installed Lucide Flame silhouette as a filled two-tone variant with a small inner flame. Central decorative flame-orange (#ED8032) and flame-gold (#FFC461) tokens make it brighter without recoloring metric text or loading assets/dependencies. Forced colors use CanvasText/Canvas. This is presentation only; data readers, counts, date semantics and refresh behavior are unchanged.

LIB.12 verification: all 750 Vitest and 171 Edge cases passed, including panel/title and numeric alignment, italic subtitle, compact/200% reflow, axe and forced-color checks. Desktop and compact header screenshots were inspected. Lint, format:check, strict TypeScript/build and diff checks passed.
