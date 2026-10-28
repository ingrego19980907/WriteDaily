# Writing streaks (5.5?5.6)

Implemented: a native read-only current-streak calculation, validated IPC/service and a shared summary in My Library and Activity Calendar. Task 5.6 adds the longest recorded streak with dates and honest incomplete-history bounds. No schema, dependency or persistence write is introduced.

## Which days count

Streaks count completed scheduled daily goals, not merely positive activity, manuscript length, save count or explicit book completion. The calculation uses committed credit and sealed historical plans returned by the daily-statistics reader. Today's configured goal never rewrites an older result.

For one book, a day counts when its scheduled positive target is reached. For the personal/global streak, a day counts once if at least one scheduled book goal is reached, even when other books have pending/unconfigured goals. Completing several book goals does not add several days. Global history includes retained removed-book goals; a deleted scoped book still returns not_found rather than zero.

| Day evidence                                                     | Effect while reading backward                                                 |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Reached scheduled goal                                           | Count one completed day                                                       |
| Past day with a known scheduled positive target, no reached goal | End the streak at a confirmed missed day                                      |
| Confirmed scoped book day off                                    | Skip without adding a day or breaking continuity                              |
| Missing or unconfigured historical goal/schedule                 | Stop confirming history; do not invent a missed day or a rest day             |
| Only observed days off in global scope                           | Unknown, since one book's rest does not establish every other book's schedule |

Rest days do not increase the number of completed days. Current recording defaults all days to scheduled; future effective schedule history/preferred-day configuration remains 5.7. Tests simulate sealed rest history in disposable data without adding a setting UI.

## Today and uncertain boundaries

An unfinished today is an open day until the user's local midnight. It neither counts nor breaks the series: yesterday's confirmed streak can remain current. A reached today adds a day immediately after persistence. Past pending days have no extra grace. Missing yesterday's plan is uncertainty, not a two-day grace extension or a confirmed zero.

The result contains `days`, `exact`, `todayState`, `todayCreditedWords`, nullable first/last confirmed completed dates, requested today/book scope and a boundary reason:

- missed_day: a known missed past day establishes an exact current count, including zero.
- unknown_day: missing/unconfigured history stops verification; the count is a lower bound.
- history_start: the oldest stored activity date is reached without a known break; earlier history cannot be proven, so the count remains a lower bound.
- empty_history: no stored activity exists in scope on/before today; report zero recorded completed days, without backfilling from manuscripts.
- date_start: the supported civil-calendar beginning is reached; there is no earlier supported date to inspect.

When exact is false and days is positive, the UI says At least N completed days. An uncertain zero is shown as insufficient recorded history, not an exact zero. First/last dates describe only the confirmed completed part, not a guessed older start. Future-dated events are excluded from an as-of-today calculation.

## Read path and view behavior

`get_current_streak({ today, bookId })` validates a canonical local date and optional UUID scope, opens one SQLite read transaction and pages backward in windows of at most 366 days through the existing validated daily-statistics reader. Its transaction-free internal reader is shared with the public daily-statistics transaction wrapper; no nested transactions or inconsistent cross-page snapshots are used. The calculation stops at a known break, uncertainty or the history boundary. It is not capped to the visible month or the first 366 days; a 400-day series is covered by a native reopen test.

No current streak is cached in a book column or reset by deleting source writing. Existing invalid-data/overflow/read errors propagate rather than producing a zero. The frontend validates result shape, scope/date, exactness/boundary flags and confirmed dates/counts before display.

The shared summary shows the streak, today's actual credited words, latest confirmed completed date and open-day/incomplete-history explanations. My Library refreshes when activated after writing, on local-day changes, focus/resume or explicit Refresh streak. Inactive library views do not request streak history. The calendar uses its book filter and refresh triggers, while the streak remains anchored to today regardless of the browsed month. Old responses cannot overwrite a newer scope. No speculative count appears during loading or failure, and no repeating live announcements are generated on refresh.

## Verification

All 696 Vitest tests passed (50 files), including current-streak response validation, service payload/failure handling and loading/exact/lower-bound/retry/stale/inactive-view presentation. All 99 Rust tests passed, including seven new streak cases: today/yesterday grace, confirmed misses, unknown/unconfigured history, scoped rest/global ambiguity, multi-book and retained-source behavior, future dates, leap/DST-adjacent civil days, supported date start, corrupt history, a 400-day sequence and disposable-database reopen.

All 152 Edge cases passed. Four new cases exercise library/calendar display, scope and browsed-month independence, local-midnight reset, pending/error/retry, stale global replies, unknown history, 320/1100px, 200% text and axe. Existing calendar/editor/layout regressions passed. Lint, format:check, strict TypeScript/build, Cargo fmt/Clippy and diff checks passed.

Native tests use disposable databases; browser fixtures are test-only IPC data. No real library was modified and no new native GUI/startup/restart or manual screen-reader session is claimed. Next after 5.6: 5.7, preferred writing days and effective schedule history.

## Longest recorded streak (5.6)

`get_longest_streak({ today, bookId })` scans the entire recorded interval from its earliest stored activity date through local today, in ascending pages of at most 366 civil dates under one read transaction. It shares the current-streak day classifier and validated daily reader. Runs continue across page/month/year boundaries. Future records are excluded. Invalid data/read failures propagate; no fallback zero, migration, persisted counter or write is introduced.

Reached scheduled goals add one day; a confirmed scoped day off is neutral. A known past pending goal resets the run. Unknown/unconfigured/global-ambiguous past dates split confirmed runs and make the maximum a lower bound. The open today cannot add a day until a goal is reached, and cannot erase an earlier record. The entire history is still scanned after a miss or gap. Strict improvement selects the earliest run when lengths tie; returned start/end dates are its first/last completed dates, excluding trailing rest days.

The DTO contains today/bookId, days, exact, historyStartDate and nullable startDate/endDate. Here `exact` means exact **within the recorded interval**; it makes no claim about activity before historyStartDate. This differs from the current suffix, whose `history_start` boundary may conceal an older continuation. Empty recorded history has zero days and null dates. Unknown history with zero confirmed days shows insufficient history. Positive uncertain maxima show At least N completed days and explain gaps; all nonempty results identify the recorded-history start.

My Library and Activity Calendar show a separate labelled longest-record card. It shares current-streak refresh, active-view, local-midnight and focus/resume triggers, but has independent loading/error handling. Refresh streak retries both metrics. Book scope changes cancel old replies; browsing another month does not change the record. Global results retain removed sources and count any reached book once per date; a deleted scoped book is still an error.

Native coverage includes historical records after later misses, earliest ties, today completion, missing/null/import-only history, scoped rest/global ambiguity, leap-day continuity, retained multi-book history, invalid/corrupt input, and a 400-day record preserved across reopen. Frontend coverage includes DTO invariants, native scope/date matching, lower bounds, error/retry, inactive views and stale replies. Browser coverage extends compact/200%/axe and midnight checks, and adds independent longest-load/failure/retry and stale-scope cases. No real library or new desktop GUI session is used. Effective schedule changes remain 5.7.

Final 5.6 checks: all 717 Vitest tests (52 files), 103 Rust tests and 154 Edge cases passed, along with lint, format:check, strict TypeScript/build, Cargo fmt/Clippy and diff checks. Next: 5.7, awaiting approval.
