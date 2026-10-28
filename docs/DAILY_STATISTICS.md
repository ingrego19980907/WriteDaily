# Daily statistics (5.3)

Implemented: native committed-history aggregation, `get_daily_statistics` IPC and a typed, validated frontend service. Calendar presentation is implemented in 5.4; see [ACTIVITY_CALENDAR.md](ACTIVITY_CALENDAR.md). This task adds no screen, schema migration, dependency, streak calculation or persistence writes.

## Request and scope

`src/services/activity.ts` exposes `getDailyStatistics({ startDate, endDate, bookId })`. Dates are canonical local calendar labels (`YYYY-MM-DD`, years 0001-9999); both endpoints are included. A request may contain 1-366 days. `bookId: null` requests global retained history; a canonical UUID-v4 scopes the result to an existing book. A missing/deleted scoped book returns `not_found`, not a fake empty book.

Native code reads one SQLite transaction snapshot with bound parameters. Date grouping uses the local date captured at edit time, irrespective of the current timezone, commit instant or event UTC date. Multiple timezone/offset contexts with the same calendar label share that day's total. No activity is backfilled from current chapter length or current book settings.

Global history includes events and sealed plans detached by book deletion, identified by immutable source book IDs and a null live `bookId`. Current-book scope includes a deleted chapter's retained events while that book still exists. Deleted books are available only through global history.

## Returned values

The response repeats the requested range/scope and returns one ordered row for every date, including gaps:

| Field         | Meaning                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------- |
| date          | Original local calendar label                                                                |
| addedWords    | Sum of positive net editor-batch word changes                                                |
| deletedWords  | Sum of negative net editor-batch word changes, reported positively                           |
| creditedWords | Sum of committed editor credit; under policy v1 equals addedWords                            |
| saveCount     | Distinct editor save operations touching this date, including zero-credit commits            |
| active        | True only when creditedWords is positive                                                     |
| bookGoals     | One result for each source book with editor activity on that date, using its sealed day plan |

Imports/restores are validated but excluded from writing totals and save counts. Formatting and same-length replacements can increase saveCount but not credit or active days. Deletion does not reduce prior credit. A 3-word addition, a 2-word deletion and a 3-word addition yield 6 credited words and 2 deleted words, regardless of the final manuscript length.

A save spanning midnight can count once on each touched date; summing daily saveCount is therefore not a distinct-operation count for the whole period. Multiple segments of one operation on the same date count once. These are saves, not timed writing sessions; no elapsed duration is inferred. Ordered streaming keeps only the last operation ID per date instead of retaining every save ID in memory.

## Sealed daily goals

Each `bookGoals` item contains `sourceBookId`, nullable live `bookId`, `dailyWordGoal`, `scheduled`, that book's creditedWords, `state` and nullable remainingWords. Goals are ordered by source UUID for deterministic output. They use `activity_day_plans`, never the latest configured daily goal or a later segment's observed setting.

| State        | Result                                                                                    |
| ------------ | ----------------------------------------------------------------------------------------- |
| unconfigured | The sealed target is null; remainingWords is null and no goal achievement is claimed      |
| unscheduled  | The sealed schedule is false; remainingWords is null even if writing occurred             |
| pending      | A scheduled positive target is not reached; remainingWords is target minus credited words |
| reached      | A scheduled positive target is reached/exceeded; remainingWords is zero                   |

`pending` means not reached, including historical dates; it does not imply an unsaved write. Global results keep each book goal separate rather than summing different book targets into an invented global goal. A day with no editor events has zero totals/saveCount, active false and an empty bookGoals array. Its historical goal/schedule is unavailable rather than guessed from today's settings. Effective schedule history for empty dates remains 5.7. Streak/grace rules and achievement evaluation remain their own subtasks.

## Validation and failures

Native reads validate selected event counts, policy/origin, operation/source IDs, live references, timestamps/date/offset context, receipt metadata and the required sealed editor day plan. Missing plans, invalid credit or malformed selected data fail the whole request, never skip a row or return partial totals. Mathematical credit/delta relationships are checked even for imports/restores before exclusion.

Checked integer accumulation rejects sums outside JavaScript's safe integer range with `limit_reached`; SQL SUM and floating-point rounding are not used. The read transaction observes committed data, not another connection's pending write. Command errors expose only `validation`, `not_found`, `invalid_stored_data`, `limit_reached` or `persistence`, without SQL/private error details.

The frontend rejects malformed/incomplete days, mismatched request/scope, duplicate book goals, unsafe counts, inconsistent active flags, incorrect remaining/achievement states and per-book credit sums that disagree with the day. Browser use returns `desktop_required`; no mock fallback or zero-history recovery is installed.

## Verification

All 662 Vitest tests passed (46 files), including 20 new domain/service cases. All 92 Rust tests passed, including nine native statistics cases using disposable databases and real activity saves. Coverage includes leap/year bounds, inclusive gaps, source deletion, multi-book scope, sealed goal changes, zero/import/restore handling, multiple segments per operation, local dates on both sides of UTC, reopened data, malformed rows, missing plans, safe-integer overflow and exclusion of another connection's uncommitted changes.

Lint, formatting, strict TypeScript, production build, Cargo fmt/Clippy and diff checks passed. Browser layout tests were not rerun because this task changes no UI/layout; no new native GUI/startup/restart observation or real-library mutation is claimed. Schema remains v5. Next: 5.4, activity calendar.
