# Product

WriteDaily — A little writing, every day.

A completely free, calm, offline-first desktop workspace for aspiring novelists, fiction writers, hobby authors, and people building a writing habit. Windows first; preserve a path to macOS. English first, with future Ukrainian localization.

## Version 1 scope

- My Library: responsive book cards with covers, title, manuscript/target counts and progress; create, open, edit, and confirmed deletion. Creation accepts title, optional cover, target, daily goal, deadline.
- Editor: chapters, rich text through Tiptap, basic formatting/lists, undo/redo, word counting, reliable autosave with visible status, focus mode, font size preferences.
- Goals: daily and book targets, preferred writing days, deadlines, remaining words and required pace; missing/overdue deadlines handled gracefully.
- Activity: inspectable daily word counts, goal results, calendar intensity, current/longest streak, active days from real activity records.
- Achievements: 100, 1,000, 10,000 and 50,000 credited words; 7 and 30 cumulative completed scheduled dates (not consecutive streaks); 10 completed scheduled book/date goals; first explicitly completed book. [Rule policy 1](ACHIEVEMENTS.md) defines the thresholds in 6.1; pure evaluation is implemented in 6.2, authoritative native evaluation and unique permanent SQLite unlocks in 6.3, accessible read-only cards in 6.4, the production page in 6.5 and quiet one-time in-app notifications in 6.6. Notifications follow committed unlocks without interrupting writing and do not replay historical achievements on upgrade. Final scenario-based test coverage review 6.7 is complete; see [coverage evidence and limits](ACHIEVEMENTS_REVIEW.md). Explicit book completion still needs the separately tracked ACH.1 action.
- Reliability: migrations, validation and safe deletion. Individual saved-chapter export (7.1) and complete saved-book export (7.2) create new UTF-8 `.txt` files through native Save As, preserving existing files and writing records. Whole-book export includes all chapters in manuscript order from one committed snapshot. Portable-text verification (7.3) covers readable structure and exact Unicode bytes, including indented list continuations. Library backup (7.4) creates a checked ZIP snapshot of SQLite and managed covers with a versioned manifest. Library restore (7.5) validates/stages a current-format ZIP, requires explicit whole-library replacement acknowledgement, creates an automatic safety backup and provides journaled rollback. After success, close and reopen WriteDaily. Broader integrity/recovery reviews remain 7.6–7.7. See [library restore](LIBRARY_RESTORE.md). See [library backup](LIBRARY_BACKUP.md). See [chapter export](CHAPTER_EXPORT.md), [whole-book export](BOOK_EXPORT.md) and [portable-text contract](PORTABLE_TEXT_EXPORT.md).

Library home copy: “My Library” and “Every great story begins with a single word.” Show actual streak and today's activity once implemented.

## Principles and exclusions

Calm by design; ownership of words; small progress matters; writing and reliability first; offline operation without accounts. No AI assistant, cloud sync, authentication, collaboration, mobile app, payments, subscriptions, music player, complex animated environments, or full Word compatibility.

Features described here are planned, not implemented.
