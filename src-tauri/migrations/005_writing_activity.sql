CREATE TABLE activity_operations (
  operation_id TEXT PRIMARY KEY NOT NULL,
  policy_version INTEGER NOT NULL CHECK(policy_version = 1),
  origin TEXT NOT NULL CHECK(origin IN ('editor','import','restore')),
  source_book_id TEXT NOT NULL,
  source_chapter_id TEXT NOT NULL,
  expected_revision INTEGER NOT NULL CHECK(expected_revision BETWEEN 1 AND 9007199254740990),
  committed_revision INTEGER NOT NULL CHECK(committed_revision = expected_revision + 1),
  payload_digest TEXT NOT NULL CHECK(length(payload_digest) = 64),
  committed_at TEXT NOT NULL
) STRICT;

CREATE TABLE writing_activity (
  operation_id TEXT NOT NULL REFERENCES activity_operations(operation_id),
  segment_index INTEGER NOT NULL CHECK(segment_index BETWEEN 0 AND 127),
  book_id TEXT REFERENCES books(id) ON DELETE SET NULL,
  chapter_id TEXT REFERENCES chapters(id) ON DELETE SET NULL,
  local_date TEXT NOT NULL,
  time_zone TEXT,
  utc_offset_minutes INTEGER NOT NULL CHECK(utc_offset_minutes BETWEEN -840 AND 840),
  first_edited_at TEXT NOT NULL,
  last_edited_at TEXT NOT NULL,
  before_words INTEGER NOT NULL CHECK(before_words BETWEEN 0 AND 9007199254740991),
  after_words INTEGER NOT NULL CHECK(after_words BETWEEN 0 AND 9007199254740991),
  added_words INTEGER NOT NULL CHECK(added_words = max(0, after_words - before_words)),
  deleted_words INTEGER NOT NULL CHECK(deleted_words = max(0, before_words - after_words)),
  credited_words INTEGER NOT NULL CHECK(credited_words BETWEEN 0 AND added_words),
  daily_word_goal INTEGER CHECK(daily_word_goal BETWEEN 1 AND 9007199254740991),
  scheduled INTEGER NOT NULL CHECK(scheduled IN (0,1)),
  PRIMARY KEY(operation_id, segment_index)
) STRICT;
CREATE INDEX writing_activity_date ON writing_activity(local_date);
CREATE INDEX writing_activity_book_date ON writing_activity(book_id, local_date);
CREATE INDEX writing_activity_chapter ON writing_activity(chapter_id);

CREATE TABLE activity_day_plans (
  source_book_id TEXT NOT NULL,
  local_date TEXT NOT NULL,
  book_id TEXT REFERENCES books(id) ON DELETE SET NULL,
  daily_word_goal INTEGER CHECK(daily_word_goal BETWEEN 1 AND 9007199254740991),
  scheduled INTEGER NOT NULL CHECK(scheduled IN (0,1)),
  policy_version INTEGER NOT NULL CHECK(policy_version = 1),
  PRIMARY KEY(source_book_id, local_date)
) STRICT;
