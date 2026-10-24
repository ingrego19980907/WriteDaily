# Design system

Status: colors/typography implemented in 1.1 and application shell in 1.2; navigation implemented in 1.3; reusable controls remain future tasks. `src/styles/tokens.css` defines centralized Tailwind theme variables; `src/styles/global.css` imports them and applies base styling.

| Token          | Value   |
| -------------- | ------- |
| Background     | #F7F3EC |
| Surface        | #FFFEFA |
| Primary text   | #38352F |
| Accent brown   | #8B7355 |
| Sage green     | #A8B5A2 |
| Muted text     | #89847B |
| Border         | #E8E2D9 |
| Secondary text | #706B62 |

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
