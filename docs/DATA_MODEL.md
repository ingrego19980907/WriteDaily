# Data model

Status: book metadata types/validation (2.1), native SQLite/migration v1 (2.2) and Rust book repository (2.3) are implemented. No Tauri book command, book CRUD UI or cover file import/cleanup exists. SQLite is bundled; Tiptap remains uninstalled. Other entities remain planned.

| Entity              | Proposed fields and constraints                                                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Books               | Book contract below: identity, editable metadata, managed cover reference and lifecycle timestamps                                                                      |
| Chapters            | ID, book foreign key, title, order, versioned Tiptap JSON, nonnegative word count, revision, timestamps                                                                 |
| Goal schedules      | Book foreign key, preferred weekdays; effective-dated goals/schedules so historical results remain stable                                                               |
| Writing activity    | Unique operation ID, book/chapter references, local date, UTC timestamp, timezone context, added/deleted word deltas, credited words, applicable goal/schedule snapshot |
| Achievement unlocks | Unique achievement key, unlocked timestamp, optional evidence                                                                                                           |
| Preferences         | Validated, versioned settings including editor size and future language preference                                                                                      |

Foreign keys must be enabled. Use ordered migrations and transactional schema changes where supported. Reject invalid counts/dates and unsafe file references. Store covers under managed application data and only relative references in SQLite; never persist browser object URLs. Coordinate cover replacement/deletion with database writes and recoverable cleanup.

## Book contract (2.1)

Code: src/features/library/book.ts. BookDetails contains only editable metadata. Book adds persistence-owned identity, managed cover reference and lifecycle timestamps. Both types expose readonly snapshots; updates will go through repositories rather than mutating saved objects.

| TypeScript field | SQLite column/type           | Nullability and rules                                                                                                                                                             |
| ---------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id               | id TEXT PRIMARY KEY NOT NULL | Persistence-generated lowercase UUID v4; immutable. Title is not identity and duplicate titles are allowed.                                                                       |
| title            | title TEXT NOT NULL          | Trim Unicode edge whitespace, normalize NFC; 1-200 Unicode code points; no embedded Unicode control characters. Preserve internal ordinary spaces/punctuation and Ukrainian text. |
| targetWordCount  | target_word_count INTEGER    | Nullable; positive safe integer, 1 through 9,007,199,254,740,991. Null means no target.                                                                                           |
| dailyWordGoal    | daily_word_goal INTEGER      | Nullable; same positive safe-integer rule. Null means no daily goal. No implied default or artificial 0 target.                                                                   |
| deadline         | deadline TEXT                | Nullable local Gregorian calendar date YYYY-MM-DD, years 0001-9999. Validate actual month length/leap year; overdue dates are allowed.                                            |
| coverPath        | cover_path TEXT UNIQUE       | Nullable managed relative reference; null selects a default design-system cover at presentation time. Never a blob URL, data URL or arbitrary external path.                      |
| completedAt      | completed_at TEXT            | Nullable explicit completion timestamp; not automatically set when a word target is reached.                                                                                      |
| createdAt        | created_at TEXT NOT NULL     | Persistence-owned UTC ISO timestamp, YYYY-MM-DDTHH:mm:ss.sssZ; immutable.                                                                                                         |
| updatedAt        | updated_at TEXT NOT NULL     | Same UTC representation; maintained by successful writes, not unsaved UI edits.                                                                                                   |

**Not stored on books:** current manuscript word count, percentage progress, words remaining, historical daily totals or streaks. Chapter aggregation supplies current counts in later tasks; activity records supply history. Missing targets do not imply 0% completion. Preferred writing days and effective-dated goal history belong to later goal/activity entities, not a comma-separated book column.

### Metadata validation

`validateBookDetails(unknown)` returns either normalized BookDetails or field/code issues; it never returns partially valid data. Codes are required, invalid_type, invalid_title, too_long, invalid_count and invalid_date, with field names or form for an invalid payload. Consumers translate codes into localized messages. Validation is pure and has no clock, storage, ID generation or UI side effects.

Missing/null optional counts/date normalize to null. Numeric strings, blank strings, fractions, nonfinite/unsafe counts and invalid calendar dates are rejected. Forms must explicitly convert empty optional inputs to null and numeric text to a number before submission; the domain validator does not guess or silently coerce. Titles are trimmed/NFC-normalized before the code-point length check. The 200-code-point cap is a metadata limit, not a manuscript limit; HTML maxlength counts UTF-16 units and must not replace the domain rule.

