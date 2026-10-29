# Achievement test coverage review (6.7)

Reviewed on 2026-10-29 against [policy 1 and lifecycle contracts](ACHIEVEMENTS.md), including the boundary examples defined in 6.1. This review covers the implemented eight-rule evaluation, native unlock/notification persistence and UI. ACH.1, the explicit mark-complete command/UI, remains a separately approved follow-up.

## Findings and changes

Existing TypeScript tests already covered inclusive boundaries for all eight rules, uncertain history, global scope, duplicate evidence, safe arithmetic, date cutoffs and explicit completion. Native word-boundary and persistence tests were present, but several contracts lacked combined native regression cases.

Added eight native tests in [achievements/tests.rs](../src-tauri/src/achievements/tests.rs):

- Scheduled-day thresholds at 6/7/8 and 29/30/31 dates with gaps; cumulative days never become consecutive-streak rules.
- Goal Keeper at 9/10/11 distinct book/date goals on one date; many goals still contribute only one completed date.
- The End with zero, one and two explicitly completed books; only one permanent ID and one claim can result.
- Ten real chapter saves sharing one book/date goal; chapters cannot multiply the book's daily achievement credit.
- All eight IDs discovered together, retained source history after confirmed book deletion, unclaimed notices surviving database reopen, and no replay after claim/reopen.
- A failure at the final unlock of a batch, both statement failure and deferred COMMIT failure: all new unlocks roll back while prior unlock/receipt and saved text remain intact; retry produces only the seven new IDs.
- A failure at the last notification receipt rolls back every new receipt; retry claims the complete saved batch once.
- A v7 upgrade silently baselines the old unlock, then a new real chapter save reaches the next word threshold and returns only that new notification. The original timestamp and NULL baseline claim time remain unchanged.

Added three collector tests in [AchievementNotifications.test.tsx](../src/features/achievements/AchievementNotifications.test.tsx): mixed old/new responses queue only unseen names; an in-flight response cannot publish or launch queued work after unmount; starting hidden preserves pending claims until visible resume.

No production implementation, SQL migration, dependency, capability, persistence API or editor behavior changed in 6.7. The new tests passed without a production fix.

## Contract coverage matrix

This is a scenario-based review, not an instrumented line/branch coverage percentage. No coverage dependency was installed.

| Contract                   | Verified cases                                                                                                                               | Primary evidence                                                                                                                                                |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stable policy and IDs      | All eight IDs, thresholds, metrics, policy version and centralized copy; Rust/TypeScript parity                                              | [Catalog tests][catalog], [native tests][native], shared `achievement-rules.json`                                                                               |
| Credited-word thresholds   | 99/100/101; 999/1,000/1,001; 9,999/10,000/10,001; 49,999/50,000/50,001; split sources; simultaneous badges                                   | [Evaluation tests][evaluation], [native tests][native]                                                                                                          |
| Cumulative scheduled dates | Below/exact/above 7 and 30, gaps/rest/misses, duplicates and repeated date labels                                                            | [Evaluation tests][evaluation], [native tests][native]                                                                                                          |
| Distinct daily goals       | 9/10/11 book/date pairs, multiple books on one date, repeated segments and ten chapters of one book                                          | [Evaluation tests][evaluation], [native tests][native]                                                                                                          |
| Actual credit only         | No manuscript backfill; no credit from imports/restores, formatting/replacement or deletions; failed/duplicate operation does not add credit | [Migration tests][migrations], [activity write tests][writes], [daily read tests][daily], [native tests][native]                                                |
| Explicit completion        | Target alone is insufficient; validated persisted completion; zero/one/many completed books; preserve evidence before deletion               | [Evaluation tests][evaluation], [native tests][native]                                                                                                          |
| Historical/global scope    | Deleted sources, history beyond 366 days, stored goal/schedule plans, filtered/partial/contradictory evidence                                | [Evaluation tests][evaluation], [native tests][native], [schedule tests][schedule]                                                                              |
| Dates and safe counts      | Local-date cutoff, future labels/clock rollback, leap/DST/date-line contexts, safe saturation and corrupt later evidence                     | [Evaluation tests][evaluation], [native tests][native], [date/time review](DATE_TIME_REVIEW.md)                                                                 |
| Unlock durability          | Save/activity/unlock atomicity, retry/lost reply, two concurrent connections, reopen, immutable initial timestamp and retained unlocks       | [Native tests][native], [activity write tests][writes], [page browser tests][page-browser]                                                                      |
| Batch rollback             | Final-row insertion/deferred COMMIT failure preserves prior unlock and writing; all new rows retryable                                       | [Native tests][native]                                                                                                                                          |
| Upgrade safety             | Previous-schema preservation/refusal; v7 baselines with NULL retrieval times; later real save not suppressed                                 | [Migration tests][migrations], [native tests][native]                                                                                                           |
| Notification claims        | Committed rows only, batch rollback, concurrent callers, pending reopen, claimed reopen, lost response and old baseline                      | [Native tests][native], [service tests][services], [notice browser tests][notice-browser]                                                                       |
| Notice lifecycle           | Subscribe before drain, StrictMode, late cleanup, coalesced wakeups, hidden startup/resume, mixed queued IDs                                 | [Notification tests][notices], [service tests][services]                                                                                                        |
| Notice interaction         | Polite announcement, no focus theft, dialog placement, keyboard/pointer dismissal, eight-second timer and pauses                             | [Notification tests][notices], [notice browser tests][notice-browser]                                                                                           |
| Cards and page             | Saved status/date precedence, pending/unknown/empty/error, retained cache, retry, stale results, navigation and display-timezone refresh     | [Card tests][cards], [page tests][page], [page browser tests][page-browser], [timezone browser test][timezone-browser]                                          |
| Accessibility and layout   | Keyboard, axe, narrow/wide windows, 200% text, long Cyrillic names, forced colors and reduced motion                                         | [Card browser tests][card-browser], [page browser tests][page-browser], [notice browser tests][notice-browser], [accessibility review](ACCESSIBILITY_REVIEW.md) |

