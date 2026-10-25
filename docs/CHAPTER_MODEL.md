# Chapter model (3.1)

Implemented: readonly TypeScript contracts and pure metadata/content validation under src/features/editor. No chapter repository, SQL migration, IPC, UI, word counter or Tiptap dependency exists yet. Runtime remains the read-only selected-book context. Native persistence/authoritative validation is the next approved task, 3.2.

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

Only these attributes/marks are allowed. Links, media, arbitrary HTML nodes, code blocks, styles, embeds and other extensions require an explicit future content-schema decision. Literal `<tag>` strings inside text are ordinary writing, not HTML to execute. Default heading/list grammar follows the planned Tiptap extensions; 3.4 must configure installed extensions to match this subset and verify compatibility before use.

Body text is never trimmed, NFC-normalized, interpreted as HTML or silently sanitized; whitespace/decomposed Unicode are preserved. Successful validation returns a detached JSON copy. Invalid JS-only shapes (cycles, sparse arrays, accessors, custom serialization) are refused rather than being serialized with lost fields. Validation limits are 5 MiB serialized UTF-8 per envelope, 100,000 nodes, depth 64 with doc at depth 1. Text/node/depth checks precede serialization to bound repeated/recursive input. Exceeding limits is a visible failure, never truncation. Native decoding must additionally bound IPC/raw bytes before parsing in 3.2.

createEmptyChapterContent returns a new doc containing one empty paragraph for each newly created chapter. It is a creation default, never a recovery fallback for missing/corrupt saved content.

## Ordering and concurrency

Position is a contiguous zero-based integer within one book. Native list order is position ascending; `(book_id, position)` must be unique. Creation appends to a validated ordered list. Deletion closes its gap. Reordering takes the full prior ordered vector of `{id, revision}` plus the desired complete chapter-ID permutation, scoped to one book. Under one IMMEDIATE transaction, the native repository must compare membership/order/revisions, reject stale/new/missing/duplicate/cross-book IDs, apply collision-free positions and commit atomically. Temporary positions must remain within valid integer bounds; overflow fails without changes. Reads must report invalid stored order rather than silently rewriting it.

Revision starts at 1 and increments on every committed chapter change: metadata, content or position. Rename/content update/delete require expectedRevision; a stale value returns Conflict without overwriting content or other fields. Changed positions advance affected chapters' revisions/timestamps, so old autosave/reorder snapshots fail safely. Unchanged reorder is a no-op. Revision overflow beyond the safe-integer maximum must fail, never wrap/reuse. Native updatedAt advances monotonically as with books, but revision is the chapter concurrency token.

ChapterMetadataChange and ChapterContentChange separate title and content writes; neither can replace ownership/order/count/system fields. Native-generated IDs/timestamps/revisions/counts are never accepted by spreading a client snapshot. Chapter writes do not modify parent Book metadata or use Book.updatedAt as their concurrency token. Autosave serialization, navigation flush and conflict UI remain 3.6/3.8/3.9; no zero-loss recovery promise is made by this model.

## Planned storage mapping (3.2, not migrated yet)

| Snapshot field        | Future SQLite storage/constraint                                                |
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

Use a new append-only migration; do not change released migrations 001/002. No chapter table is created in 3.1. All related changes use bound parameters and atomic transactions, returning success only after commit. Book/chapter confirmed deletion removes owned chapter rows; future activity retains history with detached references, and achievements remain. Restore/import must validate content versions/order/revisions before exposing editable writing.

wordCount is derived from committed body content, not supplied by the caller or copied from title/targets/activity. Null means not computed for that content revision. A newly created canonical empty chapter may have known zero; content writes before the counter exists must invalidate stale counts to null. Rename/reorder preserve counts. Native counting is 3.7 and book aggregation is 4.1: one unknown chapter count makes the aggregate unknown, not a partial sum; a validated empty chapter collection can establish zero. Do not infer completion from these counts.

## Validation evidence and limits

Pure tests cover Unicode titles/body preservation, fresh empty defaults, supported grammar, unsupported versions/fields/marks/placement, list rules, cycles/sparse/custom-serialization inputs, serialized UTF-8/JSON overhead, node count and depth bounds. These are not native database, real Tiptap roundtrip, reorder transaction or desktop/editor tests; those remain 3.2 onward.

Official references consulted: [Tiptap JSON output](https://tiptap.dev/docs/guides/output-json-html), [Document extension](https://tiptap.dev/docs/editor/extensions/nodes/document), [Heading](https://tiptap.dev/docs/editor/extensions/nodes/heading), [list-item source](https://github.com/ueberdosis/tiptap/blob/main/packages/extension-list/src/item/list-item.ts), [ordered-list source](https://github.com/ueberdosis/tiptap/blob/main/packages/extension-list/src/ordered-list/ordered-list.ts). Integration must recheck the installed version in 3.4; no dependency was installed here.
