# Word counting (3.7)

Implemented 2026-10-26. Policy v1 is a deterministic writing counter using pinned Unicode 17.0.0 categories. It is a custom policy, not UAX #29 segmentation or dictionary-based linguistic word detection.

## Rules

- A contiguous sequence of Unicode Letters (L) or Numbers (N) counts as one word. Combining Marks (M) continue a word but cannot start one. Empty/whitespace-only content and standalone punctuation, symbols, emoji or marks count as zero. Numbers count, including non-ASCII number categories.
- Internal apostrophes U+0027, U+2018, U+2019, U+02BC and hyphens U+002D, U+2010, U+2011 join components: `п'ять`, `don't` and `foo-bar` each count as one. Leading/trailing connectors add no word; repeated connectors separate components. En/em dashes separate words. U+02BC follows the connector rule despite its Letter category.
- ASCII period/comma join numeric components only when the surrounding base characters are Numbers: `12,500.75` counts as one, `one,two` as two and `12.a` as two. This is not locale-aware numeric parsing; dates joined with hyphens also count as one. Other punctuation separates runs. A combining mark immediately after a pending connector breaks that connection.
- Soft hyphen U+00AD, ZWNJ U+200C and ZWJ U+200D are ignored within runs. Zero-width space U+200B and other separators/control characters break runs. Combining marks preserve the preceding base character's numeric classification.
- Inline text nodes and bold/italic boundaries do not split words, including a connector split between nodes. Paragraphs, headings and hard breaks separate words. Lists recurse through their text blocks; list markers, ordered-list start values, attributes and chapter/book titles do not count.
- Literal markup is ordinary manuscript text, not parsed HTML: `<tag>` counts as one and `<b>hello</b>` as three. URLs/addresses split according to the same punctuation rules; they receive no special treatment.
- A contiguous CJK or Thai run counts as one. Linguistic segmentation for languages without spaces is outside this policy. This limitation is intentional and shared by frontend and native code.

Counting never trims, normalizes, rewrites or truncates writing. Frontend input must pass the existing bounded v1 chapter-content validator; invalid/unsupported content returns an unknown count, never zero. Native counting operates on already validated content. Existing 5 MiB, 100,000-node and depth-64 bounds still apply.

## Live and committed values

`src/features/editor/word-count.ts` calculates the current editor count on content updates. ManuscriptEditor presents current and last committed counts as a compact current/saved numeric pair in the lower-right footer, with separate screen-reader labels and centralized English copy. The counting-policy explanation is available as native hover-title help on the focusable autosave hint and as its accessible description. Formatting does not add words. The named count group is not a live region, avoiding announcements on every keystroke. Current edits are not presented as saved.

`src-tauri/src/chapters/word_count.rs` implements the same state machine. The native repository derives `word_count` itself and writes it in the same revision-checked IMMEDIATE transaction as content, schema version and timestamps. It returns success only after commit. Pending/failed writes do not advance the saved UI count. Conflicts and failed commits retain previous body/count/revision. Rename/reorder preserve counts; reopening reads the committed count.

Legacy NULL counts stay unknown on reads and metadata changes; the next explicit content save computes them. No automatic backfill, migration, read-side repair or real-library rewrite occurs. A known stored count inconsistent with validated content is rejected as invalid stored data without repair. Changing this policy later requires an explicit strategy for existing counts before deploying the new verifier. Book aggregation is implemented in 4.1: editor/library totals sum committed chapter counts, empty books are zero and legacy NULL preserves an unknown total. See [BOOK_WORD_COUNTS.md](BOOK_WORD_COUNTS.md). Autosave is implemented in 3.8; activity tracking remains a separate task.

## Pinned data and reproduction

Both implementations consume `resources/unicode/word-categories-17.0.0.json`: 1,157 sorted disjoint L/N/M ranges, independent of browser/Rust runtime Unicode versions. No new npm/Cargo dependency was installed. The source is official [Unicode 17.0.0 UnicodeData.txt](https://www.unicode.org/Public/17.0.0/ucd/UnicodeData.txt), SHA-256 `2e1efc1dcb59c575eedf5ccae60f95229f706ee6d031835247d843c11d96470c`. The complete [Unicode License V3](https://www.unicode.org/license.txt) is retained in `resources/unicode/LICENSE.txt`; retain that notice when redistributing the derived data.

Download those two official source files separately into ignored `.cache/unicode-17/`, then regenerate offline from the repository root:

```powershell
node scripts/build-word-categories.mjs .cache/unicode-17/UnicodeData.txt .cache/unicode-17/LICENSE.txt
npm.cmd exec -- prettier resources/unicode/word-categories-17.0.0.json --write
```

The generator verifies the pinned source hash and license header before writing. Raw downloaded data is not versioned. The policy was informed by the [Unicode segmentation specification](https://www.unicode.org/reports/tr29/), without claiming conformance to its default word-boundary algorithm.

## Verification and limits

Shared fixtures cover 40 text cases and 10 structured documents in both languages: Ukrainian/apostrophes, hyphens, numbers, combining marks, Unicode 17 supplementary letters, scripts without spaces, invisible characters, literal markup, inline splits, lists and block boundaries. Frontend tests additionally cover invalid input, immutability, real Tiptap formatting/undo, live updates and commit-only saved counts. Six native tests cover the shared contract/table invariants, disposable SQLite reopen, rename/reorder, empty saves, stale revisions, deferred-commit rollback, legacy NULL and corrupt counts.

Verification: 357 Vitest and 59 Rust tests pass; lint, typecheck, production build and Cargo fmt/Clippy pass. The full Edge run passed 68/69; its final test incorrectly attempted a list command on a heading, which the current schema disables. After correcting the test to select Paragraph first, all six word-count Edge tests passed, covering all 69 scenarios across the runs. Axe scans and 200% internal modal reflow pass at 320/640/1100px. Browser persistence uses test-only IPC; native persistence uses disposable databases. No actual desktop launch/restart, real-library mutation, screen-reader session or crash-recovery claim is added.

ED.8: content v2 font-size marks are validated and ignored by the unchanged counting policy. Adjacent differently styled runs still join into the same word; editor updates validate/serialize the appropriate v1/v2 envelope before counting. Native known counts are still verified against content.
