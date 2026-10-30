# Portable text export (7.3)

Both **Export chapter** and **Export book** use the existing native plain-text serializer and Save As flow. This task completes their portable-text contract and fixes missing indentation after structural hard breaks inside list items. It adds no separate button, file format, IPC command, dependency or database migration.

## File contract

| Property              | Behavior                                                                                                                                        |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Format                | `.txt`, UTF-8 bytes, without an added byte-order mark (BOM)                                                                                     |
| Chapter               | Saved title, blank line, saved body, final LF                                                                                                   |
| Book                  | Saved book title and blank line, followed by every saved chapter in manuscript order; two additional LF characters separate chapter sections    |
| Paragraphs / headings | Blank-line boundaries; every supported heading level retains its text                                                                           |
| Structural hard break | One LF; inside a list, the continuation receives two spaces per nesting level                                                                   |
| Lists                 | `- ` bullets or decimal `n. ` markers; stored start, order and nesting are retained, with two-space nesting and continuation indentation        |
| Ordered presentation  | Alphabetic/Roman styles become decimal markers without changing the stored start or item order                                                  |
| Page breaks           | Blank block boundaries, without paper dimensions or a form-feed character                                                                       |
| Empty blocks          | Kept, including repeated boundaries, empty list items and empty chapters                                                                        |
| Styling               | Bold, italic, underline, font size/family and alignment contribute no markup; adjacent text runs remain joined                                  |
| Literal writing       | Whitespace, tabs, existing CR/LF sequences, nonbreaking spaces, combining characters, emoji/ZWJ sequences and markup-like text remain unchanged |

Generated structural line endings use LF on every platform. Literal line endings inside a saved text node are preserved, including CRLF split across differently marked text runs. The exporter does not trim, normalize Unicode, escape HTML, sanitize writing or use platform-dependent newline conversion. Consequently a source with literal CRLF/CR may produce mixed line endings; this preserves its writing rather than rewriting it. Read the file as UTF-8. Reader-specific font availability, rich layout, A4 pagination and legacy non-UTF-8 decoding are outside the TXT contract.

The existing [chapter snapshot/file-safety contract](CHAPTER_EXPORT.md) and [whole-book contract](BOOK_EXPORT.md) still apply: committed content only, validated source tokens, native-selected destination, cancellation distinct from success and collision-safe new-file writing. Whole-book output remains bounded to 64 MiB / 10,000 chapters. Export neither discards drafts nor changes source JSON, counts, revisions, metadata, activity or achievements. TXT is a readable external artifact, not a restorable library backup; backup/restore remain 7.4–7.7.

## Golden fixtures and verification

The reviewed fixtures under `tests/fixtures/text-export/` pair native input JSON with byte-exact expected TXT. `common` exercises features shared by all six stored document versions; `formatted` covers current formatting, alignment, page breaks, nested lists, Cyrillic, emoji, Arabic and Chinese. A scoped `.gitattributes` entry pins only these expected TXT files to LF, so Windows Git checkout conversion cannot invalidate their byte contract.

Eight new native tests cover those fixtures, all supported versions/headings/list styles, exact large list numbering, leading/repeated hard breaks inside nested items, empty/page boundaries, split Unicode and literal whitespace/line endings. The regression tests failed against the old serializer and passed after the targeted hard-break indentation fix.

The integration test saves real chapter records in a disposable SQLite library, closes/reopens it twice, exports both a chapter and the complete book to Unicode filenames, reads their bytes back and checks exact expected UTF-8 content with no added BOM. It snapshots source and activity/achievement tables, including original JSON, and confirms they remain identical. This is database reopen/file verification, not a new GUI/process-restart or external text-editor session.

Final checks: **170 Rust tests and 977 Vitest tests (70 files)**, lint, strict TypeScript, production/native debug builds, Cargo fmt/Clippy, formatting and diff checks. UI, accessibility/layout and picker behavior are unchanged; the **234-case Edge run and real Windows picker/process-restart evidence belong to 7.2** and were not repeated for this serializer-only task. No real library, installer, macOS runtime, manual screen-reader or power-loss test is claimed. See [task evidence](TASKS.md#verification-evidence-73).
