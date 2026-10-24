# Proposed architecture

Status: frontend bootstrap implemented in task 0.2; the architecture below remains the planned direction. The Tauri 2 wrapper is configured in task 0.3; no persistence layer exists. Current entry files are `src/main.tsx`, `src/App.tsx` and `src/index.css`; feature folders are deferred to task 0.7.

## Technology direction

Tauri 2 desktop host; React + strict TypeScript + Vite frontend; Tailwind for styling; SQLite for structured data; Tiptap for rich text. Add Lucide, Motion and Playwright only when their approved tasks require them. Vitest covers domain logic and relevant integration boundaries. Resolve compatible stable versions during each setup task and commit dependency lockfiles once generated.

## Organization

```text
src/
  app/                 composition, navigation, localized copy
  components/ui/       reusable accessible primitives
  features/            library, editor, goals, activity, achievements
  hooks/               shared React behavior as needed
  services/            typed persistence boundary
  styles/              design tokens and global styling
  types/               genuinely shared types
  utils/               small shared pure functions
src-tauri/             desktop host, database and managed filesystem access
docs/                  product, architecture, decisions and task tracking
```

Create directories as their foundation task requires them; avoid empty abstractions. UI invokes typed services; services cross a narrow Tauri boundary; persistence owns validation, migrations, transactions and managed file access. Components never issue raw SQL or arbitrary filesystem calls. Decide exact Rust command/plugin boundaries before task 2.2; no permission grants yet.

## Reliability proposal (verify in milestone 3)

Debounce chapter saves by 750 ms after edits; serialize writes per chapter, attach revisions, and atomically persist content and corresponding activity. Status transitions: unsaved → saving → saved only after successful commit; errors remain visible with retry and retained text. Flush pending work on chapter navigation. Closing must wait for pending saves or show a recoverable failure decision, never silently discard text. Preserve last committed revision on interruption; assess a durable recovery journal for edits still inside the debounce window during 3.8/3.12. Do not promise zero-loss recovery until tested.

## Cross-platform and localization

Resolve storage paths via Tauri application directories, never hardcode user paths. Keep UI messages centralized; use locale-aware formatting and local calendar-day activity keys. No network services, account system or production backend. The Vite development server is development tooling only.

## Desktop bootstrap (0.3)

`src-tauri` contains the Rust entry point, Tauri build script, configuration, generated scaffold icons and default core capability for the main window. No filesystem, shell, database or custom application commands are exposed. The frontend does not yet need @tauri-apps/api; add it when an approved feature invokes native functionality. Removed unused logging/serialization scaffold dependencies.

Desktop hooks run the existing npm dev/build scripts. Vite uses fixed loopback port 5173 and ignores Rust changes; Tauri owns Rust rebuilds. Production CSP restricts scripts to bundled code; development CSP additionally permits Vite's loopback HTTP/WebSocket endpoint and React refresh preamble. No remote content is loaded.

## Styling bootstrap (0.4)

Tailwind CSS 4.3.3 runs as the official Vite plugin, supporting the installed Vite 8.3.5. The CSS entry imports Tailwind, including Preflight. Static React class names generate build-time CSS; there is no runtime CDN dependency. Bootstrap layout uses utilities; tokens and component design remain deferred to milestone 1. No extra PostCSS configuration or legacy Tailwind configuration file is introduced.

## Quality tooling (0.5)

ESLint 10 flat configuration uses recommended JavaScript/TypeScript rules plus React Hooks and Fast Refresh checks for frontend files. Browser globals apply only to source files; root tooling uses Node globals. Strict TypeScript compilation remains separate from linting. Prettier 3 runs independently, with eslint-config-prettier last to disable conflicting style rules. EditorConfig aligns indentation and line endings. Native/generated artifacts and lockfiles are excluded from formatting; Rust uses cargo fmt. Node LTS 24.22.1 was installed to meet supported tooling requirements.

## Frontend testing (0.6)

Vitest 5.0.5 uses shared Vite configuration with jsdom 30.1.3 and React Testing Library. Only colocated src/**/*.test.{ts,tsx} files are collected; no test globals are injected. Setup imports jest-dom Vitest matchers and registers explicit afterEach cleanup. TypeScript includes both tests and setup. The initial test exercises accessible main/heading semantics and product identity. Node engine requirements now reflect the stricter jsdom range; installed Node 24.22.1 already satisfies it. DOM tests do not establish layout correctness or desktop integration.
