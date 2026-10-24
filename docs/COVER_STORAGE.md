# Managed cover storage (2.7)

After creating a book, use its Cover image picker and Save cover action in My Library. Replacement/removal are separate commits from metadata creation/editing. Failed cover operations leave the current book/cover intact. Book cards/default-cover artwork remain task 2.8.

Native import accepts PNG, JPEG and WebP by decoded content, never filename/MIME alone. Input limit: 5 MiB, 4096 pixels per dimension, requested decoder allocation limit 128 MiB (best effort). The decoded static frame becomes RGBA8 PNG at most 1200 × 1600, without upscaling; stored output is capped at 8 MiB. Animated sources use the decoded static frame. EXIF orientation/color-profile fidelity is not promised.

Files live at `<app_data_dir>/covers/<generated-uuid-v4>.png`, under development for debug as with SQLite. SQLite stores only the relative reference. Two books importing the same source own independent files. Source files are never modified or deleted and may be moved after import. IPC accepts selected bytes, not arbitrary filesystem paths. Preview reads require book ID and expected current cover reference and return bounded, validated managed PNG bytes. Runtime data URLs are display-only, never persisted.

Migration 002 adds pending_cover_cleanup; migration 001 is unchanged. Before creating a file, import durably queues its generated reference. An IMMEDIATE transaction verifies registration still exists, checks the loaded book revision, creates/writes/syncs the file exclusively, updates the book reference/timestamp, enqueues the old reference and removes the new reference from the queue. Failure preserves the old book/cover and allows cleanup of a partial new file. If another process cleaned registration before this transaction, import fails before writing.

Removal and confirmed book deletion queue old paths in the same transaction as their database change. Cleanup follows commit and retries at startup/cover operations. Under an IMMEDIATE transaction, it checks queued paths are unreferenced and removes only validated managed files. Missing files count as cleaned. Directories, symlinks, Windows reparse points/junctions and malformed references are refused. No scan deletes unrelated files. Failures retain queue entries. IPC returns cleanupPending separately; a committed change/deletion remains successful and the UI explains deferred cleanup.

Disposable tests verify image validation, size/dimension bounds, downscaling, independent ownership/source removal, database/file reopen retention, replacement/removal, covered deletion, rollback/conflict, interrupted cleanup/retry, invalid paths and Windows junction protection. Browser tests use isolated IPC responses, not SQLite. No actual library was changed; actual desktop restart acceptance remains 2.12.

Checks cover normal app storage and static path substitution, not a malicious local process racing filesystem changes. They do not establish power-loss durability on every filesystem or a hard whole-process memory ceiling. Uncertain targets remain queued rather than being deleted.

References: [image 0.25.10](https://docs.rs/image/0.25.10/image/) (Rust 1.88 minimum, compatible with project 1.95; only png/jpeg/webp features), [ImageReader](https://docs.rs/image/0.25.10/image/struct.ImageReader.html), [decoder limits](https://docs.rs/image/0.25.10/image/struct.Limits.html).
