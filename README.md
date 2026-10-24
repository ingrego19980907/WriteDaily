# WriteDaily

A little writing, every day.

WriteDaily is a planned free, offline-first Windows writing application, with future macOS support. It will combine a personal book library, chapter editor, goals, activity calendar, and achievements.

## Current status

Foundation tasks 0.1-0.9 are complete: environment inspection, React/strict TypeScript/Vite, Tauri 2, Tailwind, ESLint/Prettier, Vitest, application structure, synchronized documentation and verified Windows desktop startup. The UI currently shows a responsive application shell with the WriteDaily brand and five navigable sections. Each section displays a Coming soon message. Feature folders are reserved; no library, editor, database, autosave, export or backup is implemented.

Frontend checks, the React DOM smoke test and native development build passed. The Windows Tauri window was opened and its React heading, tagline and status visually verified in task 0.9. Milestone 0 is complete; tasks 1.1-1.6 colors/typography, shell, navigation, Button, Input and Modal are complete; task 1.7 (Card) awaits approval. See [task status and verification evidence](docs/TASKS.md).

## Prerequisites

- Node.js compatible with all tooling: ^22.22.2, ^24.15.0, or >=26.0.0. Installed LTS version: 24.22.1.
- npm; installed version: 11.19.1. Use `npm.cmd` in this PowerShell environment because its execution policy blocks npm.ps1.
- Rust MSVC toolchain and Cargo on PATH. The manifest minimum is Rust 1.90; the verified installed toolchain is 1.99.1. Use the recorded working toolchain or recheck compatibility before updating.
- Supported Microsoft C++ Build Tools with Desktop development with C++ and a Windows SDK.
- Microsoft Edge WebView2 Runtime (detected).

