-- Append-only: chapter content is validated natively as well as by SQL bounds.
CREATE TABLE chapters (
    id TEXT PRIMARY KEY NOT NULL CHECK (
        length(id) = 36 AND id = lower(id)
        AND substr(id, 9, 1) = '-' AND substr(id, 14, 1) = '-'
        AND substr(id, 19, 1) = '-' AND substr(id, 24, 1) = '-'
        AND length(replace(id, '-', '')) = 32
        AND replace(id, '-', '') NOT GLOB '*[^0-9a-f]*'
        AND substr(id, 15, 1) = '4' AND substr(id, 20, 1) IN ('8', '9', 'a', 'b')
    ),
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (
        length(title) BETWEEN 1 AND 200 AND title = trim(title)
        AND length(trim(title)) > 0 AND instr(title, char(0)) = 0
    ),
    position INTEGER NOT NULL CHECK (position BETWEEN 0 AND 9007199254740991),
    content_schema_version INTEGER NOT NULL CHECK (content_schema_version > 0),
    content_json TEXT NOT NULL CHECK (
        length(CAST(content_json AS BLOB)) BETWEEN 2 AND 5242880 AND json_valid(content_json)
    ),
    word_count INTEGER CHECK (word_count IS NULL OR word_count BETWEEN 0 AND 9007199254740991),
    revision INTEGER NOT NULL CHECK (revision BETWEEN 1 AND 9007199254740991),
    created_at TEXT NOT NULL CHECK (length(created_at) = 24 AND substr(created_at, 24) = 'Z'),
    updated_at TEXT NOT NULL CHECK (length(updated_at) = 24 AND substr(updated_at, 24) = 'Z'),
    CHECK (updated_at >= created_at),
    UNIQUE (book_id, position)
) STRICT;
