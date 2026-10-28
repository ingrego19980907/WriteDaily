# Goal calculation review (4.7)

This review closes Milestone 4's calculation acceptance: missing goals, overdue dates and explicitly completed books have verified outcomes. It describes scenario coverage, not instrumented line/branch percentages. No coverage plugin or dependency was installed.

| Contract                                                                                               | Test evidence                                                                                               |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Committed chapter sums, empty books, deletion, legacy unknowns and overflow                            | `book-word-count.test.ts`, `goals-calculations.test.ts`                                                     |
| Missing/invalid targets, bounded percentages, exact/exceeded/raised/removed goals                      | `book-progress.test.ts`, `goals-calculations.test.ts`                                                       |
| Missing/invalid/today/upcoming/overdue deadlines; explicit completion separate from target achievement | `book-deadline.test.ts`, `goals-calculations.test.ts`                                                       |
| Local calendar validation, leap/century rules, DST-independent arithmetic and supported year bounds    | `calendar-date.test.ts`, `book-deadline.test.ts`, `writing-pace.test.ts`                                    |
| Inclusive scheduled days, deduplication, no available days, invalid schedules                          | `writing-pace.test.ts`, `goals-calculations.test.ts`                                                        |
| Ceiling produces the smallest sufficient whole-number daily rate, including safe-integer extremes      | `writing-pace.test.ts`, `goals-calculations.test.ts`                                                        |
| Recalculation after count reduction, goal increase/removal and changed deadline                        | `book-progress.test.ts`, `goals-calculations.test.ts`                                                       |
| Midnight/resume refresh and readable presentation                                                      | `useLocalCalendarDate.test.ts`, `BookDeadline.test.tsx`, `WritingPace.test.tsx`; Edge evidence from 4.4/4.6 |

The 12 additional cross-calculation cases in `goals-calculations.test.ts` exercise the target/deadline matrix and verify that a reached target can coexist with an overdue deadline without implicitly completing the book. Explicit completion suppresses pace even when planning inputs are missing. Unknown chapter totals, including legacy counts and overflow, never become zero or a claimed achievement. Missing configuration is intentionally distinct from invalid data; precedence is documented in [WRITING_PACE.md](WRITING_PACE.md).

The independent schedule oracle walks UTC civil dates using built-in weekday calculation, comparing results for all 128 weekday subsets, 1-15-day intervals, all seven starting weekdays, year 0001, non-leap century 1900, leap century 2000 and year 9999. This adds 21,120 schedule comparisons to the earlier 2,816 comparisons. UTC is used only in the test oracle to enumerate civil dates deterministically; production callers continue to supply local calendar dates.

Integer-rate checks assert sufficiency (`rate * days >= remaining`) and minimality (`(rate - 1) * days < remaining`) using BigInt, across small counts, exact/remainder divisions and safe-integer extremes. They do not duplicate the production ceiling formula. The review found no production defect requiring behavior changes.

Daily goals remain configuration only until activity recording in Milestone 5. Preferred-weekday configuration/history remains 5.7. No new UI, persistence, schema or real-library operations belong to this test review; the prior browser/native verification is historical evidence, not a new run.

Final checks: all 621 Vitest tests passed across 42 files, including the 12 new review cases. Lint, format:check, strict TypeScript, production build and diff checks passed. Browser/Cargo tests were not rerun because only tests and documentation changed. Milestone 4 acceptance is complete; next is 5.1 (activity record design).
