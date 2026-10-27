# Roadmap

One approved subtask per iteration. [TASKS.md](TASKS.md) owns individual status, dependencies and acceptance criteria. The 81 numbered tasks below are planned work items, not a claim that all have been verified.

| Milestone              | Tasks | Current status                 | Completion gate                                                                                                      |
| ---------------------- | ----- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| 0 - Foundation         | 9     | Completed (0.1-0.9 verified)   | Observe React in a Tauri window; TypeScript, tests, lint, formatting and build pass                                  |
| 1 - Design System      | 9     | Completed (1.1-1.9 verified)   | Consistent tokens, responsive shell, accessible navigation and reusable controls                                     |
| 2 - My Library         | 12    | Completed (2.1-2.12 verified)  | Book management and covers survive desktop restart                                                                   |
| 3 - Writing Editor     | 12    | Completed (3.1–3.12 verified)  | Chapters, formatting and last-commit recovery verified with real persistence; memory-only drafts are non-durable     |
| 4 - Goals & Deadlines  | 7     | In progress (4.1-4.4 verified) | Targets, missing/overdue deadlines and required pace calculations verified                                           |
| 5 - Activity & Streaks | 8     | Not started                    | Actual activity records, scheduled-day streaks and date/timezone boundaries verified                                 |
| 6 - Achievements       | 7     | Not started                    | Eight rules unlock correctly, persist and never duplicate                                                            |
| 7 - Export & Backup    | 7     | Not started                    | Portable exports and validated, recoverable backup/restore pass roundtrip and failure checks                         |
| 8 - Release            | 10    | Not started                    | Accessibility and Windows installation verified; artifacts reviewed before explicitly authorized publication/tagging |

Foundation acceptance is complete. Milestone 1 acceptance is complete for the current shell/shared components. Milestone 2 is complete through 2.12, including real Windows desktop restart persistence for books and covers. Milestone 3 (tasks 3.1–3.12) is complete for the current editor and commit-based recovery. Unsaved memory-only drafts do not survive forced termination; no durable recovery journal is claimed. Task 4.1 now derives committed book totals for the editor and library; legacy unknowns remain unknown. Task 4.2 displays and configures persisted daily targets; daily activity results remain Milestone 5. Task 4.3 handles optional total targets and derived achievement from committed counts. Task 4.4 displays local-calendar deadlines with midnight/resume updates. The next task is 4.5 (required writing pace), awaiting approval. No library or editor implementation belongs to Milestone 0. Maintenance tasks such as GIT.1 are recorded separately and do not change numbered milestone totals.
