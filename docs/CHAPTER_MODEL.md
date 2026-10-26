# Chapter model, repository and editor (3.1–3.4)

Implemented: readonly TypeScript contracts and pure metadata/content validation under src/features/editor, native chapter repository/validation under src-tauri/src/chapters, migration 003, registered Tauri commands and src/services/chapters.ts. Task 3.3 connects selected-book chapter management UI for creation, renaming and confirmed deletion. Task 3.4 integrates Tiptap 3.32.0 with manual content saving and close protection; word counting and autosave remain pending. See [Tiptap integration](TIPTAP_INTEGRATION.md).

## Ownership and snapshots

ChapterDetails contains only title. ChapterSummary adds persistence-owned id/bookId/position/wordCount/revision/createdAt/updatedAt. Chapter adds the versioned content envelope. UUID-v4 IDs and UTC millisecond timestamps follow the native book conventions. Chapter ownership never changes through metadata/content edits. Duplicate titles are allowed; identity always uses IDs.

Titles trim and normalize NFC, reject controls/unpaired surrogates, and require 1–200 Unicode code points. The metadata validator returns only title, excluding copied system/content properties. It returns field/code issues rather than English UI messages. Snapshot types are compile-time contracts, not proof that native/IPC data is valid; native validation must mirror them before persistence.

## Versioned content

The envelope is `{schemaVersion: 1, document: <Tiptap JSON>}`. The version belongs to the application's persisted content schema, not a Tiptap package version. Current writes accept version 1 only. Unknown versions/fields/nodes/attributes/marks are rejected without stripping, downgrading or replacing the document. A read failure must preserve stored bytes and block editing; never feed unsupported content into an editor that silently drops it.

| Node        | Content/attributes                                                                    |
| ----------- | ------------------------------------------------------------------------------------- |
| doc         | One or more supported blocks; top-level only                                          |
| paragraph   | Optional inline array; omission or [] represents empty text                           |
| heading     | level 1–6; optional inline array                                                      |
| bulletList  | One or more listItem nodes                                                            |
| orderedList | Positive safe-integer start; optional type null/1/a/A/i/I; one or more listItem nodes |
| listItem    | Leading paragraph, followed by zero or more supported blocks (including nested lists) |
| text        | Nonempty, well-formed Unicode string; optional distinct bold/italic marks             |
| hardBreak   | No text/content; optional distinct bold/italic marks                                  |

Only these attributes/marks are allowed. Links, media, arbitrary HTML nodes, code blocks, styles, embeds and other extensions require an explicit future content-schema decision. Literal `<tag>` strings inside text are ordinary writing, not HTML to execute. The installed Tiptap 3.32.0 configuration matches this heading/list grammar; real Editor/JSON roundtrips and unsupported-node rejection are verified in 3.4.

Body text is never trimmed, NFC-normalized, interpreted as HTML or silently sanitized; whitespace/decomposed Unicode are preserved. Successful validation returns a detached JSON copy. Invalid JS-only shapes (cycles, sparse arrays, accessors, custom serialization) are refused rather than being serialized with lost fields. Validation limits are 5 MiB serialized UTF-8 per envelope, 100,000 nodes, depth 64 with doc at depth 1. Text/node/depth checks precede serialization to bound repeated/recursive input. Exceeding limits is a visible failure, never truncation. Native decoding must additionally bound IPC/raw bytes before parsing in 3.2.

createEmptyChapterContent returns a new doc containing one empty paragraph for each newly created chapter. It is a creation default, never a recovery fallback for missing/corrupt saved content.

## Ordering and concurrency

Position is a contiguous zero-based integer within one book. Native list order is position ascending; `(book_id, position)` must be unique. Creation appends to a validated ordered list. Deletion closes its gap. Reordering takes the full prior ordered vector of `{id, revision}` plus the desired complete chapter-ID permutation, scoped to one book. Under one IMMEDIATE transaction, the native repository must compare membership/order/revisions, reject stale/new/missing/duplicate/cross-book IDs, apply collision-free positions and commit atomically. Temporary positions must remain within valid integer bounds; overflow fails without changes. Reads must report invalid stored order rather than silently rewriting it.