Extra input properties are excluded from the returned metadata, so ID, timestamps, coverPath and completedAt cannot enter the editable result by spreading a form payload. The TypeScript validator does not validate complete persisted rows or authorize file references. Native repository validation is implemented in 2.3; physical file validation/containment remains 2.7. Existing TypeScript interfaces are not runtime proof that a row/path is safe.

### Persistence boundary and remaining work

- Enable foreign keys on every connection; use migrations, transactions and parameterized statements.
- Add database checks for nonempty/max-length titles and nullable positive safe-integer counts. Date column checks should enforce canonical shape; real calendar validity and Unicode normalization also need native validation. SQL affinity alone is insufficient for this contract; see [SQLite datatypes](https://www.sqlite.org/datatype3.html).
- Enforce UUID and canonical timestamp formats at the native boundary; map snake_case SQL to camelCase domain fields in the repository. No database-specific type leaks into UI components.
- Generate IDs and timestamps in trusted persistence code. Metadata validation accepts no persistence-owned values. Connection/migration ownership is implemented in the Rust database module (2.2); native CRUD validation and camelCase DTO mapping are implemented in 2.3; IPC/UI wiring starts in 2.4.
- covers/<generated-uuid>.<validated-image-extension> is the managed reference shape planned for 2.7. Resolve it beneath the application's managed cover directory and verify containment; reject traversal, absolute paths, URI schemes and unexpected separators. Native import/cleanup implementation and allowed formats are not present yet.
- Cover references are unique per book; importing the same source for another book creates an independently owned file. No SQL default timestamp or completion based on current target is assumed.

### Relationships and deletion contract

| Future dependent data  | Relationship and intended deletion behavior                                                                                                                                                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chapters               | Many chapters belong to one book. Their book_id foreign key is non-null; ON DELETE CASCADE removes manuscript chapters only inside a confirmed book-deletion transaction. Final chapter schema is 3.1.                        |
| Goal schedules/history | Book-specific settings cascade with the book. Historical activity retains the applicable goal/schedule snapshot rather than rereading deleted settings.                                                                       |
| Writing activity       | Retain historical credited activity; nullable book/chapter foreign keys use ON DELETE SET NULL. IDs linking to deleted content must not prevent retained aggregates. Final activity schema is 5.1.                            |
| Achievement unlocks    | Remain unlocked; optional book evidence becomes null or retains a standalone snapshot, never cascades away. Final evidence shape is 6.1/6.3.                                                                                  |
| Preferences            | Clear a deleted selected-book reference; do not leave a dangling active-book ID.                                                                                                                                              |
| Cover file             | No SQL cascade can delete a file. Delete only this book's owned file after the database transaction commits; failed file cleanup leaves a retryable orphan, not a rolled-back manuscript deletion or a false successful save. |

Deletion requires explicit user confirmation (task 2.6). The transaction removes only the selected book and its owned dependent manuscript/settings. Never delete retained history/achievements, unrelated covers or backup archives. Cancel or database failure must leave the book/cover intact. Coordinate recoverable file cleanup in 2.6/2.7; no deletion is performed by this task. See [SQLite foreign-key actions](https://www.sqlite.org/foreignkeys.html#fk_actions) for CASCADE/SET NULL semantics. Only books currently exists. The dependent-table relationships are a contract for future migrations, not a claim that those tables or deletion operations exist.

## SQLite and migration v1 (2.2)

Rust module: src-tauri/src/database/. Versioned SQL: src-tauri/migrations/001_books.sql. rusqlite 0.40.2 uses bundled SQLite (libsqlite3-sys 0.38.2 ships SQLite 3.53.2), and rusqlite_migration 2.6.0 applies all pending steps atomically with PRAGMA user_version. Only one production migration exists; version 2 appears only in isolated tests. SQL migrations are append-only after shipment.

### Location and startup

Tauri resolves app_data_dir using the application identifier. Release database: <app_data_dir>/write-daily.sqlite3. Debug database: <app_data_dir>/development/write-daily.sqlite3. On Windows the debug path is normally %APPDATA%/app.writedaily.desktop/development/write-daily.sqlite3. No browser storage, working-directory database or hardcoded username is used. Debug startup never selects the release database.

The setup hook creates the directory, opens the file and manages a Mutex<Connection> in Tauri state. Future native repositories share this serialized connection; no arbitrary SQL command or filesystem/database permission is exposed to JavaScript. Initialization errors propagate and stop startup, rather than replacing files or pretending the library is empty. Current dev errors are reported through the native startup error/terminal; no recovery UI is implemented yet.

### Open sequence and protection

1. Set a 5-second busy timeout and enable foreign keys on the connection.
2. Read application_id, user_version and schema objects before any migration or persistent journal-mode change. Only an empty unversioned database with marker 0 can be initialized. A versioned database must have WriteDaily marker 0x57444159 (decimal 1464090969). This marker identifies format, not authentication.
3. Refuse unknown nonempty/unversioned schemas and schemas newer than the registered migration list. No automatic downgrade, deletion, repair or reset.
4. Run quick_check(1), set synchronous=FULL and apply pending migrations in one atomic migration transaction. Migration 1 creates the STRICT books table and application marker; user_version is managed by the migration library. Failed first migrations roll back the marker/table/version; failed upgrades preserve earlier data/schema.
5. Check expected books columns and foreign-key integrity, then enable WAL and verify SQLite reports wal. Unsupported locations/errors fail explicitly. Do not silently fall back to MEMORY/OFF journaling or recreate the file.

Identity/schema checks are structural safeguards, not proof that every row meets all domain invariants. No migration checksum/history table is implemented; reviewed SQL files must remain immutable once released. Existing data backups and destructive schema changes require explicit design/testing before future production upgrades.

### What migration 1 enforces

- STRICT column types; required lowercase UUID-v4 identity, primary key and unique nullable cover references.
- Nonempty title of at most 200 SQLite Unicode code points, ASCII edge trimming and no embedded NUL.
- Nullable positive INTEGER word targets/goals within JavaScript's safe-integer range.
- Canonical date shape/range plus real calendar date check through SQLite date normalization; leap-year cases are tested.
- Coarse managed-cover reference containment (covers/ prefix; no traversal, extra directory separator, backslash or URI colon).
- UTC timestamp string shape and basic created/updated/completed ordering.

SQLite may coerce numeric text even in STRICT tables. Native repository 2.3 additionally enforces NFC/Unicode trimming and controls, complete dates/timestamps and DTO constraints. Cover references are checked structurally; actual file content, physical containment and ownership remain the importer boundary in 2.7. The TypeScript validator is not a substitute. No frontend book write operations are exposed yet.

### Durability and test evidence

Foreign keys, WAL, FULL synchronous and timeout settings are verified by native tests; WAL is persistent and foreign-key settings must be reapplied for each connection. Never copy just a live .sqlite3 file as a backup: uncheckpointed data may be in -wal. Consistent snapshot/restore remains milestone 7. Normal connection close lets SQLite handle WAL lifecycle; application code never manually deletes sidecars.

Ten Rust tests use disposable tempfile directories, never actual application data. They cover fresh/reopened databases, constraints, duplicate titles/unique cover references, effective foreign keys, failed initial/upgrade rollback, preserved data after upgrade and future-version rejection, unchanged foreign/corrupt files and invalid directory errors. Real Tauri startup separately created the empty development database and read-only inspection confirmed version 1, matching marker and WAL. Native CRUD persistence is tested in 2.3; book operations through the desktop UI remain later tasks.

Official references: [rusqlite bundled SQLite](https://docs.rs/rusqlite/0.40.2/rusqlite/), [atomic migrations](https://docs.rs/rusqlite_migration/2.6.0/rusqlite_migration/struct.Migrations.html), [SQLite PRAGMAs](https://www.sqlite.org/pragma.html), [WAL](https://www.sqlite.org/wal.html).

## Native book repository (2.3)

Module: src-tauri/src/books/. Public Rust types: BookRepository, Book, BookDetails, BookError and ValidationIssue. The constructor borrows the native managed connection mutably; callers acquire the existing database mutex. This is a Rust API, not a registered Tauri IPC/SQL interface.

| Method                                   | Behavior                                                                                                                                                                                                                     |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| list()                                   | Return validated books ordered by updated_at DESC, then id ASC for stable ties. Invalid rows cause an error; they are never silently skipped.                                                                                |
| get(id)                                  | Require a canonical lowercase UUID-v4 ID; return a validated snapshot or NotFound.                                                                                                                                           |
| create(details)                          | Normalize/validate metadata, generate UUID-v4 and canonical UTC milliseconds, insert/read back within an IMMEDIATE transaction, return only after commit. Cover/completion start null.                                       |
| update(id, expected_updated_at, details) | Full replacement of the four editable metadata fields. Check the current token in an IMMEDIATE transaction, update with bound parameters, read/validate and commit. Preserve identity, createdAt, coverPath and completedAt. |
| delete(id, expected_updated_at)          | Internal deletion of an uncovered book, guarded by the loaded snapshot token and committed transaction. UI confirmation is mandatory when this becomes a user operation in 2.6.                                              |

### Validation and JSON contract

Book serializes camelCase keys matching the TypeScript Book shape. BookDetails deserializes camelCase metadata and rejects unknown fields, wrong types, fractional counts and attempts to pass system-owned fields. Missing Option fields become null equivalents. Native business validation returns field/code issues matching the frontend for representable metadata; shared tests/fixtures/book-details.json examples exercise both implementations. Invalid JSON/types fail decoding before repository calls; the UI command adapter is not implemented yet.

Unicode normalization uses unicode-normalization; the edge whitespace set intentionally matches ECMAScript trim (BOM is trimmed; NEL remains a rejected control). Count code points, not UTF-8 bytes/UTF-16 units. Chrono validates actual dates and canonical UTC millisecond instants; offset timestamps, alternate precision, year zero and leap seconds are not accepted as stored tokens. UUID uses an established generator/parser rather than a custom regex.

On reads, metadata must already be canonical: malformed/non-NFC/nontrimmed rows, invalid timestamps/order and malformed cover references produce InvalidStoredData. Reads never rewrite or remove them. A list does not claim success after dropping invalid rows. Completion must fall between creation and last update.

Native cover reference shape is covers/<canonical-uuid-v4>.(png|jpg|jpeg|webp), lowercase extension. This validates the reference only, not whether a file exists or is a safe image. Cover import/removal remains 2.7. Because safe filesystem cleanup is absent, delete returns CoverCleanupRequired for a covered book and leaves row/file intact. This guard must be extended with the confirmed deletion/cleanup workflow before covered-book deletion is offered.

### Concurrency, durability and failures

Every write uses bound parameters and an IMMEDIATE SQLite transaction. SQL structure is fixed; titles/IDs/dates never become SQL text. Snapshots return only after commit succeeds. Invalid writes, SQL failures and stale-token conflicts leave previous data unchanged. No migration or real user-library modification was needed for this repository task.

Update/delete require the exact previously loaded updatedAt. A different token returns Conflict, including when another connection/process committed the newer change. Updated timestamps are max(current UTC time, previous updatedAt + 1ms), so a same-millisecond edit or backward system clock cannot reuse the token. Overflow beyond year 9999 fails without writing. The timestamp is a concurrency token as well as a display instant; it is not proof that the OS clock is correct.

Errors are explicit: Validation, NotFound, Conflict, InvalidStoredData, CoverCleanupRequired, ClockOutOfRange and Database. A future Tauri adapter must map these to localized errors, handle mutex failures and run blocking database work off the UI thread. No arbitrary SQL access or real deletion command is exposed to JavaScript now.

Fifteen repository/contract tests plus the ten SQLite bootstrap tests pass. They use disposable databases and verify CRUD/reopen, guarded deletion, SQL-injection-like title literals, failed-write rollback, two-connection conflicts, stable ordering/monotonic timestamps, preserved system fields, invalid stored data and camelCase serialization. Shared metadata examples also run under Vitest. Failure injection tests cover SQLite statement failures, not every physical disk/power-loss scenario.

## Proposed activity rules

Count positive net word changes per committed edit batch as credited writing, including paste; record deletions separately without subtracting previously credited activity. Same-length substitutions and formatting earn zero. Repeated deletion/retyping can earn credit; these are encouraging habit metrics, not fraud-proof measures. Imports/restores earn no activity. Document this policy to users and test it before release.

Capture local day and timezone at edit time, splitting activity across midnight rather than assigning all edits to the eventual save time. Stable operation IDs prevent retries from duplicating credit. Current manuscript length is separate from historical activity. Retain historical aggregates when a chapter/book is removed, following the book deletion contract above; implement and test the final activity schema/cleanup mechanics in 2.6 and 5.1.

Define scheduled-day completion as reaching that day's applicable daily goal; unscheduled days do not break scheduled streaks. Finalize current-streak grace rules and test boundaries in milestone 5. Achievements unlock once and remain unlocked.

## Backup and restore direction

Use a consistent SQLite snapshot plus managed covers and a versioned manifest with integrity checks. Do not copy a live database blindly. Validate schema, paths, file checksums and compatibility before restore; create a safety backup, stage restored data and provide rollback. Test interrupted restore and corrupted input in milestone 7. Export should provide portable text without counting as new writing.
