# Inline font size (ED.8)

Current extension (ED.13): content v3 adds attribute-free underline marks and permits four unique composed marks. v1/v2 remain readable; serialization uses the oldest grammar that preserves the document. See [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md#underline-formatting-ed13).
Implemented 2026-10-27. Font size is now manuscript formatting, not a global editor preference. Bold and italic already have selection/cursor semantics; font-size controls now match them.

## Interaction

- A selected range receives the chosen size. Surrounding text and other chapters do not change.
- With a collapsed selection, the chosen size becomes a stored typing mark for subsequent input. Existing text is unchanged. A stored typing style alone is not document content and is not persisted until text is written.
- The selector reflects the selection/cursor, reports Mixed for multiple sizes and supports integer sizes 12 through 32. Minus/plus retain selection. Choosing a size restores the captured range when a native selector takes focus and then clears that capture so later cursor moves cannot reuse it.
- The same controls remain above writing in focus mode. Formatting is undoable through the ordinary editor transaction history. Bold/italic marks can coexist with size.
- Document changes use the existing 2-second inactivity autosave, Ctrl+S, navigation flush and dirty-close guards. Pending/failed writes cannot claim a saved result. No independent preference write is issued.

ChapterEditorDialog no longer mounts EditorPreferencesPanel or reads/writes its global settings. Its busy/success captions therefore cannot flash during formatting. Legacy preference storage/services/component are retained for compatibility and are not deleted or reset; the manuscript base size is 18px, with inline sizes rendered in rem to respect text enlargement.

## Persisted content compatibility

Database schema stays v4; released migrations are unchanged. The existing positive content_schema_version column already supports versioned content.

- Version 1 remains accepted and unchanged on read. It supports only bold/italic marks.
- Version 2 adds `{type: "fontSize", attrs: {size: integer}}` with bounds 12..32, no extra attributes and at most one mark of each type. Bold/italic remain attribute-free; maximum mark count is three.
- The serializer emits v1 when its grammar suffices and v2 when font-size marks are present. Unknown versions, malformed attributes and unsupported content fail without repair or truncation. Older binaries cannot interpret v2 and must reject it; new code does not silently downgrade away formatting.
- Both TypeScript and Rust validate the same bounded grammar. Existing byte/node/depth limits remain. Native revision-checked saves persist text, marks and computed counts in one transaction. Mark boundaries do not change word-count policy.

## Verification

All 446 Vitest tests, 110 Edge tests and 68 Rust tests passed. Shared contract cases include v2 sizes/composed marks and invalid v1 sizes, ranges, fractions, strings, duplicate marks and extra attributes. Native disposable-database coverage verifies marked content/count persistence, rejection rollback and reopen.

Browser coverage replaces obsolete global-preference product scenarios with range/cursor/mixed-size cases at 320/640/1100px, formatting combinations, autosave and reopen, focus mode, 200% font scaling, axe, pending writes and failed-save Ctrl+S retry. The controlled test clock explicitly advances animation frames before typing after focus commands. Unit coverage confirms no global settings calls and dirty-close protection.

Lint, format:check, strict TypeScript, production build, Cargo fmt/check, Clippy and diff checks passed. The desktop recovery driver was adapted to explicit range formatting and content commits; it was not rerun. Prior desktop recovery evidence remains historical. No real user library or SQL migration was modified.
