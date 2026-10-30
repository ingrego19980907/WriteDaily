# Whole-book export (7.2)

Open a book in Writing Editor and choose **Export book** beside Back to library. Native Save As creates one new `.txt` file containing the saved book title and every chapter in manuscript order. The action is disabled until the chapter list loads successfully and while another operation is pending. A book without chapters explains that a chapter must be created first; an existing empty chapter is included.

## Snapshot and content

`export_book(bookId, expectedBookUpdatedAt, expectedChapters, labels)` accepts IDs, an ordered ID/revision manifest, the book metadata timestamp and centralized picker labels. JavaScript supplies neither manuscript content nor a destination path. Rust validates the source in one SQLite read transaction: book metadata, chapter membership, positions, revisions and bodies belong to the same committed snapshot. Missing, stale, reordered, added, deleted or unsupported sources fail before Save As. No chapter may be silently omitted. After capture, the frozen snapshot is independent of later changes or deletion while the picker is open; no database lock or transaction spans that picker or external IO.

The UTF-8 file has no BOM and uses generated LF line breaks. It starts with the book title and a blank line. Each chapter contributes its title, a blank line, the existing plain-text body and a final newline; two additional newlines separate chapter sections. Duplicate titles and empty chapters remain present. The existing [chapter serializer](CHAPTER_EXPORT.md#content-contract) retains readable paragraphs, headings, page boundaries, lists, literal markup-like text and Unicode. Plain text does not carry cover images, typography or rich formatting. Unsaved editor drafts are not exported or discarded; explicitly save/close writing before exporting its latest edits.

Validated chapters stream through the existing repository decoder one at a time rather than retaining every document. Whole-book output is bounded to **64 MiB of UTF-8 bytes and 10,000 chapters**. Exceeding either limit refuses the complete export with guidance to export chapters separately; no truncated output is offered. The [portable-text contract](PORTABLE_TEXT_EXPORT.md) is verified in task 7.3.

## File and data safety

Book and chapter export share the native picker, one-export gate, safe filename handling and staged/synced `persist_noclobber` writer. Existing files are never replaced, including when the operating system picker offers replacement. Choose a new filename after a collision. Normal write failures clean staging files; forced termination can leave an unpromoted temporary file. Power-loss durability is not claimed. See [shared file safety](CHAPTER_EXPORT.md#native-boundary-and-file-safety).

Cancellation returns only `status: cancelled`. A completed write returns `status: exported`, the basename, confirmed book timestamp and ordered ID/revision manifest. The service validates the entire response before reporting success. Errors expose no raw path; a lost reply asks the user to check the destination and retry with a new name. No generic JavaScript filesystem permission or browser mock download is added.

Export is read-only with respect to the library: book metadata, chapter content/counts/revisions, activity, achievements and notification receipts remain unchanged. Legacy unknown word counts stay unknown. There is no SQL migration, export history or dependency change in 7.2; SQLite remains schema v8.

## Verification

Nine native book tests cover reordered and duplicate-title chapters, empty bodies, Unicode, other-book isolation, invalid/stale membership/order/revisions/metadata, corrupt content, frozen snapshots after deletion, collisions, legacy unknown counts, concurrent committed/uncommitted connections and UTF-8 bounds. Existing chapter serialization/writer tests remain in force.

Fifteen additional service cases and twelve component cases cover the allowlisted manifest, mutation during pending IPC, malformed confirmations, keyboard/pending states, cancellation, retry, error mapping and late unmounts. Six additional Edge scenarios cover 320/1100px, keyboard reorder, 200% text reflow, axe, forced colors, empty books, retries and conflict/reload.

After the README Cargo PATH setup, run `npm.cmd run test:desktop:export -- --book` for the isolated real Windows scenario. It creates three chapters through the native API, saves text through the real editor, reorders chapters, cancels Save As, checks exact whole-book bytes, exercises individual chapter export, restarts the process and exports the same book again. Table snapshots must remain identical across export; outputs and app data stay under ignored `.cache/desktop-restart`. The helper controls only its owned test process/dialog and the harness restores the ordinary debug build.

Final counts and the successful desktop report are recorded in [TASKS.md](TASKS.md#verification-evidence-72). No actual user library, installer, macOS, manual screen-reader or large-manuscript performance benchmark is claimed.
