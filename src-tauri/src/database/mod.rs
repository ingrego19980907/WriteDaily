use std::{fs, path::Path, sync::Mutex, time::Duration};

use rusqlite::Connection;
use rusqlite_migration::{M, Migrations};

const APPLICATION_ID: i32 = 0x5744_4159; // WDAY: local format marker, not authentication.
const INITIAL_SCHEMA: &str = include_str!("../../migrations/001_books.sql");
const MIGRATION_STEPS: &[M<'static>] = &[M::up(INITIAL_SCHEMA)];
const MIGRATIONS: Migrations<'static> = Migrations::from_slice(MIGRATION_STEPS);

pub type Database = Mutex<Connection>;

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
}

pub fn open(data_directory: &Path) -> Result<Database, DatabaseError> {
    fs::create_dir_all(data_directory)?;
    let mut connection = Connection::open(data_directory.join("write-daily.sqlite3"))?;
    initialize(&mut connection, &MIGRATIONS)?;
    Ok(Mutex::new(connection))
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
    let objects: i64 = connection.query_row(
        "SELECT count(*) FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%'",
        [],
        |row| row.get(0),
    )?;
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
