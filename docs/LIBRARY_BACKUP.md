# Library backup (7.4)

Choose **Back up library** in the Library backup card at the bottom of My Library. After preparing and checking a saved snapshot, the app opens native Save As for a new `.zip` file. Empty libraries are supported. Search, filters and view mode do not limit the backup: it always captures the whole persisted library.

The archive includes books, rich chapter JSON/order/counts/revisions, goals and schedule history, activity/operation receipts/day plans, achievements/notification receipts, editor preferences and every referenced managed cover. It excludes unsaved drafts, session-only navigation/search state, unrelated files, unreferenced cover files and live SQLite sidecars. Save writing before starting. Backup does not save/discard drafts, award activity, reconcile achievements or clean source files.

## Consistent capture

`backups.rs` takes the existing database mutex and a source `BEGIN IMMEDIATE` reservation. A separate read-only SQLite connection uses the online backup API to produce a standalone database file; this includes committed WAL content. The separate handle avoids calling backup on the handle owning the write transaction, which SQLite reports as locked. This follows the [SQLite backup API locking contract](https://www.sqlite.org/c3ref/backup_finish.html).

While that reservation remains held, the copied database determines cover membership and the existing CoverStore validates/copies the exact stored bytes. Cooperative app writers and cover cleanup cannot publish/remove assets during capture. Other saves may wait for this phase; the work runs off the UI thread. Missing, corrupt or unsafe referenced covers refuse the backup instead of being silently omitted or repaired. Unreferenced cleanup intents remain database records; their unreferenced files are not needed by the snapshot.

The snapshot is checked for the WriteDaily application ID, current schema v8, SQLite integrity and foreign-key consistency. Its journal is consolidated to DELETE mode and closed, so the archive needs no `-wal`, `-shm` or journal file. All database tables are copied, preserving opaque manuscript JSON and existing unknown counts. These creation checks are not a full domain validator for arbitrary restore inputs.

The source reservation is rolled back without edits and released before hashing/packing, output verification, the native picker and destination IO. Subsequent source saves, cover changes or deletion cannot change the staged snapshot. Coordination covers application-managed writes; it is not a guarantee against another program directly rewriting managed files outside that protocol.

## Format v1

The ZIP uses Stored entries (no compression or encryption), with ZIP64 support. Members are:

```text
write-daily.sqlite3
covers/<managed-cover-id>.<extension>
manifest.json
```

Only validated managed cover references become relative archive paths. Entries are ordered as database, sorted covers, then manifest. No host directory path is recorded in the manifest or returned to JavaScript.

| Manifest field                                   | Meaning                                                                      |
| ------------------------------------------------ | ---------------------------------------------------------------------------- |
| `format`, `formatVersion`                        | `writedaily-library`, `1`                                                    |
| `applicationVersion`                             | Native application version that created the snapshot                         |
| `createdAt`                                      | Canonical UTC timestamp at capture                                           |
| `databaseSchemaVersion`, `databaseApplicationId` | Captured schema version and WDAY identity marker                             |
| `bookCount`, `chapterCount`, `coverCount`        | Counts from the captured database and its referenced cover set               |
| `files`                                          | Database and cover entries: relative `path`, `byteLength`, lowercase SHA-256 |

The manifest does not hash itself. The creator finishes/syncs its ZIP, reopens it, checks exact membership/order/sizes, reads every payload to verify ZIP CRC/SHA-256 and compares the manifest bytes before presenting Save As. Checksums detect corruption; they do not authenticate an archive. Task 7.5 adds bounded untrusted-input validation and staging for current-format restore; see [restore compatibility](LIBRARY_RESTORE.md). The broader integrity audit remains 7.6.

Bounds are **4 GiB for the database, 8 GiB total payload, 100,000 payload files and a 32 MiB manifest**. Existing managed-cover size/dimension limits still apply. Bounds refuse the operation explicitly, never truncate it. Staged database/covers, a ZIP and the destination staging copy require temporary disk space. Normal success, cancellation and failures clean private staging; forced termination can leave temporary artifacts. No directory/power-loss durability guarantee is claimed.

## Native boundary and destination safety

`create_library_backup(labels)` accepts only bounded centralized dialog/filter copy; there is no caller-supplied library path, destination path or manuscript. It shares the native operation gate with TXT exports. `services/backups.ts` validates cancellation separately from a confirmed `created` result with basename, timestamp and consistent safe-integer counts. No browser download or mock persistence is offered.

After Save As, a new temporary file in the selected folder receives the complete archive and is synced before `persist_noclobber` promotion. Existing files/directories/hard links are kept even if the OS picker offers replacement. The shared destination validator requires an absolute ZIP path with an ordinary basename/existing parent; it rejects device names, alternate streams and the private staging tree. Errors expose no raw paths. An uncertain/lost reply asks the user to check the folder and retry with a new name, never silently replace an earlier backup.

Task 7.5 now implements [library restore](LIBRARY_RESTORE.md), including input validation/staging, automatic safety backup, exclusive application-handle coordination and journaled rollback. It requires explicit replacement acknowledgement and closing/reopening after success. Broader integrity/interruption audits remain 7.6–7.7. Do not treat manually replacing a live WAL database as a supported restore flow. The verification totals below are historical evidence for 7.4.

## Compatibility and verification

The existing rusqlite 0.40.2 enables its built-in `backup` feature. ZIP writing/reading uses pinned `zip` 8.6.0 with default features disabled; its [published manifest](https://docs.rs/crate/zip/8.6.0/source/Cargo.toml) declares Rust 1.88, below the project's 1.95 floor. This implementation was compiled/tested on the documented Rust 1.99.1 MSVC toolchain. Cargo.lock adds ZIP and typed-path; no npm dependency, SQL migration or JavaScript filesystem/dialog grant was added.

Ten native backup tests and one command test verify empty/WAL-backed libraries, every table's saved rows, exact covers, excluded orphans, frozen snapshots, missing/corrupt/unsafe sources, identity/schema/FK refusal, active-writer retry, checksums/bounds, destination collisions/hard links and cleanup. Twenty-two service cases and eleven component cases verify allowlisting, malformed/lost replies, pending/duplicate operations, cancellation, safe errors, keyboard focus and unmounts. Four browser cases cover both widths, 200% text, axe, forced colors, retry and desktop-only behavior.

`npm.cmd run test:desktop:backup` uses the README Cargo PATH setup and existing private Windows restart harness. It saves writing through the real editor, includes a managed cover and actual activity/achievement records, cancels native Save As, creates a ZIP and reads it with .NET ZIP tools. Exact table rows, cover hashes and all member hashes must match. After process restart, it creates/verifies a second archive. Only a fixed DB member is copied to a new private test path for read-only inspection; this is not production restore or a general extractor. The ordinary native debug build is restored afterward.

Final checks: **181 Rust tests, 1010 Vitest tests (72 files), 238 full-run Edge scenarios**, lint, formatting, strict TypeScript, production/native debug builds, Cargo fmt/Clippy and diff checks. Real Windows report: `.cache/desktop-restart/run-Lj8DPz/report.json` (`passed` and `restoredDefaultBuild` true); inspected preview: `.cache/library-backup-preview.png`. No actual user library, manual screen-reader, installer, macOS, large-library performance or power-loss test is claimed. See [task evidence](TASKS.md#verification-evidence-74).
