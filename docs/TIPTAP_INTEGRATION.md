# Tiptap integration (3.4)

Implemented on 2026-10-25, extended with the formatting toolbar on 2026-10-26. Open a book, create a chapter, choose **Edit chapter text**, write/format, then choose **Save chapter text**. Saving is manual. Chapter switching, word counts, autosave and its status UI remain tasks 3.6 onward.

## Formatting toolbar (3.5)

FormattingToolbar composes existing Button controls for bold, italic, paragraph, headings 1–6, bullet/numbered lists and undo/redo. It uses the existing schema/extensions and persistence path without adding dependencies. useEditorState subscribes to selection/transaction changes so active styles/history availability update without requiring parent editor rerenders. Commands use focus chains; pointer activation preserves the current text selection. Tiptap's existing history grouping remains unchanged.

The labelled horizontal toolbar has one Tab stop, remembers the last control and wraps Left/Right Arrow navigation across available buttons; Home/End select the first/last available button. Enter/Space activate native buttons and return focus to writing. Disabled commands are skipped. Paragraph/mark/list/heading controls expose aria-pressed; full visible labels match accessible names. Saving/unready states disable every action, and read-only/destroyed editors reject command execution. The toolbar wraps within the modal at enlarged text; pressed controls have a double-border distinction in forced colors. Copy is centralized under en.writing.

Verification for 3.5: 292 Vitest tests (6 new toolbar cases using a real Editor), 54 Edge tests (4 new toolbar scenarios and a strengthened pending-save check), lint/format/typecheck/build pass. Browser checks cover selected-word marks, all heading levels, paragraph/lists, undo/redo and JSON equality after save/reopen at 320/640/1100px, plus keyboard focus, forced colors, axe and 200% internal overflow. Test-only IPC does not establish native desktop editor restart. The native 53-test record below belongs to 3.4; native code was unchanged and not retested in 3.5.

References: [Tiptap custom menus](https://tiptap.dev/docs/editor/getting-started/style-editor/custom-menus), [WAI toolbar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/).

## Compatibility and boundaries

Installed exact @tiptap/react, @tiptap/core, @tiptap/pm and @tiptap/starter-kit 3.32.0 with npm; package-lock.json is retained. Official React/StarterKit documentation and npm peer metadata were checked before installation. The React package supports the installed React/ReactDOM 19 and types; TypeScript/Vite checks and real Edge tests pass. Installation added 51 packages and reported no audit vulnerabilities at that time. Cargo.lock and SQL migrations are unchanged.

ChapterManager lazily loads ChapterEditorDialog and its editor dependencies when chapter rows are displayed. Vite emits separate local application/editor bundles; no CDN, remote service or online runtime dependency is used. Production build passes without a large-chunk warning.

editor-schema.ts is the adapter between the existing domain contract and Tiptap. StarterKit enables exactly doc, paragraph, heading levels 1–6, bulletList, orderedList, listItem, text, hardBreak and bold/italic. Unsupported blockquote/code/codeBlock/horizontalRule/link/strike/underline are disabled. TrailingNode is disabled to avoid appending a paragraph to saved writing on open. History and list keyboard behavior are available; task 3.5 adds the toolbar described above. Styling uses existing writing fonts, colors and focus tokens; scoped CSS restores headings and list markers after Tailwind Preflight.

## Loading and editing

Opening loads a fresh chapter by book/chapter ID. Late responses are ignored after dismissal/unmount. The versioned envelope is validated before ProseMirror construction, then nodeFromJSON/check and a second domain validation verify the installed schema. Unsupported/corrupt content never reaches an editable fallback. Tiptap's content check remains enabled defensively.

Writing stays JSON throughout; no saved HTML is parsed or injected. ProseMirror may canonicalize optional empty arrays/default list attributes, mark ordering and adjacent equivalent text nodes; text characters/whitespace are preserved. Shared native/domain fixtures include decomposed Unicode, tabs, newlines, literal markup, marks, headings and nested lists. Actual Editor getJSON roundtrips these fixtures without extra paragraphs or writing changes.

Every document-changing transaction is checked against the existing byte/node/depth contract. Invalid/oversized edits are refused with visible feedback; the previous document stays intact. Paste explicitly inserts text/plain using a text transaction, preserving literal markup and whitespace. Files and drag/drop are refused visibly; rich HTML paste/import is not implemented.

## Manual persistence and close handling

ManuscriptEditor retains the loaded chapter revision and submits only validated content through saveChapterContent. It freezes editing while the write is pending, prevents repeated submits/closing, and advances the revision from the committed response. Success appears only after that response. The chapter row receives the new revision so later rename/delete calls stay current. Content writes continue to invalidate word_count to null until task 3.7.

Persistence errors retain the editor text for retry. Conflict/missing/invalid-stored-data errors retain text and block stale saves; no force overwrite, automatic merge or replacement with a fresh document occurs. The user can copy retained text, then explicitly discard and reopen when necessary. There is no automatic recovery/rebase workflow yet.

Dirty modal dismissal is refused. It reveals an unchecked acknowledgement plus **Discard changes and close**; only explicit acknowledgement permits that discard. Browser beforeunload prompts for dirty/pending writing. The Tauri close listener is installed before editing is enabled; registration failure leaves writing unavailable. Dirty/pending native close requests are prevented, and clean requests follow the API's normal destroy path. The existing main-window capability adds only core:window:allow-destroy, required by that clean-close API path; no file/shell/SQL permission was added. Listener/beforeunload cleanup follows the editor lifecycle.

These guards cover normal UI/window-close requests. They do not make unsaved edits durable against forced process termination, power loss or system shutdown. A recovery journal/close-flush policy remains 3.8/3.12; no zero-loss recovery claim is made.

## Verification (3.4)

- 286 Vitest tests pass, including 35 new installed-schema/session/close-guard cases. Tests use real Tiptap/ProseMirror instances for schema/serialization/editing; native persistence is mocked only at test boundaries.
- All 50 Edge tests pass, including nine editor scenarios at 320/640/1100px, actual keyboard edits, save/reopen JSON equality, error/conflict/pending behavior, acknowledged discard, unsupported-document refusal, literal paste/file refusal and mocked native-close events. Axe scans pass; 200% text checks cover document and modal/editor internal overflow plus usable modal-body height. Screenshots were inspected after correcting grid sizing/header wrapping.
- Frontend lint, format, strict typecheck and production build pass. Native compilation/tests (53), Cargo fmt and Clippy pass with the capability update. No real application database was touched.
- Browser scenarios use test-only IPC; native-close events/destroy are mocked. This task does not claim an observed Tauri-window startup, actual desktop editor save/close/restart, installer/macOS testing or manual screen-reader verification. Native content/revision persistence remains separately covered by disposable-database tests from 3.2. Real editor desktop/recovery acceptance remains 3.12.

Official references: [React integration](https://tiptap.dev/docs/editor/getting-started/install/react), [StarterKit configuration](https://tiptap.dev/docs/editor/extensions/functionality/starterkit), [invalid-schema handling](https://tiptap.dev/docs/guides/invalid-schema), [editor events](https://tiptap.dev/docs/editor/api/events), [Tauri close requests](https://v2.tauri.app/reference/javascript/api/namespacewindow/#oncloserequested). Installed package source/types were also inspected for actual extension options, list attributes and close/editability semantics.
