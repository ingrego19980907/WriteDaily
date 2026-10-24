# Design system

Status: colors/typography implemented in 1.1 and application shell in 1.2; navigation implemented in 1.3 and Button in 1.4, Input in 1.5 and Modal in 1.6; Card and ProgressBar remain future tasks. `src/styles/tokens.css` defines centralized Tailwind theme variables; `src/styles/global.css` imports them and applies base styling.

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

Root font size remains 1rem so system/browser scaling is respected. Base styles live in Tailwind's base layer so utilities can override them. Section headings/subtitles use the serif stack; navigation and descriptive copy use the UI stack. No editor or adjustable-font-size control exists yet; implement that in task 3.11.

## Later component guidance

Proposed spacing scale: 4, 8, 12, 16, 24, 32, 48 px. Use generous space, comfortable reading width, restrained rounded corners, soft shadows and subtle motion respecting reduced-motion preferences.

Reusable Button, Input, Modal, Card and ProgressBar need visible focus states, semantic markup, labels, keyboard access and appropriate disabled/error states. Modals require focus management and restoration. Use modern minimalist book cards with attractive covers, never a wooden bookshelf. No glassmorphism, neon colors, dense dashboards or excessive gradients.

## Application shell

The shell uses a surface-colored masthead with a decorative border and a warm background main area. Content is limited to 48rem with fluid 1.5-3rem padding. Supplied navigation uses a surface sidebar, stacked above main below 48rem and 14rem wide alongside it on larger windows. Task 1.3 supplies five navigation buttons: a two-column grid in compact mode and one column in the sidebar. Native title bar is unchanged.

A localized skip link appears on keyboard focus with foreground-colored outline and border; its main target has tabindex=-1 for focus without adding a normal Tab stop. Main/aside content can wrap long text. Visual checks passed at actual Windows client sizes 1285x812 and 640x480. Section keyboard navigation is verified in 1.3; the full accessibility review remains task 1.9.

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

All variants have minimum 2.75rem height, wrapping labels, 2px foreground focus-visible outline with 3px offset, native pointer/Enter/Space activation and disabled styling (opacity 0.5, unavailable cursor, no hover change). Native disabled removes the control from tab order and blocks activation; aria-disabled alone is not a substitute. No loading behavior, link rendering or destructive-action semantics are introduced. Navigation uses the ghost variant with existing layout/current-page utilities. Full visual state review remains task 1.9.

## Input

`src/components/ui/Input.tsx` is a labelled single-line field. Required label is a visible string; optional hint and error are strings supplied by the consumer's localized copy. It accepts native input props/ref plus text, email, password, search, tel, url, number and date/time types; it is not a checkbox, file picker, select or textarea.

A generated useId connects label and input unless the caller supplies a unique explicit ID. Hint/error IDs derive from the field ID; aria-describedby merges those with caller-provided IDs. Error sets aria-invalid=true even if the caller supplied false; when error clears, the supplied aria-invalid value is restored or omitted. Error text is visible and described, so invalid state does not rely on color. No automatic validation timing or live announcement policy is introduced; forms own those decisions.

Input defaults to type=text, supports controlled or uncontrolled usage, and forwards required, disabled, readOnly, name, min/max, autocomplete and other native attributes. Disabled skips Tab and blocks editing; read-only stays focusable. className applies to the input itself; field layout is a full-width grid with wrapping labels/messages.

The surface field has a secondary-colored border, foreground text, 2.75rem minimum height, 2px foreground focus-visible outline/3px offset and an accessible secondary placeholder. Placeholder never replaces the visible label. Error #9B443A has 6.34:1 contrast on surface and 5.79:1 on background. Read-only uses background fill; disabled uses opacity 0.5. Native date/time chrome may vary by platform. No form screen currently imports Input; real visual integration and full accessibility review remain later tasks.

## Modal

`src/components/ui/Modal.tsx` composes Radix Dialog with WriteDaily styling and shared Button. Required props: open, onOpenChange, trigger (one semantic button element), title, closeLabel and children. Optional description is rendered visibly and connected to the dialog; if omitted, its description reference is also omitted. Title, close label and content come from the caller's localized messages. Use Button or another trigger that forwards native props/ref.

Radix portals the modal into document.body, blocks outside interaction, traps focus, handles Escape/backdrop/Close requests and restores focus to its trigger. The controlled onOpenChange callback lets a caller refuse a close request while an unsaved form needs confirmation. Default focus follows Radix's first-focusable policy (the header Close action in the tested content); forms can manage their own initial field focus. No automatic saving, discard confirmation or destructive alert-dialog behavior is included.

Content uses a surface background, secondary border, 1rem radius and a soft --shadow-modal. The --color-overlay token mixes foreground at 40% opacity; the shadow mixes foreground at 20%. Width is min(32rem, 100vw - 2rem), maximum height 100dvh - 2rem. The body scrolls independently while header/Close stay visible. No animation or runtime font request is introduced. Compact and wide visual previews were inspected in actual Tauri; temporary preview sources were removed. Full application accessibility review remains 1.9.
