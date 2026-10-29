# Date and timezone review (5.8)

Completed on 2026-10-29. Milestone 5 acceptance is verified for the current activity, schedule and streak implementation. No production logic, UI, dependency, API or schema changes were required.

## Rules verified

- Capture one Date instance per editor update; derive its local calendar date, IANA name when available, east-positive UTC offset and UTC edit instant together. Do not attribute writing to the later save date.
- Split segments when date, zone, offset, goal or schedule context changes. A repeated hour is not an additional calendar day. Preserve edit order even when wall-clock timestamps move backward.
- Aggregate stored local date labels without rebucketing them after travel. Visiting a date again can add words to that date, but cannot add another completed streak day. Save counts are distinct operations per local date.
- Retain the exact frozen payload and operation ID after an uncertain commit. A retry in another timezone cannot change its attribution or credit it again; further edits use a new operation.
- Calculate deadlines, pace, preferred weekdays and streaks using civil dates rather than elapsed 24-hour intervals. Tomorrow remains the next calendar date on DST, leap-day and year boundaries.
- Keep sealed historical plans and receipts unchanged on clock/date changes. Current/longest streak projections exclude labels after the requested today, without deleting those records.
- Native settings saves reject a client today that disagrees with the OS local date. Backdated schedule changes cannot overwrite newer effective history. Rejection leaves history and revisions unchanged.

## Shared matrix

[date-time-cases.json](../tests/fixtures/date-time-cases.json) supplies independent expected local labels, offsets, clock fields, segment counts and per-day credits to browser and disposable SQLite checks. Historical 2024 transitions make this a reproducible engine/contract test, rather than an assertion about future timezone legislation.

| Case                    | Boundary checked                                  | Expected result                                                          |
| ----------------------- | ------------------------------------------------- | ------------------------------------------------------------------------ |
| Europe/Kyiv spring      | 02:59:59 to 04:00, +120 to +180                   | Two segments, one date; 23-hour day                                      |
| Europe/Kyiv autumn      | 03:59:59 to 03:00, +180 to +120                   | Two segments, one date; 25-hour day                                      |
| America/New_York spring | 01:59:59 to 03:00, -300 to -240                   | Two segments, one date; 23-hour day                                      |
| America/New_York autumn | 01:59:59 to 01:00, -240 to -300                   | Two segments, one date; 25-hour day                                      |
| Australia/Lord_Howe     | 01:59:59 to 01:30, +660 to +630                   | Two segments, one date; 24.5-hour day                                    |
| Asia/Kathmandu          | +345 midnight, February 28/29 to March 1          | Three adjacent civil dates, correct leap day                             |
| Pacific/Chatham         | +825 midnight, December 31 to January 1           | Two adjacent dates across the year                                       |
| Date-line travel        | Kiritimati +840, Pago Pago -660, UTC, then return | Edit labels may go backward/recur; five edits yield four completed dates |
| UTC clock rollback      | 12:01 to 12:00 within one date                    | One net segment, preserved first/last instants and word sequence         |

Browser checks also compare weekend scheduling with the browser's local weekday, verify human-readable dates without zone drift, and confirm a two-calendar-day pace remains two days across short/long DST dates.

## Test layers and files

- [useLocalCalendarDate.test.ts](../src/hooks/useLocalCalendarDate.test.ts): backward date polling/focus, a hidden-page year-boundary jump, immediate visible-resume refresh and timer cleanup, in addition to existing midnight/resume coverage.
- [date-time.spec.ts](../tests/e2e/date-time.spec.ts): nine real browser-timezone matrix cases, local-midnight refresh across DST, one mounted hook following live date-line changes/clock jumps, and two actual editor save scenarios.
- [date-time.tsx](../tests/fixtures/date-time.tsx): isolated browser probe importing production helpers and the real date hook/recorder. No product route or replacement persistence is added.
- [activity_tests.rs](../src-tauri/src/chapters/activity_tests.rs): native acceptance of the matrix, correct per-day credit/save counts and sealed targets, both streaks in global/book scopes, exclusion of future labels after rollback, database reopen and idempotent retry. An incorrect quarter-hour offset sign fails atomically without changing writing, receipts, events or plans.
- [schedule/tests.rs](../src-tauri/src/schedule/tests.rs): next-day changes at DST/month/leap/year boundaries, rejection of backward history edits, and the production OS/client-date guard.

The browser editor scenarios verify that both sides of Kyiv's repeated hour remain in one submitted save and that a lost-response retry remains byte-for-byte equivalent after date-line travel before new-zone edits are committed. Existing editor close/pending guards and all activity/streak regressions remain covered.

## Method and reproduction

Tests use the installed Edge browser, [Playwright Clock](https://playwright.dev/docs/clock) and the official [CDP timezone override](https://chromedevtools.github.io/devtools-protocol/tot/Emulation/#method-setTimezoneOverride). Date getters and timezone offsets are provided by the browser's timezone data, not hand-mocked. [Local setHours behavior](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/setHours) is exercised through production midnight scheduling. Canonical IANA aliases returned by the installed Intl implementation are accepted.

```powershell
npm.cmd run test:run
npm.cmd run test:e2e -- tests/e2e/date-time.spec.ts
npm.cmd run test:e2e
```

Use Cargo on PATH as documented in [README](../README.md):

```powershell
cargo test --manifest-path src-tauri/Cargo.toml --locked --offline
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --locked --offline --all-targets -- -D warnings
```

Final verification: **778 Vitest tests** in 61 files, **114 Rust tests**, all **12 focused timezone browser cases** and all **201 full-run Edge scenarios** passed. Lint, format:check, typecheck, production build, Cargo fmt/Clippy and diff checks passed.

## Limits and retained behavior

- The date hook schedules refresh just after local midnight with a 25ms tolerance, on focus/visible resume, and on a nominal one-minute polling cadence. Browser throttling or a busy event loop can defer timer callbacks. An in-place zone change can leave date-based display stale until the next poll/focus event. Every actual edit captures fresh context independently.
- Browser timezone/clock overrides and lifecycle events are isolated simulations. Native tests use explicit contexts and disposable databases. The host clock/timezone and real library were not changed; no new native GUI, physical suspend/resume, macOS or packaged-release observation is claimed.
- Stored labels are not converted into a new timezone. After clock rollback, future-labelled records can temporarily disappear from as-of-today streak projections and reappear when the date advances. They remain stored, with unchanged receipt identity.
- A stale client date or backward settings change behind newer history is rejected, rather than rewriting history. Retrying requires a current date that does not backdate newer effective history. Accidentally future-dated settings history can therefore continue to block backdated changes after clock correction; no automatic repair workflow is introduced.
- Existing uncertainty for missing historical plans, retention of deleted-book activity, and memory-only durability of unsaved drafts remain unchanged. This is a local habit tracker, not a tamper-proof time ledger.

Next approved-work gate: **6.1, define achievement rules**. No milestone 6 implementation was started.
