# WriteDaily

A little writing, every day.

WriteDaily is a planned free, offline-first Windows writing application, with future macOS support. It will combine a personal book library, chapter editor, goals, activity calendar, and achievements.

## Current status

Foundation tasks 0.1-0.8 are complete: environment inspection, React/strict TypeScript/Vite, Tauri 2, Tailwind, ESLint/Prettier, Vitest, application structure and synchronized documentation. The UI currently shows only the WriteDaily name, tagline and bootstrap status. Feature folders are reserved; no library, editor, database, autosave, export or backup is implemented.

Frontend build and the React DOM smoke test have passed. A native debug build passed in task 0.3. Desktop window launch and visual React verification are still pending in task 0.9, so Milestone 0 is not yet complete. See [task status and verification evidence](docs/TASKS.md).

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

## Remaining foundation verification

Tauri 2 debug executable compilation is verified using the existing Windows C++ tools and updated Rust. GUI launch and installer verification remain pending; details are tracked in docs/TASKS.md. Task 0.9 must observe the desktop window and React rendering, then rerun the required frontend checks. Browser development does not verify desktop startup or persistence.

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

Tailwind CSS 4.3.3 is integrated using @tailwindcss/vite, following the [official Vite setup](https://tailwindcss.com/docs/installation/using-vite). `src/styles/global.css` imports Tailwind; use static utility class names in React components. No separate Tailwind or PostCSS configuration is needed for this setup. The bootstrap page uses utility classes as an integration check. Product colors, typography tokens and reusable components remain milestone 1 work.

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

The first test verifies the WriteDaily heading and tagline inside the main landmark. This simulated DOM test does not verify browser layout, Tauri startup or native persistence. Coverage, browser automation and native testing will be added only when their tasks require them.

## Application structure

- `src/main.tsx`: React mounting and global stylesheet import.
- `src/app/`: App composition, colocated smoke test and centralized English copy in `i18n/en.ts`.
- `src/styles/`: Tailwind entry and global CSS.
- `src/features/`: reserved library, editor, goals, activity and achievements modules.
- `src/components/ui/`, `hooks/`, `services/`, `types/`, `utils/`: reserved shared code boundaries.
- `src/test/`: shared test setup.
- `src-tauri/`: Rust desktop host and Tauri configuration.

Reserved folders use `.gitkeep` markers; product feature implementations come later. See [architecture](docs/ARCHITECTURE.md) for responsibilities and dependency boundaries. The current interface and test behavior are unchanged by the reorganization.

## Documentation

| Document                               | Purpose                                                          |
| -------------------------------------- | ---------------------------------------------------------------- |
| [PRODUCT](docs/PRODUCT.md)             | Product vision, version 1 scope and exclusions                   |
| [ARCHITECTURE](docs/ARCHITECTURE.md)   | Current structure, module boundaries and proposed persistence    |
| [DESIGN_SYSTEM](docs/DESIGN_SYSTEM.md) | Planned tokens, typography and component rules                   |
| [DATA_MODEL](docs/DATA_MODEL.md)       | Proposed entities, activity policy and backup design             |
| [ROADMAP](docs/ROADMAP.md)             | Milestone goals and completion gates                             |
| [TASKS](docs/TASKS.md)                 | Progress source of truth, dependencies and verification evidence |
| [DECISIONS](docs/DECISIONS.md)         | Dated decisions and historical environment changes               |
| [AGENTS](AGENTS.md)                    | Concise instructions for future agent sessions                   |

Data model, autosave, streak and backup policies remain proposals until their implementation tasks verify them. Historical decisions describe the environment at the time of each task; current prerequisites are listed above. Fresh-machine setup and Windows installer validation remain release tasks.
