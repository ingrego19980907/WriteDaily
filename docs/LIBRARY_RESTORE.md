# Library restore (7.5)

Choose **Restore library** beside Back up library at the bottom of My Library. Choose a WriteDaily `.zip` backup with the native file picker. The app validates and privately stages it, then shows its filename, capture time and actual book/chapter/cover counts. Selection alone does not change the current library. Cancel closes the preview and removes its private staging files.

Restore replaces the **entire saved library**, rather than merging books. Save writing first and close other WriteDaily instances. Read the replacement warning and check the acknowledgement before choosing Restore library. The native command independently requires confirmation and the matching opaque preview token.

Before replacement, WriteDaily creates an automatic safety ZIP of the current committed library. If that capture fails, replacement does not begin. After confirmed success, choose **Close WriteDaily**, then open the app again. The old window cannot read or write through its cached database handle. A lost reply is checked against native restore state; uncertain recovery offers closing rather than a potentially unsafe retry.

## Supported input and staging

This accepts the [7.4 backup format](LIBRARY_BACKUP.md): format v1, Stored/unencrypted ZIP entries, WDAY identity and the current schema v8. It does not import TXT, arbitrary SQLite files, older/newer schema versions or compressed archives. Unsupported input leaves the current library intact; there is no automatic migration of untrusted input.

The parser checks exact member names/membership, duplicate entries, UTF-8 names, file kinds, manifest fields/counts/versions, sizes, CRC and SHA-256. Only the fixed database filename and validated managed-cover references can be written, using new files under private staging. It never calls general-purpose ZIP extraction. Traversal, extra entries, symlinks, encryption and unsupported compression are refused.

The database is opened read-only with trusted schema disabled. Every `sqlite_schema` object must match the schema built from the trusted migrations, including automatic indexes; SQL line endings alone are normalized. Identity, version, integrity and foreign keys are checked. Existing domain readers validate books, ordered chapters and rich JSON, preferences, schedule and unlocks. Manifest counts and exact referenced-cover membership must agree; every cover is decoded/validated by CoverStore. Payload hashes are checked again before apply. These are mandatory restore checks; the broader integrity matrix and recovery coverage review remain tasks 7.6 and 7.7.

Bounds match backup creation: 4 GiB database, 8 GiB total payload, 100,000 payload files, 32 MiB manifest and existing managed-cover limits. The physical archive is additionally bounded to 9 GiB. Refusal never truncates data. Multiple staged copies and safety/history retention need free disk space; large-library performance has not been measured. SHA-256 detects corruption, not authenticity.

## Database coordination and replacement

`database/handle.rs` owns the live connection and a cooperative OS file lease on `write-daily.lock`. Ordinary instances hold shared leases. Restore requires an exclusive lease, raises a maintenance fence and takes the connection mutex. Already queued commands check the fence again after taking the mutex, so stale requests cannot write into the restored library. Another running instance causes refusal; direct external tools do not participate in this protocol.

The staged database undergoes normal achievement reconciliation before installation. Imported historical unlocks receive missing silent notification baselines; existing receipts and claim timestamps are preserved. Restoring never earns activity. Manuscript JSON, revisions, saved counts (including legacy NULL unknowns), activity and goal/schedule history remain persisted facts. Normal startup can reconcile eligible unlocks and process unreferenced cover-cleanup intents as usual.

While exclusive access is held, the existing backup implementation captures the current database and exact covers into `safety.zip`. SQLite checkpoints the live WAL and closes its connection before replacement. Busy checkpoints, remaining sidecars or close failures refuse the swap. The app never manually deletes SQLite sidecars.

Files are retained under the library's application-data directory:

```text
restore-history/<preview-token>/
  safety.zip       # valid backup of the previous committed library
  previous/        # previous database and covers, parked during replacement
  incoming/        # private staged replacement, emptied by a successful swap
  failed/          # replacement files parked during rollback, when needed
restore-journal.json
write-daily.lock
```

Apply attempts are retained; there is no automatic history deletion. `safety.zip` can itself be chosen through the restore flow to recover the previous saved library. Do not replace a live database manually. Private, unapplied previews live in `restore-work` and are removed on normal cancellation; a forced process stop may leave temporary files.

A synced journal records the transaction before the database/cover pair is moved, then records the committed replacement. Startup recovery runs under the exclusive lease before opening SQLite or cleaning covers. An incomplete prepared swap restores the previous pair; a committed swap keeps the installed pair. Recovery is repeatable across intermediate move boundaries. Invalid journals, failed recovery or missing files with restore history refuse startup rather than initialize a blank library. Old files and the safety ZIP are retained. Journal/file syncing and process-interruption recovery do not establish power-loss durability for directory changes.

## Boundaries and dependencies

`restores/archive.rs` owns bounded parsing/staging/domain checks, `restores/swap.rs` owns safety capture/journal/recovery, and `restore_commands.rs` exposes only prepare/cancel/apply/status/close operations through the shared export gate. JavaScript provides centralized picker labels, a token and confirmation, never a library or extraction path. The service allowlists preview fields and safe errors. No filesystem permission, dependency, migration, browser persistence or editor behavior is added.

File locking uses the standard library's [File locking API](https://doc.rust-lang.org/std/fs/struct.File.html), stable since Rust 1.89, below the documented project floor of 1.95. Verification uses Rust 1.99.1 MSVC and the existing locked dependencies.

## Verification and limits

Twelve added native cases cover exact all-table/cover/rich-text roundtrips, restoring the automatic safety ZIP, unknown counts, notification baselines, cancellation, competing instances, failed safety capture, invalid paths/checksums/counts/versions/schema objects, malformed recovery state and every intermediate swap boundary. A real Windows directory handle denies a cover-directory rename after the old database has moved; rollback reopens the unchanged original library. Native tests use disposable databases only.

Twenty-seven service and twelve component cases cover allowlisted previews, malformed replies, confirmation, cancellation, pending/duplicate actions, errors, retry, lost replies, uncertain status and terminal focus. Eight Edge cases cover keyboard operation, 320/1100px, 200% text, long Cyrillic filenames, axe, forced colors and failure paths. Browser fixtures are isolated test responses, not product persistence.

Run `npm.cmd run test:desktop:restore` after the README Cargo PATH setup for the private Windows/WebView2 scenario. It uses real Open/Save As dialogs, verifies cancellation and native refusal without confirmation, replaces one saved library with another, inspects the automatic safety ZIP, rejects a stale write, closes via the real button and launches a new process. Exact table rows, cover hashes and formatted editor content survive reopening, without historical notification replay; the selected ZIP remains unchanged. The runner restores the ordinary debug build.

Successful native report: `.cache/desktop-restart/run-rEwKAg/report.json` (`passed` and `restoredDefaultBuild` true); inspected capture: `.cache/desktop-restart/run-rEwKAg/library-restore-native.png`. The first harness attempt exposed a test-only Playwright error-transport assertion; checking the native error code inside the page fixed it before the successful repeat.

Final checks passed: **193 Rust tests, 1049 Vitest tests (74 files), 246 Edge scenarios**, lint, Prettier, strict TypeScript, production/native debug builds, Cargo fmt/Clippy and diff validation. The first full browser run had two existing case failures; unchanged focused reruns and the final complete run passed. Detailed command results are recorded in [TASKS.md](TASKS.md#verification-evidence-75). No actual user library, manual screen reader, macOS, installer, large-library performance or power-loss test is claimed. Tasks 7.6 and 7.7 remain separate approvals.
