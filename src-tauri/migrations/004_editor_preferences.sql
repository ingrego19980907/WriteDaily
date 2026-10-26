-- Global editor presentation, independent of manuscript content and ownership.
CREATE TABLE editor_preferences (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    schema_version INTEGER NOT NULL CHECK (schema_version = 1),
    font_size INTEGER NOT NULL CHECK (font_size BETWEEN 12 AND 32),
    revision INTEGER NOT NULL CHECK (revision BETWEEN 1 AND 9007199254740991)
) STRICT;

INSERT INTO editor_preferences (id, schema_version, font_size, revision)
VALUES (1, 1, 18, 1);
