CREATE TABLE writing_schedule_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    revision INTEGER NOT NULL CHECK (revision BETWEEN 0 AND 9007199254740991)
) STRICT;
INSERT INTO writing_schedule_state VALUES (1, 0);

-- Sunday is bit 0, Saturday bit 6. An empty schedule is a valid pause.
CREATE TABLE writing_schedule_history (
    effective_from TEXT PRIMARY KEY CHECK (length(effective_from) = 10 AND effective_from BETWEEN '0001-01-01' AND '9999-12-31'),
    weekdays_mask INTEGER NOT NULL CHECK (weekdays_mask BETWEEN 0 AND 127)
) STRICT;

-- No migration backfill: goals for days before tracking remain unknown.
CREATE TABLE activity_goal_history (
    source_book_id TEXT NOT NULL,
    book_id TEXT REFERENCES books(id) ON DELETE SET NULL,
    effective_from TEXT NOT NULL CHECK (length(effective_from) = 10 AND effective_from BETWEEN '0001-01-01' AND '9999-12-31'),
    daily_word_goal INTEGER CHECK (daily_word_goal BETWEEN 1 AND 9007199254740991),
    retired INTEGER NOT NULL CHECK (retired IN (0, 1)),
    PRIMARY KEY (source_book_id, effective_from)
) STRICT;
