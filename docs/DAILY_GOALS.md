# Daily goals (4.2)

Implemented 2026-10-27. A daily word goal is optional saved book metadata. It is configured in Create book or the card's dots > Edit book form and displayed on the library card and editor book header through DailyGoal.

## Contract and behavior

Reuse the existing Book.dailyWordGoal / SQLite daily_word_goal field, metadata validators and revision-checked book update. The supported range is 1 through Number.MAX_SAFE_INTEGER (9,007,199,254,740,991). The form accepts whole decimal digits; blank becomes NULL and removes the goal. Zero, negative, fractional, nonnumeric and unsafe values fail validation. New help text explains whole words per day and blank removal. UI copy stays centralized in en.ts.

Only committed metadata updates the card/editor summary. Pending or failed saves retain the previous goal; retry uses the retained form draft. Closing an unsaved form preserves its draft without changing the saved goal. Existing stale-write conflict handling requires an explicit reload. Clearing the daily goal preserves the title, book target and deadline. No goal is displayed as No daily goal; invalid supplied display values remain unavailable rather than becoming zero.

DailyGoal presents the configured target, not today's completed words or percentage. Activity records, local-day crediting, historical daily results and preferred writing days remain Milestone 5 work. No daily progress, streak, achieved-goal state or timer is fabricated from the all-time book total. No schema migration, new persistence service or production native behavior is needed.

## Verification

- All 421 Vitest tests passed. A new Library workflow verifies unchanged display during a pending write, failed-write draft retention, committed replacement and NULL removal.
- All 108 Edge scenarios passed. Three new daily-goal scenarios cover 320/640/1100px, invalid inputs, cancellation and retained drafts, committed card/editor display, clearing, preservation of other metadata, modal axe checks and 200% text reflow. Browser persistence is test-only IPC; it is not native persistence evidence.
- All 67 Rust tests passed with disposable databases. The new repository test verifies minimum and maximum goals, rejected zero/negative/unsafe values, conflict preservation, reopening, removal and another reopen while retaining other fields. Existing shared fixtures cover native/frontend validation agreement.
- Lint, format:check, strict TypeScript, production build, Cargo fmt/check, Clippy and diff checks passed. Production native source and released migrations are unchanged; no new actual desktop startup/restart is claimed.
