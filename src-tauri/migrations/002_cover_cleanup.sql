-- Durable retry queue. References are validated again before any filesystem access.
CREATE TABLE pending_cover_cleanup (
    path TEXT PRIMARY KEY NOT NULL
) STRICT;