See the official [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) and [Vite guide](https://vite.dev/guide/). Recheck release requirements before installation.

## Setup and frontend commands

```powershell
npm.cmd ci
npm.cmd run dev
```

Open the local URL printed by Vite. Stop the server with Ctrl+C.

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd run preview
```

`typecheck` checks the strict application and tooling TypeScript projects. `build` checks TypeScript and emits production frontend assets to `dist/`. `preview` serves that build locally; it is not a production backend. npm is the project package manager (`packageManager: npm@11.19.1`). Installation is locked by `package-lock.json`; use `npm.cmd ci` for subsequent installations. Do not generate a second package-manager lockfile. Initial dependency installation and the first native compilation require network access; the planned application itself is offline-first.

## Initialization record

The official create-vite 9.3.1 React/TypeScript template was generated in a temporary workspace directory. Selected files were merged without replacing documentation; the temporary scaffold was removed. Template demo assets and its Oxlint setup were omitted: the approved linting choice is ESLint in task 0.5. Both TypeScript projects explicitly enable `strict`.

## Verification status

Tauri 2 compilation and Windows development-window startup are verified using the existing Windows C++ tools, Rust 1.99.1 and Node 24.22.1. React content was visually inspected in the native window, and frontend checks passed. Installer and packaged release verification remain pending; details are tracked in docs/TASKS.md. This foundation verification does not establish native persistence or macOS support.

## Desktop development

Rust/Cargo 1.99.1 MSVC are installed on this machine. Cargo is not in the inherited terminal PATH; add it for the current PowerShell session (adjust for a different account):

```powershell
$env:Path = "$env:USERPROFILE\.cargo\bin;" + $env:Path
npm.cmd run tauri -- info
npm.cmd run tauri -- dev
```

Vite is fixed to 127.0.0.1:5173 with strict port selection so Tauri always loads the intended frontend. Close the application and stop the development process when finished.

```powershell
npm.cmd run tauri -- build --debug --no-bundle
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
```

The build checks the frontend and compiles `src-tauri/target/debug/write-daily.exe` on Windows without creating an installer. Release compilation/packaging uses `npm.cmd run tauri -- build`; that command and the generated installers have not yet been verified. Both npm and Cargo lockfiles should be retained. Windows installer verification is deferred to release tasks. The bundled icons are temporary Tauri scaffold assets, to be replaced in task 8.5. The application identifier is `app.writedaily.desktop`; review it before first distribution because it affects platform identity and storage paths.

## Styling

Tailwind CSS 4.3.3 is integrated using @tailwindcss/vite, following the [official Vite setup](https://tailwindcss.com/docs/installation/using-vite). `src/styles/global.css` imports Tailwind; use static utility class names in React components. No separate Tailwind or PostCSS configuration is needed for this setup. The shell and navigation use semantic utility classes. Palette and typography tokens are centralized in `src/styles/tokens.css`; the existing page uses the warm background, readable text colors and local UI/serif fonts. The responsive AppShell is implemented; Button, Input and Modal are implemented; the remaining reusable controls are later milestone 1 work. See [design system](docs/DESIGN_SYSTEM.md) for token usage and contrast limits.

## Linting and formatting

```powershell
npm.cmd run lint
npm.cmd run lint:fix
npm.cmd run format:check
npm.cmd run format
```

`lint` checks JavaScript/TypeScript plus recommended React Hooks and Fast Refresh rules, failing on warnings. `lint:fix` applies available safe lint fixes. Prettier checks/formats supported source, configuration and documentation files. Generated output, native icons and lockfiles are excluded. Prettier uses two-space indentation, single quotes for JavaScript, no semicolons, trailing commas and LF line endings; `.editorconfig` shares whitespace defaults with editors. Rust remains formatted by `cargo fmt`.

ESLint uses flat configuration in `eslint.config.js`. `eslint-config-prettier` disables conflicting stylistic lint rules; Prettier runs separately. TypeScript's strict compiler checks remain a separate command. Optional editor extensions: ESLint (`dbaeumer.vscode-eslint`) and Prettier (`esbenp.prettier-vscode`); command-line checks work without them.

## Tests

```powershell
npm.cmd run test:run  # Run once (also suitable for CI)
npm.cmd test          # Watch mode in an interactive terminal; press q to exit
```

Vitest 5 uses the shared Vite configuration and jsdom for DOM tests. React Testing Library checks rendered UI through accessible queries; jest-dom adds DOM assertions. Tests are colocated as `src/**/*.test.ts` or `src/**/*.test.tsx`. Import `test`, `expect` and hooks explicitly from `vitest`; test globals are disabled. `src/test/setup.ts` registers matchers and cleans up mounted React trees after each test. Strict TypeScript checks include tests and setup code.

The current twenty-six tests cover Modal focus/dismissal, Button/Input interactions, native semantics and field accessibility plus shell landmarks/skip target, initial My Library section, all five keyboard navigation destinations, active-item uniqueness, heading focus and pointer return to the library. This simulated DOM test does not verify browser layout, Tauri startup or native persistence. Coverage, browser automation and native testing will be added only when their tasks require them.

## Application structure

- `src/main.tsx`: React mounting and global stylesheet import.
- `src/app/`: App composition, colocated smoke test and centralized English copy in `i18n/en.ts`.
- `src/styles/`: Tailwind entry and global CSS.
- `src/features/`: reserved library, editor, goals, activity and achievements modules.
- `src/components/ui/`: shared Button, Input and Modal components; `src/hooks/`, `services/`, `types/`, `utils/`: reserved shared code boundaries.
- `src/test/`: shared test setup.
- `src-tauri/`: Rust desktop host and Tauri configuration.

Reserved folders use `.gitkeep` markers; product feature implementations come later. See [architecture](docs/ARCHITECTURE.md) for responsibilities and dependency boundaries. The current interface and test behavior are unchanged by the reorganization.

## Documentation

| Document                               | Purpose                                                          |
| -------------------------------------- | ---------------------------------------------------------------- |
| [PRODUCT](docs/PRODUCT.md)             | Product vision, version 1 scope and exclusions                   |
| [ARCHITECTURE](docs/ARCHITECTURE.md)   | Current structure, module boundaries and proposed persistence    |
| [DESIGN_SYSTEM](docs/DESIGN_SYSTEM.md) | Implemented tokens/typography and planned component rules        |
| [DATA_MODEL](docs/DATA_MODEL.md)       | Proposed entities, activity policy and backup design             |
| [ROADMAP](docs/ROADMAP.md)             | Milestone goals and completion gates                             |
| [TASKS](docs/TASKS.md)                 | Progress source of truth, dependencies and verification evidence |
| [DECISIONS](docs/DECISIONS.md)         | Dated decisions and historical environment changes               |
| [AGENTS](AGENTS.md)                    | Concise instructions for future agent sessions                   |

Data model, autosave, streak and backup policies remain proposals until their implementation tasks verify them. Historical decisions describe the environment at the time of each task; current prerequisites are listed above. Fresh-machine setup and Windows installer validation remain release tasks.

## Application shell

`src/app/AppShell.tsx` provides the masthead, keyboard skip link and main content area. App supplies five section buttons through its optional navigation slot. Main content adapts to the supported minimum desktop size (640x480); the layout was visually checked in Tauri at minimum and wider sizes. Reusable Card is the next task. Run `npm.cmd run tauri -- dev` with Cargo on PATH to inspect the current shell.

## Section navigation

My Library opens by default. Use Tab/Shift+Tab to reach section buttons, then Enter or Space to select one. After changing sections, focus moves to the new main heading. The active item is emphasized visually and marked aria-current=page. Navigation appears as a sidebar on wide windows and a two-column group above content on compact windows. The keyboard skip link bypasses navigation.

Section selection is local React state; restarting/reloading returns to My Library. No URL routing, history or persistent navigation setting is introduced. Each destination is an explicitly unfinished presentation view; real book/editor/goals/activity/achievement workflows belong to later milestones.

## Shared Button

Import Button from `src/components/ui/Button.tsx`. Choose primary, secondary or ghost using variant, and pass native props such as onClick, disabled, aria-label and ref. Default type is button; explicitly pass type=submit for form submission. Text labels and keyboard focus are supported; no loading or link behavior is built in. Navigation already uses ghost. See [design system](docs/DESIGN_SYSTEM.md) for colors, contrast and state rules.

## Shared Input

Import Input from `src/components/ui/Input.tsx` and provide a visible label. Optional hint/error strings are linked to the field, with generated IDs unless you supply a unique id. Native props/ref, controlled or uncontrolled values, required, disabled and readOnly are supported. Supply localized messages from the consuming feature; the component does not validate or save values. It is not yet used on a product page.

```tsx
<Input label="Book title" hint="Use a working title." required />
```

Focused verification: `npm.cmd run test:run -- src/components/ui/Input.test.tsx`. Full visual integration comes with real forms; see [design system](docs/DESIGN_SYSTEM.md) for the supported types and error/focus rules.

## Shared Modal

Import Modal from `src/components/ui/Modal.tsx` and supply controlled state, one semantic trigger (such as Button), title, closeLabel and children. Description is optional. Text comes from the caller's localized copy.

```tsx
<Modal
  open={open}
  onOpenChange={setOpen}
  trigger={<Button>Open details</Button>}
  title="Details"
  description="Review the details below."
  closeLabel="Close"
>
  <p>Dialog content</p>
</Modal>
```

Radix Dialog handles trapped focus, background interaction, Escape/backdrop/Close dismissal and focus restoration. The caller can refuse a closing state change when unsaved content needs a decision. Modal does not save data or confirm discarding edits. Long content scrolls under a visible header/Close action. No product screen opens a modal yet. Focused tests: `npm.cmd run test:run -- src/components/ui/Modal.test.tsx`.
