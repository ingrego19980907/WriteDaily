# WriteDaily contributor instructions

- Read docs/TASKS.md before working; it is the progress source of truth.
- Work on one approved subtask at a time. Verify it, update documentation, report files and checks, then stop for approval.
- Follow the approved Tauri 2, React, strict TypeScript, Vite, Tailwind, and SQLite direction. Ask before major architectural changes.
- Keep features, domain logic, and persistence separate. Prefer simple, established solutions.
- Never silently discard writing, delete real user data, or report a save before persistence succeeds.
- Do not add mock persistence to completed features, cloud services, or features outside the roadmap.
- Preserve existing files. Never automatically commit or push.
- Consult official compatibility documentation before installing dependencies. Do not claim desktop startup without observing it.
- Keep English UI copy centralized for future Ukrainian localization. Use local calendar dates for activity.

- After frontend changes, run `npm.cmd run lint`, `npm.cmd run format:check`, `npm.cmd run typecheck`, relevant tests via `npm.cmd run test:run`, and the build when relevant. Use Prettier for supported files and `cargo fmt` for Rust; exclude generated files.