Revision starts at 1 and increments on every committed chapter change: metadata, content or position. Rename/content update/delete require expectedRevision; a stale value returns Conflict without overwriting content or other fields. Changed positions advance affected chapters' revisions/timestamps, so old autosave/reorder snapshots fail safely. Unchanged reorder is a no-op. Revision overflow beyond the safe-integer maximum must fail, never wrap/reuse. Native updatedAt advances monotonically as with books, but revision is the chapter concurrency token.

ChapterMetadataChange and ChapterContentChange separate title and content writes; neither can replace ownership/order/count/system fields. Native-generated IDs/timestamps/revisions/counts are never accepted by spreading a client snapshot. Chapter writes do not modify parent Book metadata or use Book.updatedAt as their concurrency token. Autosave serialization, navigation flush and conflict UI remain 3.6/3.8/3.9; no zero-loss recovery promise is made by this model.

## Implemented storage mapping (3.2, schema v3)

| Snapshot field        | SQLite storage/constraint                                                       |
| --------------------- | ------------------------------------------------------------------------------- |
| id                    | TEXT UUID-v4 primary key                                                        |
| bookId                | book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE                    |
| title                 | title TEXT NOT NULL; native Unicode normalization/control/length validation     |
| position              | position INTEGER NOT NULL, 0 through MAX_SAFE_INTEGER; unique with book_id      |
| content.schemaVersion | content_schema_version INTEGER NOT NULL; supported version checked natively     |
| content.document      | content_json TEXT NOT NULL; valid JSON plus authoritative structural validation |
| wordCount             | word_count INTEGER NULL or nonnegative safe integer                             |
| revision              | revision INTEGER NOT NULL, 1 through MAX_SAFE_INTEGER                           |
| createdAt/updatedAt   | UTC millisecond TEXT, valid instants, updatedAt >= createdAt                    |

Append-only migration 003 creates the STRICT chapters table and unique book/position index; released migrations 001/002 remain unchanged. All related changes use bound parameters and atomic transactions, returning success only after commit. Book/chapter confirmed deletion removes owned chapter rows; future activity retains history with detached references, and achievements remain. Restore/import must validate content versions/order/revisions before exposing editable writing.

wordCount is derived from committed body content, not supplied by the caller or copied from title/targets/activity. Null means not computed for that content revision. A newly created canonical empty chapter may have known zero; content writes before the counter exists must invalidate stale counts to null. Rename/reorder preserve counts. Native counting is 3.7 and book aggregation is 4.1: one unknown chapter count makes the aggregate unknown, not a partial sum; a validated empty chapter collection can establish zero. Do not infer completion from these counts.

## Native API and validation (3.2)

UI integration (3.3): ChapterManager renders a book-scoped ordered collection with loading/error/empty states and guarded asynchronous reads. ChapterTitleDialog validates title metadata and keeps a session-local draft across dismissal/section navigation. Rename conflicts require explicit latest-revision loading while retaining the draft. DeleteChapter displays the snapshot title, starts with safe Cancel focus and requires explicit acknowledgement; conflicts require latest details and a new acknowledgement. No success appears before the service resolves. Create/rename reconcile the collection afterward, preserving committed rows on follow-up read failure; delete applies the native remaining collection. Mutations are serialized and blocked until successful list loading. Invalid stored content prevents management instead of being silently repaired. Drafts are not durable across changing to a different book or restarting. The body service is connected in 3.4; reordering controls remain pending.

ChapterRepository borrows the managed SQLite connection. list/get use read transactions for a consistent snapshot; create/rename/save_content/delete/reorder use IMMEDIATE transactions. All operations are scoped to an existing canonical book ID; get and mutations also require the chapter ID. list returns ordered summaries without shipping manuscript bodies over IPC, but validates each stored document before exposing the collection. Invalid content/order blocks operations for that book without filtering or repair. get returns a full chapter. Deletion returns the remaining ordered summaries with updated position revisions; reorder returns the complete committed summary collection. Parent metadata/timestamps remain unchanged.

