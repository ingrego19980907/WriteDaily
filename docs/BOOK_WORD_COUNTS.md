# Book word counts (4.1)

Implemented 2026-10-27. Book totals are derived from committed chapter counts; no book-total column, migration, new IPC command or background write is introduced.

## Contract

`aggregateBookWordCount(bookId, chapters)` is a pure feature-domain function. An empty chapter collection produces 0. Every chapter must belong to the requested book, have a distinct nonempty identity and contain a nonnegative safe-integer count. The total must also remain a safe integer. Legacy NULL, malformed input, mixed-book/duplicate rows and overflow produce an unknown total, never a partial sum or fabricated zero. Titles, ordering and formatting do not add words.

The existing native ChapterRepository list command validates each chapter's content, count, revision and ordering before returning its SQLite snapshot. Known count/content mismatches fail without repair; legacy NULL remains unknown until an explicit content save. The frontend sums those validated snapshots rather than introducing a second counting policy. See [WORD_COUNTING.md](WORD_COUNTING.md).

## Display and refresh

ChapterManager derives Saved book words from its committed chapter collection. Successful content saves (manual/autosave/navigation), creation, rename and confirmed deletion update that collection. Pending or failed writes cannot advance the total. Failed/loading chapter reads show an unknown total.

Library uses CountedBookCard to read persisted chapter snapshots through the existing service for each visible book. App increments a visit version on selecting/returning to My Library, refreshing totals without unmounting card dialogs or discarding edit drafts. Reads are scoped to book identity and visit version; cleanup rejects late responses after hiding/unmounting/replacement. Pending/failed reads remain unknown. Selecting My Library again retries count reads. The existing BookProgress receives the result and renders actual words, target progress and remaining/excess values; books without targets show words without a percentage.

This uses one existing validated chapter-list request per visible book per library visit. The native list verifier also checks content; a summary-only optimized query/cache is not introduced. Counts do not update for external-process changes until refresh/re-entry. No new persistence fallback, automatic count backfill, activity tracking or goal feature is added.

## Verification

- 420 Vitest tests passed, including 10 aggregation cases and two read/refresh/race cases.
- 105 Edge scenarios passed in a full run. Five new scenarios cover totals after content edits, empty chapter creation, rename, deletion, return to the library, legacy unknowns, pending writes and failed-write retry. Three widths (320/640/1100px) and axe scans cover the integrated library display.
- The first focused browser run used the wrong rename-save button name; corrected the test locator to the existing Save title label before the successful full run.
- All 66 existing Rust tests passed against disposable databases. Native source and SQL migrations are unchanged.
- Lint, formatting, strict TypeScript, production build and diff checks passed. No new actual desktop startup/restart is claimed for 4.1; prior persistence/recovery evidence remains valid within its documented boundary.
