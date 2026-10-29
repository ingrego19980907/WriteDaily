-- Notification retrieval is at most once, independently of permanent unlocks.
CREATE TABLE achievement_notification_receipts (
    achievement_id TEXT PRIMARY KEY NOT NULL REFERENCES achievement_unlocks(achievement_id),
    disposition TEXT NOT NULL CHECK (disposition IN ('baseline', 'claimed')),
    claimed_at TEXT,
    CHECK (
        (disposition = 'baseline' AND claimed_at IS NULL) OR
        (disposition = 'claimed' AND claimed_at IS NOT NULL AND
         length(claimed_at) = 24 AND substr(claimed_at, 24, 1) = 'Z')
    )
) STRICT;

-- Do not replay achievements already present before notification support.
-- No historical delivery timestamp is invented for these records.
INSERT INTO achievement_notification_receipts (achievement_id, disposition, claimed_at)
SELECT achievement_id, 'baseline', NULL FROM achievement_unlocks;
