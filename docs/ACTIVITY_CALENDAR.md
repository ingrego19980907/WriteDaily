# Activity calendar and statistics presentation (5.4)

Activity Calendar in the main navigation now opens a monthly calendar backed by the native daily-statistics service from 5.3. `ActivityCalendar.tsx` owns the view/query state, `ActivityDayDetails.tsx` presents one committed day, and `activity-calendar.ts` contains civil-month navigation, intensity and checked summary helpers. English UI copy is centralized in en.activity; no dependency, native API, schema or persistence change is included.

## Viewing recorded activity

The initial month and selection use today's local calendar date. The month input and previous/next controls support January 0001 through December 9999, with disabled boundary navigation. Today returns to the current local date. Weeks begin Monday and blank cells preserve weekday alignment. Month generation and year rollover use civil dates rather than elapsed-hour arithmetic or UTC date keys.

All books is the default and includes retained activity from removed books. The book selector scopes the existing API to a current book. Details resolve current titles separately; detached sources have numbered Removed book labels and missing names have neutral fallback labels. A name-list failure does not substitute activity data. A deleted selected book returns an explicit error and the user can choose All books to inspect retained history; the filter does not silently change scope.

Each day has a fixed credited-word intensity: zero, 1-249, 250-499, 500-999 or 1,000+. Color and bar length express the same level, with a visible numeric legend and full date/credit/save labels on buttons. Levels are not normalized to the month's maximum or to changing book goals. Today is underlined; the selected day has a double outline and aria-pressed. Color alone is not required to select or inspect a day.

Month totals show credited words and positive-credit active days. Checked accumulation displays an unavailable-total explanation if otherwise-valid daily totals exceed the safe numeric range; it never rounds an unsafe monthly sum. Save counts are shown for individual dates rather than incorrectly summing distinct per-day operations into a distinct monthly save count.

Selected-day details show credited, added and deleted words, save count and separate book-goal results. These use sealed historical targets returned by 5.3, including unconfigured/unscheduled states; no current setting is used to invent past targets. Empty days/months are described as having no recorded activity, not as missed goals. Calendar activity remains separate from manuscript length and timed writing sessions. Streaks are not displayed until their subtasks.

## Loading, refresh and failures

Each valid month/book query calls getDailyStatistics. View keys and effect cleanup prevent late responses from replacing a newer month/filter or updating an unmounted view. Loading, desktop-only, read failure, invalid data and numeric-limit outcomes are explicit; totals/calendar/details render only from a successful matching query, never placeholder zero history. Refresh retries the selected query and reloads book names.

The view refreshes on focus/visibility resume and on local-day changes. Returning to the section mounts a fresh current-month view, so writing committed in the editor is read on entry. A midnight or timezone change updates today's marker/refetches data without forcing the user away from a month they are browsing. Native reads use stored local dates, so viewing in another timezone does not rebucket historical records.

## Keyboard and layout

The calendar is a semantic table with a month caption and weekday headers. Date buttons have one roving Tab stop. Arrow keys move one day or one week, Home selects the first day, End the last; movement clamps within the month. Enter/Space/click selects a date and exposes details through aria-controls. Month controls handle changing months. Focused dates scroll into view within the calendar.

Controls, metrics, legends and long book titles wrap. Date targets retain a 2.75rem minimum height. When the table cannot fit, it scrolls inside a labelled keyboard-focusable region; the page itself does not gain horizontal overflow. Forced colors keep readable buttons, focus, selection and different bar lengths. The reviewed enlarged screenshot shows this local scrolling behavior at 200% text; no claim is made that all seven columns are simultaneously visible at every zoom/width.

## Verification

All 672 Vitest tests passed (48 files), including ten new helper/component cases. The full Edge run passed all 148 scenarios; the six calendar cases passed again after final copy/type cleanup. Lint, format:check, strict TypeScript/build and diff checks passed.

New coverage includes actual selected-day values, sealed goals, retained removed sources, book filtering, empty periods, read/loading/malformed/deleted-scope states, stale-response protection, focus refresh, month/year bounds, keyboard selection, axe, 320/640/1100px, 200% reflow, scroll visibility and forced colors. Month helpers cover leap/non-leap centuries and checked totals. Test entry points load global CSS before components; browser data is isolated test IPC, not production mock persistence.

The native query implementation and disposable-database tests were verified in 5.3. No new native GUI/startup/restart or manual screen-reader session is claimed in 5.4; Rust checks were not repeated for this frontend-only task. Next: 5.5, current streak.
