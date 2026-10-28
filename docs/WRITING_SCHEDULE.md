# Preferred writing days (5.7)

The shared schedule lives in Goals & Deadlines. Seven labelled native checkboxes select weekdays for all books, with Monday first. Every day is the initial prospective default. Save can explicitly enable history with that default; an empty selection pauses scheduled goals without blocking writing. Save waits for native commit; errors/conflicts retain the draft and Reload explicitly replaces it. Pending saves disable competing changes. The app never substitutes editable defaults after a failed read.

## Effective dates and historical goals

Changes apply from the next **local calendar day**. The first explicit save starts tracking today with the existing every-day schedule and each live book's current daily target; the chosen weekdays apply tomorrow. Migration and first use never assign new plans to earlier dates. Saving again on the same date replaces only tomorrow's pending choice. Saving on a later date appends a new version. Production validates the submitted today against the native local date; invalid/out-of-range dates, stale revisions and backward changes behind newer history fail visibly.

Once enabled, creating a book records its initial daily target from its creation date. Editing a daily target records tomorrow's value in the same transaction as book metadata; later title/cover changes do not alter goal history. Deleting a book records retirement from tomorrow and detaches live references, preserving global past results without requiring deleted books to meet future goals. Book metadata still shows the configured target; day details show the applicable historical target. Before tracking starts, legacy unknown dates remain unknown.

The first committed editor plan for a book/date still wins. It takes precedence over effective history and is never rewritten. For unsealed dates the applicable effective goal and schedule determine the plan; native code resolves them from the segment's stored local date, including delayed saves. Client observations and native receipt fingerprints remain stable for retries. Rest-day writing earns normal word credit, but never completes a scheduled goal day. Imports/restores remain excluded from writing credit.

## Persistence and reads

Append-only migration 006 adds schema v6:

- `writing_schedule_state`: singleton revision, checked as a nonnegative safe integer; initial revision 0 means history has not been enabled.
- `writing_schedule_history`: effective local date and seven-bit Sunday-first weekday mask (0 through 127). Mask 0 is a valid pause.
- `activity_goal_history`: immutable source book ID, nullable live reference with SET NULL retention, effective date, nullable positive target and retirement flag. Source/date is unique.

Existing migrations, writing, chapter revisions, receipts and sealed plans are preserved. Settings save uses one immediate transaction and optimistic revision checking; metadata and its goal history also commit together. Reads use consistent SQLite snapshots. Malformed history fails without a reset or a fabricated success. No dependency or arbitrary SQL interface is added.

Daily statistics keep actual words/save counts at zero on empty dates, while known effective goal history can supply pending/unconfigured/rest results. `writingDay` is null for unknown global schedule dates and boolean where history establishes them. This does not manufacture an editor operation, active day or word credit. Sealed plans override generated book goals. Global confirmed rest is now neutral even without activity; a known scheduled positive target with zero credit is a miss once that date is past. Missing pretracking history remains uncertain. Both streak readers start at the earliest activity or applicable tracked history and still page beyond one year.

The provider loads and validates persisted history, shares it with editor context capture and pace, and reloads on focus/resume. A late read cannot undo an acknowledged settings save. Required pace counts each effective schedule interval separately, including today's original schedule and tomorrow's changed schedule; calculation uses civil day numbers, not elapsed 24-hour durations. Local-day refresh selects the applicable version automatically. Read failures suppress numeric pace, while native activity persistence still resolves its authoritative dated schedule and keeps writing available.

## Verification and limits

Native disposable-database coverage checks v5-to-v6 preservation without backfill, next-day changes, historical empty dates, same-day revisions/conflicts, rollback, retired/new books, failed metadata writes, invalid data, ordinary credit on rest days, both streaks across an empty weekend and reopen. Frontend coverage checks history guards, interval counting against a date walk, projected pace, capture, IPC validation, pending/error/conflict/default saves and late reads. Browser tests check keyboard selection, 320/1100px, 200% text, axe, cross-view saved settings, empty rest-day details, failure/retry, pause at next local day and explicit conflict reload.

No real library was edited, and no new native desktop startup/restart or manual screen-reader session is claimed. Native dates use the OS local calendar; recorded edit dates are never moved after a timezone change. Broader midnight/DST/timezone and clock-change review remains the separately approved task 5.8. This is a local writing aid, not a tamper-proof time ledger.

Final checks: 737 Vitest tests (55 files), 110 Rust tests and a final five-case settings rerun passed, with lint, format:check, strict TypeScript/build, Cargo fmt/Clippy and diff checks. Edge covered all 158 distinct scenarios with passing evidence: the full run passed 157 but had one Vite React-preamble page-bootstrap failure; all three book-creation viewport cases then passed in isolation, including the failed case. The four schedule cases passed in the full run. A green isolated retry is not presented as an entirely green full run. Next: 5.8, awaiting approval.
