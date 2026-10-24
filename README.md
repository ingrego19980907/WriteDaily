# WriteDaily

A little writing, every day.

WriteDaily is a planned free, offline-first Windows writing application, with future macOS support. It will combine a personal book library, chapter editor, goals, activity calendar, and achievements.

## Current status

Task 0.2 initializes React, strict TypeScript and Vite with a minimal English WriteDaily page. Task 0.3 adds the Tauri 2 desktop wrapper. Task 0.4 connects Tailwind CSS through its Vite plugin. ESLint and Prettier are configured in task 0.5. Vitest and a React render smoke test are configured in task 0.6. No library, editor or persistence is implemented yet. See [tasks](docs/TASKS.md).

## Prerequisites

- Node.js compatible with all tooling: ^22.22.2, ^24.15.0, or >=26.0.0. Installed LTS version: 24.22.1.
- npm; installed version: 11.19.1. Use `npm.cmd` in this PowerShell environment because its execution policy blocks npm.ps1.
- Current stable Rust MSVC toolchain and Cargo, available on PATH.
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

`typecheck` checks the strict application and tooling TypeScript projects. `build` checks TypeScript and emits production frontend assets to `dist/`. `preview` serves that build locally; it is not a production backend. Installation is locked by `package-lock.json`; use `npm.cmd ci` for subsequent installations.

## Initialization record

The official create-vite 9.3.1 React/TypeScript template was generated in a temporary workspace directory. Selected files were merged without replacing documentation; the temporary scaffold was removed. Template demo assets and its Oxlint setup were omitted: the approved linting choice is ESLint in task 0.5. Both TypeScript projects explicitly enable `strict`.

## Later foundation tasks

Tauri 2 debug executable compilation is verified using the existing Windows C++ tools and updated Rust. GUI launch and installer verification remain pending; details are tracked in docs/TASKS.md. Vitest is configured; project structure is the next task (0.7). Browser development does not verify desktop startup or persistence.

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

The build checks the frontend and compiles a debug desktop executable without creating an installer. Both npm and Cargo lockfiles should be retained. Windows installer verification is deferred to release tasks. The bundled icons are temporary Tauri scaffold assets, to be replaced in task 8.5. The application identifier is `app.writedaily.desktop`; review it before first distribution because it affects platform identity and storage paths.

## Styling

Tailwind CSS 4.3.3 is integrated using @tailwindcss/vite, following the [official Vite setup](https://tailwindcss.com/docs/installation/using-vite). `src/index.css` imports Tailwind; use static utility class names in React components. No separate Tailwind or PostCSS configuration is needed for this setup. The bootstrap page uses utility classes as an integration check. Product colors, typography tokens and reusable components remain milestone 1 work.

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
