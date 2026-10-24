# Proposed data model

Status: design outline only; no database or migration exists. Finalize concrete DDL and constraints in the relevant model tasks. SQLite and Tiptap are not installed yet. Proposed IDs, schema constraints, activity rules and retention behavior are subject to approval during those tasks.

| Entity              | Proposed fields and constraints                                                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Books               | ID, nonblank title, nullable managed cover reference, nullable positive word target/daily goal, nullable local deadline date, explicit completion timestamp, timestamps |
| Chapters            | ID, book foreign key, title, order, versioned Tiptap JSON, nonnegative word count, revision, timestamps                                                                 |
| Goal schedules      | Book foreign key, preferred weekdays; effective-dated goals/schedules so historical results remain stable                                                               |
| Writing activity    | Unique operation ID, book/chapter references, local date, UTC timestamp, timezone context, added/deleted word deltas, credited words, applicable goal/schedule snapshot |
| Achievement unlocks | Unique achievement key, unlocked timestamp, optional evidence                                                                                                           |
| Preferences         | Validated, versioned settings including editor size and future language preference                                                                                      |

Foreign keys must be enabled. Use ordered migrations and transactional schema changes where supported. Reject invalid counts/dates and unsafe file references. Store covers under managed application data and only relative references in SQLite; never persist browser object URLs. Coordinate cover replacement/deletion with database writes and recoverable cleanup.

## Proposed activity rules

Count positive net word changes per committed edit batch as credited writing, including paste; record deletions separately without subtracting previously credited activity. Same-length substitutions and formatting earn zero. Repeated deletion/retyping can earn credit; these are encouraging habit metrics, not fraud-proof measures. Imports/restores earn no activity. Document this policy to users and test it before release.

Capture local day and timezone at edit time, splitting activity across midnight rather than assigning all edits to the eventual save time. Stable operation IDs prevent retries from duplicating credit. Current manuscript length is separate from historical activity. Preserve aggregate history when a chapter/book is removed; confirm the exact retention/deletion policy in 2.6 and 5.1.

Define scheduled-day completion as reaching that day's applicable daily goal; unscheduled days do not break scheduled streaks. Finalize current-streak grace rules and test boundaries in milestone 5. Achievements unlock once and remain unlocked.

## Backup and restore direction

Use a consistent SQLite snapshot plus managed covers and a versioned manifest with integrity checks. Do not copy a live database blindly. Validate schema, paths, file checksums and compatibility before restore; create a safety backup, stage restored data and provide rollback. Test interrupted restore and corrupted input in milestone 7. Export should provide portable text without counting as new writing.
