use std::{fs, path::Path, time::Duration};
mod handle;
pub use handle::Database;

use rusqlite::Connection;
use rusqlite_migration::{M, Migrations};

pub(crate) const APPLICATION_ID: i32 = 0x5744_4159; // WDAY: local format marker, not authentication.
const INITIAL_SCHEMA: &str = include_str!("../../migrations/001_books.sql");
const COVER_SCHEMA: &str = include_str!("../../migrations/002_cover_cleanup.sql");
const CHAPTER_SCHEMA: &str = include_str!("../../migrations/003_chapters.sql");
const PREFERENCE_SCHEMA: &str = include_str!("../../migrations/004_editor_preferences.sql");
const ACTIVITY_SCHEMA: &str = include_str!("../../migrations/005_writing_activity.sql");
const SCHEDULE_SCHEMA: &str = include_str!("../../migrations/006_writing_schedule.sql");
const ACHIEVEMENT_SCHEMA: &str = include_str!("../../migrations/007_achievement_unlocks.sql");
const NOTIFICATION_SCHEMA: &str =
    include_str!("../../migrations/008_achievement_notifications.sql");
const MIGRATION_STEPS: &[M<'static>] = &[
    M::up(INITIAL_SCHEMA),
    M::up(COVER_SCHEMA),
    M::up(CHAPTER_SCHEMA),
    M::up(PREFERENCE_SCHEMA),
    M::up(ACTIVITY_SCHEMA),
    M::up(SCHEDULE_SCHEMA),
    M::up(ACHIEVEMENT_SCHEMA),
    M::up(NOTIFICATION_SCHEMA),
];
const MIGRATIONS: Migrations<'static> = Migrations::from_slice(MIGRATION_STEPS);
pub(crate) const SCHEMA_VERSION: i32 = MIGRATION_STEPS.len() as i32;

#[derive(Debug, thiserror::Error)]
pub enum DatabaseError {
    #[error("Could not create the application data directory: {0}")]
    Directory(#[from] std::io::Error),
    #[error("SQLite initialization failed: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("Database migration failed; no reset was attempted: {0}")]
    Migration(#[from] rusqlite_migration::Error),
    #[error("Unrecognized database: refusing to modify an existing foreign or unversioned schema")]
    UnrecognizedDatabase,
    #[error(
        "The database schema is newer than this version of WriteDaily; upgrade the application"
    )]
    FutureSchema,
    #[error("Database integrity or expected schema check failed: {0}")]
    InvalidSchema(String),
    #[error("SQLite could not enable WAL journaling (reported {0})")]
    WalUnavailable(String),
    #[error("Achievement initialization failed; no reset was attempted: {0}")]
    Achievement(#[from] crate::achievements::AchievementError),
}

pub fn open(data_directory: &Path) -> Result<Database, DatabaseError> {
    fs::create_dir_all(data_directory)?;
    Database::open(data_directory)
}

pub(crate) fn connect(data_directory: &Path) -> Result<Connection, DatabaseError> {
    let mut connection = Connection::open(data_directory.join("write-daily.sqlite3"))?;
    initialize(&mut connection, &MIGRATIONS)?;
    connection.prepare("SELECT path FROM pending_cover_cleanup LIMIT 0")?;
    connection.prepare("SELECT id, book_id, title, position, content_schema_version, content_json, word_count, revision, created_at, updated_at FROM chapters LIMIT 0")?;
    connection.prepare(
        "SELECT id, schema_version, font_size, revision FROM editor_preferences LIMIT 0",
    )?;
    connection.prepare(
        "SELECT operation_id, payload_digest, committed_revision FROM activity_operations LIMIT 0",
    )?;
    connection.prepare("SELECT operation_id, segment_index, credited_words, local_date FROM writing_activity LIMIT 0")?;
    connection.prepare(
        "SELECT source_book_id, local_date, daily_word_goal FROM activity_day_plans LIMIT 0",
    )?;
    connection.prepare("SELECT revision FROM writing_schedule_state LIMIT 0")?;
    connection
        .prepare("SELECT effective_from, weekdays_mask FROM writing_schedule_history LIMIT 0")?;
    connection.prepare("SELECT source_book_id, effective_from, daily_word_goal, retired FROM activity_goal_history LIMIT 0")?;
    connection.prepare(
        "SELECT achievement_id, rule_policy_version, unlocked_at FROM achievement_unlocks LIMIT 0",
    )?;
    connection.prepare("SELECT achievement_id, disposition, claimed_at FROM achievement_notification_receipts LIMIT 0")?;
    Ok(connection)
}

pub(crate) type SchemaObject = (String, String, String, Option<String>);
pub(crate) fn expected_schema() -> Result<Vec<SchemaObject>, rusqlite::Error> {
    let mut reference = Connection::open_in_memory()?;
    MIGRATIONS
        .to_latest(&mut reference)
        .map_err(|_| rusqlite::Error::InvalidQuery)?;
    schema(&reference)
}
pub(crate) fn schema(connection: &Connection) -> Result<Vec<SchemaObject>, rusqlite::Error> {
    connection
        .prepare("SELECT type,name,tbl_name,sql FROM sqlite_schema ORDER BY type,name")?
        .query_map([], |r| {
            let sql: Option<String> = r.get(3)?;
            Ok((
                r.get(0)?,
                r.get(1)?,
                r.get(2)?,
                sql.map(|sql| sql.replace("\r\n", "\n").replace('\r', "\n")),
            ))
        })?
        .collect()
}

fn initialize(
    connection: &mut Connection,
    migrations: &Migrations<'_>,
) -> Result<(), DatabaseError> {
    connection.busy_timeout(Duration::from_secs(5))?;
    connection.pragma_update(None, "foreign_keys", true)?;

    // Identity/version checks precede migrations and persistent journal changes.
    let application_id: i32 =
        connection.pragma_query_value(None, "application_id", |row| row.get(0))?;
    let version: i32 = connection.pragma_query_value(None, "user_version", |row| row.get(0))?;
    let objects: i64 =
        connection.query_row("SELECT count(*) FROM sqlite_schema", [], |row| row.get(0))?;
    if (version == 0 && (application_id != 0 || objects != 0))
        || (version != 0 && application_id != APPLICATION_ID)
    {
        return Err(DatabaseError::UnrecognizedDatabase);
    }
    if migrations.pending_migrations(connection)? < 0 {
        return Err(DatabaseError::FutureSchema);
    }

    let integrity: String = connection.query_row("PRAGMA quick_check(1)", [], |row| row.get(0))?;
    if integrity != "ok" {
        return Err(DatabaseError::InvalidSchema(integrity));
    }
    connection.pragma_update(None, "synchronous", "FULL")?;
    // The library commits all pending migrations and user_version atomically.
    migrations.to_latest(connection)?;
    connection.prepare(
        "SELECT id, title, target_word_count, daily_word_goal, deadline, cover_path,
                completed_at, created_at, updated_at FROM books LIMIT 0",
    )?;
    let invalid_foreign_keys: bool = connection.query_row(
        "SELECT EXISTS(SELECT 1 FROM pragma_foreign_key_check)",
        [],
        |row| row.get(0),
    )?;
    if invalid_foreign_keys {
        return Err(DatabaseError::InvalidSchema(
            "foreign-key violations".into(),
        ));
    }
    let journal: String = connection.query_row("PRAGMA journal_mode=WAL", [], |row| row.get(0))?;
    if journal != "wal" {
        return Err(DatabaseError::WalUnavailable(journal));
    }
    Ok(())
}

#[cfg(test)]
mod tests;
