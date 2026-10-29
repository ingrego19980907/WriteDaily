-- Stable achievement identity is unique across rule policy versions.
-- No book foreign key: earned achievements survive book/chapter deletion.
CREATE TABLE achievement_unlocks (
    achievement_id TEXT PRIMARY KEY NOT NULL CHECK (achievement_id IN (
        'first_words', 'getting_started', 'storyteller', 'novelist',
        'consistency', 'dedicated_writer', 'goal_keeper', 'the_end'
    )),
    rule_policy_version INTEGER NOT NULL CHECK (rule_policy_version = 1),
    unlocked_at TEXT NOT NULL CHECK (
        length(unlocked_at) = 24 AND substr(unlocked_at, 24, 1) = 'Z'
    )
) STRICT;
