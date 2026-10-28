# Required writing pace (4.5)

`calculateWritingPace` in `src/features/library/writing-pace.ts` is a pure domain calculation. Callers supply committed book word counts, the optional total target/deadline, explicit completion and today's local calendar date. It performs no persistence, clock reads or UI work. Presentation is implemented in task 4.6; preferred-day configuration and history remain task 5.7.

For an unfinished book below its target:

- Remaining words = `max(0, target - committed words)`.
- Count scheduled calendar dates from today through the deadline, including both endpoints. Today remains available even late in the day; no fractional days or activity deductions are inferred.
- Required words per writing day = remaining words divided by available writing days, rounded up. Integer arithmetic preserves accuracy at the safe-integer limit.

The optional weekday list uses Sunday = 0 through Saturday = 6. Omission means every day, matching the application's current lack of a persisted preferred schedule. Duplicates count once; an empty list means no scheduled days. Whole weeks plus at most six remaining dates keep calculation bounded even across years 0001–9999. Gregorian day numbers avoid DST and timezone-offset arithmetic. This API accepts a prospective schedule for calculation only; it does not create schedule persistence or reinterpret historical activity.

Results distinguish `ready`, `no_target`, `no_deadline`, `unknown`, `overdue`, `no_writing_days`, `target_reached` and `completed`. Unknown totals or malformed required inputs never produce a numeric pace. A past deadline has no achievable on-time pace; it does not become a one-day catch-up target or divide by zero. A deadline today counts as one day only if today is scheduled. No available scheduled dates also yields no numeric pace.

Explicit completion takes precedence and suppresses planning, even when counts are unavailable. Otherwise, a missing target yields no target; malformed targets/counts yield unknown; a known reached/exceeded target yields zero remaining words and zero required words per day regardless of deadline. Target attainment never changes `completedAt`. For unfinished work, a missing deadline is distinct from invalid dates, and overdue dates remain distinct from empty schedules. Daily goals do not change this projection, which is based on the total book target and remaining scheduled dates.

Verification covers inclusive dates, ceiling, weekday selection/deduplication, unavailable days, missing/invalid data, explicit completion, target attainment, safe-integer bounds, leap days, DST boundaries, year rollover and the entire supported date range. No UI, schema, dependency or native persistence changes are included in 4.5.

Checks: all 607 Vitest tests passed (40 files), including 10 pace tests. Every one of the 128 weekday combinations was compared against enumerated dates for 1-22-day intervals crossing leap day. Lint, formatting, strict TypeScript, production build and diff checks passed. Browser and Cargo checks were not rerun because this task changes neither UI nor native persistence.

## Presentation (4.6)

Shared `WritingPace` renders on library cards and editor book headers. Its labelled group contains a visible title, localized whole-number words per writing day and available scheduled days, with an inclusive-date explanation. Other calculation states render readable guidance without a misleading numeric rate. Singular word/day forms are supported. No live alert or color-only meaning is used.

Both consumers supply committed manuscript totals and persisted metadata; pending/failed edits do not reduce the required pace. Unknown or failed totals stay unavailable. The shared local-date hook refreshes at midnight, focus/resume and on active clock/timezone polling. All days are currently scheduled; there is no preferred-day picker until 5.7. DailyGoal continues to show configuration rather than a daily achievement, since activity recording is Milestone 5.

Verification: 609 Vitest tests passed, including component state transitions and midnight updates. The full Edge run passed 131 cases and exposed test-clock timeouts in three new cases. After limiting the clock jump to a 20-second midnight boundary and resuming timers before axe, all four pace browser cases passed on rerun; all 134 distinct cases have passing evidence. New coverage includes card/header agreement, retained cancelled metadata, committed goal/date changes, missing/overdue/reached/completed/unknown states, 320/640/1100px, 200% text and axe. Lint, formatting, strict TypeScript, production build and diff checks passed. No production changes followed the full run; native persistence is unchanged.

## Calculation review (4.7)

Cross-calculation tests now cover aggregation through pace, missing goals, overdue dates, explicit completion, recalculation and integer-rate invariants. The schedule oracle covers all starting weekdays plus early/late years and leap/non-leap centuries. See [GOAL_CALCULATION_TESTS.md](GOAL_CALCULATION_TESTS.md). Production behavior is unchanged.
