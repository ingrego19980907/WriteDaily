# Decision log

## 2026-10-24 — Product identity and scope

Use WriteDaily and “A little writing, every day.” The updated master brief supersedes the earlier Cozy Writer brief. Keep the existing `write_daily` workspace path; do not rename the repository to match the suggested folder name without need.

## 2026-10-24 — Incremental execution

Complete one approved subtask at a time and stop for approval. Initial work covers environment inspection and requested planning documentation. Do not scaffold while desktop prerequisites need remediation; do not mark the full foundation complete.

## 2026-10-24 — Stack direction

Follow the requested Tauri 2/React/TypeScript/Vite/Tailwind/SQLite stack. No cloud backend. Versions and exact persistence implementation are deferred to the relevant setup tasks. The architecture and data model documents are proposals, not implemented guarantees.

## 2026-10-24 — Environment evidence

Node 22.12.0, npm 10.9.0, Git 2.33.0.windows.2. PowerShell blocks npm.ps1; npm.cmd works without changing system policy. Rust and Cargo 1.61.0 exist at `C:\Users\suhod\.cargo\bin` but are absent from PATH; rustup reports stable-x86_64-pc-windows-msvc. VS Build Tools 2017 15.9.40 with C++ tools and Windows SDK 10.0.17763.0 are installed. WebView2 155.0.4283.62 is registered. Modern Rust/build tool compatibility is not verified.

Official references checked: [Tauri Windows prerequisites](https://v2.tauri.app/start/prerequisites/) and [Vite Node requirements](https://vite.dev/guide/). Node 22.12.0 meets the documented Vite minimum. Recheck package engine requirements when installing; the old Rust toolchain needs updating before selecting/building current Tauri dependencies.

## 2026-10-24 ? Frontend bootstrap (0.2)

User approved React/TypeScript/Vite initialization. Verified create-vite 9.3.1 and Vite 8.3.5 engine ranges against Node 22.12.0 using npm metadata and the official Vite guide. Used the official react-ts template, preserving existing documents. Explicitly enabled strict checking in both TypeScript projects. Omitted the template's Oxlint dependency/configuration because ESLint is approved for task 0.5. Kept English bootstrap copy together in App.tsx; feature organization and design components remain later tasks. No desktop toolchain changes performed.

## 2026-10-24 ? Tauri desktop wrapper (0.3)

Used local CLI 2.12.4 and its official init scaffold (tauri 2.12.5, tauri-build 2.7.4, Rust manifest minimum 1.90). Updated the installed stable MSVC Rust/Cargo from 1.61.0 to 1.99.1 with approved rustup access. PATH is set per command/session rather than modifying account-wide settings. Tauri info recognizes existing VS 2017 C++ tools and WebView2; actual build results determine sufficiency. Application version matches frontend 0.0.0; provisional identifier app.writedaily.desktop. Default scaffold icons remain explicitly temporary. No backend, persistence plugin or JavaScript Tauri API dependency is added without use.

Verification outcome: debug desktop build without bundling succeeded using existing VS 2017 tools/SDK and updated Rust 1.99.1. Do not infer installer compatibility or GUI launch from successful compilation; those gates remain unverified. No Build Tools upgrade was needed for this subtask.

## 2026-10-24 ? Tailwind integration (0.4)

Followed the official Tailwind CSS 4 Vite installation path with tailwindcss/@tailwindcss/vite 4.3.3; npm peer metadata explicitly supports Vite 8. Kept both as build dependencies. Included Preflight and explicitly styled the bootstrap heading, moving existing main spacing/width into utilities. No legacy init command, PostCSS configuration or design system expansion. Verified strict TypeScript, production build and emitted utility selectors; visual/desktop checks are not implied.

## 2026-10-24 ? ESLint and formatting (0.5)

Use supported ESLint 10.13.0, @eslint/js 10.0.1 and typescript-eslint 8.72.0 with recommended Hooks/Refresh configurations. Official ESLint requirements and npm dependency metadata showed Node 22.12 was insufficient; ESLint 9 was also deprecated. Approved winget installation upgraded machine-wide Node to official LTS 24.22.1, with npm 11.19.1. Removed the temporary ESLint 9 installation by upgrading to 10; did not suppress engine warnings or override transitive dependencies. Package Node engine range follows ESLint: ^20.19.0, ^22.13.0 or >=24.

Use standalone, exactly pinned Prettier 3.9.10 and eslint-config-prettier rather than running formatting as a lint rule. No Tailwind sorting plugin, git hooks or automatic commits added. Existing supported files were formatted as part of this task; product behavior is unchanged. In-memory negative checks verified Hooks/any lint rules and formatting drift detection. Official references: https://eslint.org/docs/latest/use/getting-started , https://typescript-eslint.io/getting-started/ , https://prettier.io/docs/install/ .

## 2026-10-24 ? Vitest bootstrap (0.6)

Use Vitest 5.0.5 (Vite 8 compatible), jsdom 30.1.3, React Testing Library 16.3.3, its DOM peer 10.4.2 and jest-dom 7.0.1. Verified official setup guidance and npm engines/peers before installation. Installed Node 24.22.1 meets all requirements; project engines updated to ^22.22.2, ^24.15.0 or >=26.0.0 to reflect jsdom. No system update needed.

Keep a single Vite config via defineConfig from vitest/config. Use explicit Vitest imports and explicit cleanup rather than global test functions. Add one meaningful render smoke test with accessible queries; no snapshots, mock persistence, coverage package or browser runner at this stage. References: https://vitest.dev/config/setupfiles and https://testing-library.com/docs/react-testing-library/setup/ .
