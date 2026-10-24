# Design system

Status: specification; tokens/components not yet implemented.

| Token        | Value   |
| ------------ | ------- |
| Background   | #F7F3EC |
| Surface      | #FFFEFA |
| Primary text | #38352F |
| Accent brown | #8B7355 |
| Sage green   | #A8B5A2 |
| Muted text   | #89847B |
| Border       | #E8E2D9 |

Define centralized CSS variables and Tailwind aliases during design setup. Do not scatter raw colors. Check text/control contrast; muted and sage colors are not automatically suitable for small text on light surfaces. Add accessible semantic variants if measured contrast requires them.

Use a local system sans-serif stack for UI and Georgia/serif for manuscript text, avoiding a runtime font download requirement. Editor size is adjustable. Proposed spacing scale: 4, 8, 12, 16, 24, 32, 48 px. Use generous space, comfortable reading width, restrained rounded corners, soft shadows and subtle motion respecting reduced-motion preferences.

Reusable Button, Input, Modal, Card and ProgressBar need visible focus states, semantic markup, labels, keyboard access and appropriate disabled/error states. Modals require focus management and restoration. Use modern minimalist book cards with attractive covers, never a wooden bookshelf. No glassmorphism, neon colors, dense dashboards or excessive gradients.
