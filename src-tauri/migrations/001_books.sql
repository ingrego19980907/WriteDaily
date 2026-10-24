-- Append-only: never edit a migration after it has shipped.
CREATE TABLE books (
    id TEXT PRIMARY KEY NOT NULL CHECK (
        length(id) = 36 AND id = lower(id)
        AND substr(id, 9, 1) = '-' AND substr(id, 14, 1) = '-'
        AND substr(id, 19, 1) = '-' AND substr(id, 24, 1) = '-'
        AND length(replace(id, '-', '')) = 32
        AND replace(id, '-', '') NOT GLOB '*[^0-9a-f]*'
        AND substr(id, 15, 1) = '4' AND substr(id, 20, 1) IN ('8', '9', 'a', 'b')
    ),
    title TEXT NOT NULL CHECK (
        length(title) BETWEEN 1 AND 200 AND length(trim(title)) > 0
        AND title = trim(title) AND instr(title, char(0)) = 0
    ),
    target_word_count INTEGER CHECK (
        target_word_count IS NULL OR target_word_count BETWEEN 1 AND 9007199254740991
    ),
    daily_word_goal INTEGER CHECK (
        daily_word_goal IS NULL OR daily_word_goal BETWEEN 1 AND 9007199254740991
    ),
    deadline TEXT CHECK (
        deadline IS NULL OR (
            deadline GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
            AND deadline BETWEEN '0001-01-01' AND '9999-12-31'
            AND date(deadline, '+0 days') IS NOT NULL
            AND date(deadline, '+0 days') = deadline
        )
    ),
    cover_path TEXT UNIQUE CHECK (
        cover_path IS NULL OR (
            length(cover_path) > 7 AND substr(cover_path, 1, 7) = 'covers/'
            AND instr(cover_path, '..') = 0 AND instr(cover_path, char(92)) = 0
            AND instr(substr(cover_path, 8), '/') = 0 AND instr(cover_path, ':') = 0
        )
    ),
    completed_at TEXT CHECK (
        completed_at IS NULL OR (
            length(completed_at) = 24
            AND completed_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
        )
    ),
    created_at TEXT NOT NULL CHECK (
        length(created_at) = 24
        AND created_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
    ),
    updated_at TEXT NOT NULL CHECK (
        length(updated_at) = 24
        AND updated_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
    ),
    CHECK (updated_at >= created_at),
    CHECK (completed_at IS NULL OR completed_at >= created_at)
) STRICT;

PRAGMA application_id = 1464090969;