## Verification results

| Check                                                 | Result                                                                                    |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Focused achievement/catalog/service Vitest            | 143 passed, six files                                                                     |
| Focused native achievement tests                      | 24 passed                                                                                 |
| Full Vitest suite                                     | 922 passed, 67 files                                                                      |
| Full Cargo suite, locked/offline                      | 140 passed; no ignored or failed tests                                                    |
| ESLint and strict TypeScript                          | Passed                                                                                    |
| Prettier                                              | Passed, including final documentation                                                     |
| Cargo fmt and Clippy, all targets, warnings denied    | Passed                                                                                    |
| Production build                                      | Passed                                                                                    |
| Full Edge regression                                  | 222 passed, one initial calendar module-load timeout; all 22 achievement scenarios passed |
| Calendar follow-up, unchanged code, three repetitions | 18 passed; initial failing 1100px scenario passed all three repetitions                   |
| Final whitespace/diff check                           | Passed                                                                                    |

The initial calendar failure occurred before the Activity Calendar navigation button existed: its trace records `net::ERR_NO_BUFFER_SPACE` fetching `/tests/fixtures/longest-streak-data.ts`, followed by a 30-second locator timeout. The same six-case calendar file then passed three complete repetitions with no production, fixture, timeout or retry configuration changes. The observed failure is a browser module-load/resource error; its underlying host cause was not diagnosed. This is **not a claim of a clean 223/223 single full run**. The trace and error context were retained under ignored `.cache/achievement-review/calendar-initial-trace.zip` and `calendar-initial-error.md` before rerunning. No failing test was skipped or weakened.

Commands use the existing npm scripts and README Cargo toolchain setup; no new test runner is introduced. Focused commands are `npm.cmd run test:run -- src/features/achievements src/services/achievements.test.ts` and `cargo test --manifest-path src-tauri/Cargo.toml --locked --offline achievements::tests`. Full checks use `npm.cmd run lint`, `format:check`, `typecheck`, `test:run`, `build`, `test:e2e`, plus locked/offline Cargo tests, fmt and Clippy as documented in README. The calendar follow-up command is `npm.cmd run test:e2e -- tests/e2e/activity-calendar.spec.ts --repeat-each=3`.

## Limits and follow-ups

- Native tests use disposable SQLite databases. Reopen tests verify on-disk retention, not a new Tauri GUI/process restart or power-loss guarantee. No actual user library or host clock/timezone was changed.
- Browser scenarios use isolated IPC-response fixtures. They verify real production React/service interactions and accessibility, not a browser-to-SQLite end-to-end path. No fresh desktop GUI/restart, installer, macOS or manual screen-reader run was performed.
- ACH.1 is absent: no user-facing mark-complete command/UI exists. Completion fixtures seed valid persisted evidence only in disposable tests; they do not establish a usable completion workflow. Reaching a word target never completes a book automatically.
- Notifications guarantee at-most-once claims, not human delivery. A crash/unmount/lost reply after a committed claim can miss a transient notice; the permanent achievement remains saved. No replay or exactly-once delivery claim is made.
- Native unlock endpoints do not expose per-rule aggregate progress. Locked progress remains explicitly unavailable. Very large histories still use full native reconciliation; an incremental optimization would require separate approval.
- Numbered follow-up after review: **7.1 — individual chapter export**. ACH.1 remains separately tracked; 6.7 does not authorize it or export implementation.

[catalog]: ../src/features/achievements/achievement-rules.test.ts
[evaluation]: ../src/features/achievements/evaluate-achievements.test.ts
[native]: ../src-tauri/src/achievements/tests.rs
[migrations]: ../src-tauri/src/database/tests.rs
[writes]: ../src-tauri/src/chapters/activity_tests.rs
[daily]: ../src-tauri/src/activity/tests.rs
[schedule]: ../src-tauri/src/schedule/tests.rs
[services]: ../src/services/achievements.test.ts
[notices]: ../src/features/achievements/AchievementNotifications.test.tsx
[cards]: ../src/features/achievements/AchievementCard.test.tsx
[page]: ../src/features/achievements/AchievementsPage.test.tsx
[card-browser]: ../tests/e2e/achievement-cards.spec.ts
[page-browser]: ../tests/e2e/achievements-page.spec.ts
[notice-browser]: ../tests/e2e/achievement-notifications.spec.ts
[timezone-browser]: ../tests/e2e/achievement-display-timezone.spec.ts