Native content decoding uses strict Serde DTOs and the same schema/grammar/limits as the frontend. save_chapter_content transports contentJson as a string containing the envelope: the repository checks its UTF-8 byte size and lexical nesting before decoding it. A lexical ceiling of 196 safely contains the schema's 64-node depth (objects plus arrays/attributes), then structural validation enforces depth 64 and 100,000 nodes. serde_json's unbounded_depth feature permits valid depth-64 documents beyond its default parser nesting threshold; the explicit prior bound remains active. Tauri has already decoded/allocated the outer IPC string; this is a manuscript-decoding limit, not a global WebView transport memory cap. Reads bound stored JSON before allocation/decoding. Unsupported versions, invalid Unicode/JSON, unknown fields and invalid nodes fail without writing. Native serialization may omit optional empty arrays/null list type; writing text, marks and list/heading semantics are preserved.

Registered commands: list_chapters(bookId), get_chapter(bookId, id), create_chapter(bookId, details), rename_chapter(bookId, id, expectedRevision, details), save_chapter_content(bookId, id, expectedRevision, contentJson), delete_chapter(bookId, id, expectedRevision, confirmed), reorder_chapters(bookId, expected, chapterIds). Blocking SQLite work runs off the UI thread behind the managed mutex. False delete confirmation is rejected. Errors expose stable codes validation (with a reason code), not_found, conflict, invalid_stored_data, limit_reached, confirmation_required or persistence; raw SQL/native messages are not returned. The frontend service refuses browser persistence and validates/copies content before encoding; native validation remains authoritative. Chapter management calls list/get/create/rename/delete in 3.3; save_content is connected to Tiptap manual saving in 3.4; reorder remains unused by UI.

## Validation evidence and limits

Pure tests cover Unicode titles/body preservation, fresh empty defaults, supported grammar, unsupported versions/fields/marks/placement, list rules, cycles/sparse/custom-serialization inputs, serialized UTF-8/JSON overhead, node count and depth bounds. Shared chapter-content.json fixtures exercise native/TypeScript acceptance for 21 valid/invalid documents. Disposable native databases additionally verify CRUD/reopen, title/body separation, count invalidation, ownership/cascade, SQL constraints, full-order permutation checks, unchanged reorder, stale snapshots across two connections, revision overflow, SQL and deferred-commit rollback, corrupt/unsupported stored content and v1/v2 migration retention. Checks recorded for 3.2: 53 native tests and 238 frontend tests, Cargo fmt/Clippy, lint/format/typecheck/build. No new desktop launch, real Tiptap roundtrip, chapter UI/autosave or power-loss recovery was tested in 3.2. Desktop book/cover restart evidence remains the historical 2.12 run; its reusable runner now expects schema 3.

Implementation references: [rusqlite 0.40.2 transactions](https://docs.rs/rusqlite/0.40.2/rusqlite/struct.Transaction.html), [Serde JSON decoding](https://docs.rs/serde_json/latest/serde_json/fn.from_str.html). serde_json was already locked/cached; it is now a production dependency with unbounded_depth, with no new package/version or lockfile change.

Official references consulted: [Tiptap JSON output](https://tiptap.dev/docs/guides/output-json-html), [Document extension](https://tiptap.dev/docs/editor/extensions/nodes/document), [Heading](https://tiptap.dev/docs/editor/extensions/nodes/heading), [list-item source](https://github.com/ueberdosis/tiptap/blob/main/packages/extension-list/src/item/list-item.ts), [ordered-list source](https://github.com/ueberdosis/tiptap/blob/main/packages/extension-list/src/ordered-list/ordered-list.ts). These references informed model task 3.1. Installed-version checks, React compatibility and integration evidence for 3.4 are recorded in [TIPTAP_INTEGRATION.md](TIPTAP_INTEGRATION.md).
