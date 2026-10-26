use super::*;
use rusqlite::params;

const BOOK_ID: &str = "123e4567-e89b-42d3-a456-426614174000";
const TIMESTAMP: &str = "2026-10-24T08:00:00.000Z";

fn seed_book(connection: &Connection) {
    connection
        .execute(
            "INSERT INTO books (id, title, created_at, updated_at) VALUES (?1, ?2, ?3, ?3)",
            params![BOOK_ID, "Моя історія", TIMESTAMP],
        )
        .unwrap();
}

fn version(connection: &Connection) -> i32 {
    connection
        .pragma_query_value(None, "user_version", |row| row.get(0))
        .unwrap()
}

#[test]
fn registered_migrations_are_valid() {
    MIGRATIONS.validate().unwrap();
}

#[test]
fn version_two_upgrades_chapters_preserving_books_and_cleanup_intents() {
    let directory = tempfile::tempdir().unwrap();
    let mut connection = Connection::open(directory.path().join("write-daily.sqlite3")).unwrap();
    initialize(
        &mut connection,
        &Migrations::new(vec![M::up(INITIAL_SCHEMA), M::up(COVER_SCHEMA)]),
    )
    .unwrap();
    seed_book(&connection);
    connection
        .execute(
            "INSERT INTO pending_cover_cleanup(path) VALUES ('covers/queued.png')",
            [],
        )
        .unwrap();
    drop(connection);
    let database = open(directory.path()).unwrap();
    let connection = database.lock().unwrap();
    assert_eq!(version(&connection), 4);
    assert_eq!(
        connection
            .query_row("SELECT count(*) FROM books", [], |row| row.get::<_, i64>(0))
            .unwrap(),
        1
    );
    assert_eq!(
        connection
            .query_row("SELECT path FROM pending_cover_cleanup", [], |row| row
                .get::<_, String>(
                0
            ))
            .unwrap(),
        "covers/queued.png"
    );
    assert_eq!(
        connection
            .query_row("SELECT count(*) FROM chapters", [], |row| row
                .get::<_, i64>(0))
            .unwrap(),
        0
    );
}

#[test]
fn version_one_upgrades_to_cover_queue_without_touching_books() {
    let directory = tempfile::tempdir().unwrap();
    let mut connection = Connection::open(directory.path().join("write-daily.sqlite3")).unwrap();
    initialize(
        &mut connection,
        &Migrations::new(vec![M::up(INITIAL_SCHEMA)]),
    )
    .unwrap();
    seed_book(&connection);
    drop(connection);
    let database = open(directory.path()).unwrap();
    let connection = database.lock().unwrap();
    assert_eq!(version(&connection), 4);
    assert_eq!(
        connection
            .query_row("SELECT count(*) FROM books", [], |row| row.get::<_, i64>(0))
            .unwrap(),
        1
    );
    assert_eq!(
        connection
            .query_row("SELECT count(*) FROM pending_cover_cleanup", [], |row| row
                .get::<_, i64>(
                0
            ))
            .unwrap(),
        0
    );
}

#[test]
fn fresh_database_is_configured_and_reopening_preserves_data() {
    let directory = tempfile::tempdir().unwrap();
    {
        let database = open(directory.path()).unwrap();
        let connection = database.lock().unwrap();
        assert_eq!(version(&connection), 4);
        assert_eq!(
            connection
                .pragma_query_value(None, "application_id", |r| r.get::<_, i32>(0))
                .unwrap(),
            APPLICATION_ID
        );
        assert_eq!(
            connection
                .pragma_query_value(None, "foreign_keys", |r| r.get::<_, i32>(0))
                .unwrap(),
            1
        );
        assert_eq!(
            connection
                .pragma_query_value(None, "synchronous", |r| r.get::<_, i32>(0))
                .unwrap(),
            2
        );
        assert_eq!(
            connection
                .pragma_query_value(None, "busy_timeout", |r| r.get::<_, i32>(0))
                .unwrap(),
            5000
        );
        assert_eq!(
            connection
                .pragma_query_value(None, "journal_mode", |r| r.get::<_, String>(0))
                .unwrap(),
            "wal"
        );
        seed_book(&connection);
    }
    let database = open(directory.path()).unwrap();
    let connection = database.lock().unwrap();
    assert_eq!(version(&connection), 4);
    assert_eq!(
        connection
            .query_row("SELECT title FROM books WHERE id = ?1", [BOOK_ID], |r| {
                r.get::<_, String>(0)
            })
            .unwrap(),
        "Моя історія"
    );
    assert_eq!(
        connection
            .pragma_query_value(None, "foreign_keys", |r| r.get::<_, i32>(0))
            .unwrap(),
        1
    );
}

#[test]
fn database_constraints_reject_invalid_metadata() {
    let directory = tempfile::tempdir().unwrap();
    let database = open(directory.path()).unwrap();
    let connection = database.lock().unwrap();
    seed_book(&connection);
    for statement in [
        "UPDATE books SET id = 'not-a-uuid'",
        "UPDATE books SET id = '123e4567-e89b-12d3-a456-426614174000'",
        "UPDATE books SET title = ''",
        "UPDATE books SET title = ' padded '",
        "UPDATE books SET title = 'before' || char(0) || 'after'",
        "UPDATE books SET target_word_count = 0",
        "UPDATE books SET target_word_count = -1",
        "UPDATE books SET target_word_count = 1.5",
        "UPDATE books SET daily_word_goal = 9007199254740992",
        "UPDATE books SET deadline = '2026-02-29'",
        "UPDATE books SET deadline = '1900-02-29'",
        "UPDATE books SET deadline = '2026-04-31'",
        "UPDATE books SET deadline = '2026-13-01'",
        "UPDATE books SET deadline = '0000-01-01'",
        "UPDATE books SET cover_path = 'blob:temporary'",
        "UPDATE books SET cover_path = 'covers/../outside.png'",
        "UPDATE books SET cover_path = 'covers/subdirectory/image.png'",
        "UPDATE books SET created_at = 'not-a-timestamp'",
        "UPDATE books SET updated_at = '2025-10-24T08:00:00.000Z'",
        "UPDATE books SET completed_at = '2025-10-24T08:00:00.000Z'",
    ] {
        assert!(
            connection.execute(statement, []).is_err(),
            "accepted: {statement}"
        );
    }
    assert!(
        connection
            .execute("UPDATE books SET title = ?1", ["x".repeat(201)])
            .is_err()
    );
    connection.execute("UPDATE books SET deadline = '2000-02-29', target_word_count = 9007199254740991, daily_word_goal = 1", []).unwrap();
    connection
        .execute(
            "UPDATE books SET deadline = NULL, target_word_count = NULL, daily_word_goal = NULL",
            [],
        )
        .unwrap();
}

#[test]
fn duplicate_titles_are_allowed_but_managed_covers_are_not_shared() {
    let directory = tempfile::tempdir().unwrap();
    let database = open(directory.path()).unwrap();
    let connection = database.lock().unwrap();
    seed_book(&connection);
    connection
        .execute(
            "INSERT INTO books (id, title, created_at, updated_at) VALUES (?1, ?2, ?3, ?3)",
            params![
                "123e4567-e89b-42d3-a456-426614174001",
                "Моя історія",
                TIMESTAMP
            ],
        )
        .unwrap();
    connection
        .execute(
            "UPDATE books SET cover_path = 'covers/owned.png' WHERE id = ?1",
            [BOOK_ID],
        )
        .unwrap();
    assert!(
        connection
            .execute("UPDATE books SET cover_path = 'covers/owned.png'", [])
            .is_err()
    );
}

#[test]
fn foreign_keys_are_actually_enforced() {
    let directory = tempfile::tempdir().unwrap();
    let database = open(directory.path()).unwrap();
    let connection = database.lock().unwrap();
    connection
        .execute_batch("CREATE TABLE child_probe (book_id TEXT REFERENCES books(id)) STRICT;")
        .unwrap();
    assert!(
        connection
            .execute("INSERT INTO child_probe VALUES (?1)", [BOOK_ID])
            .is_err()
    );
}

#[test]
fn failed_upgrade_rolls_back_new_objects_and_keeps_existing_data() {
    let directory = tempfile::tempdir().unwrap();
    let database = open(directory.path()).unwrap();
    let mut connection = database.lock().unwrap();
    seed_book(&connection);
    let broken = Migrations::new(vec![
        M::up(INITIAL_SCHEMA),
        M::up(COVER_SCHEMA),
        M::up(CHAPTER_SCHEMA),
        M::up(PREFERENCE_SCHEMA),
        M::up("CREATE TABLE rollback_probe (id INTEGER); THIS IS NOT SQL;"),
    ]);
    assert!(matches!(
        initialize(&mut connection, &broken),
        Err(DatabaseError::Migration(_))
    ));
    assert_eq!(version(&connection), 4);
    assert_eq!(
        connection
            .query_row("SELECT count(*) FROM books", [], |r| r.get::<_, i64>(0))
            .unwrap(),
        1
    );
    assert_eq!(
        connection
            .query_row(
                "SELECT count(*) FROM sqlite_schema WHERE name = 'rollback_probe'",
                [],
                |r| r.get::<_, i64>(0)
            )
            .unwrap(),
        0
    );
}

#[test]
fn failed_initial_migration_rolls_back_identity_and_can_be_retried() {
    let directory = tempfile::tempdir().unwrap();
    let mut connection = Connection::open(directory.path().join("write-daily.sqlite3")).unwrap();
    let broken = Migrations::new(vec![M::up(INITIAL_SCHEMA), M::up("INVALID SQL;")]);
    assert!(matches!(
        initialize(&mut connection, &broken),
        Err(DatabaseError::Migration(_))
    ));
    assert_eq!(version(&connection), 0);
    assert_eq!(
        connection
            .pragma_query_value(None, "application_id", |r| r.get::<_, i32>(0))
            .unwrap(),
        0
    );
    assert_eq!(
        connection
            .query_row(
                "SELECT count(*) FROM sqlite_schema WHERE name = 'books'",
                [],
                |r| r.get::<_, i64>(0)
            )
            .unwrap(),
        0
    );
    drop(connection);
    assert!(open(directory.path()).is_ok());
}

#[test]
fn upgrading_an_existing_schema_preserves_data_and_old_app_refuses_downgrade() {
    let directory = tempfile::tempdir().unwrap();
    {
        let database = open(directory.path()).unwrap();
        let mut connection = database.lock().unwrap();
        seed_book(&connection);
        let newer = Migrations::new(vec![
            M::up(INITIAL_SCHEMA),
            M::up(COVER_SCHEMA),
            M::up(CHAPTER_SCHEMA),
            M::up(PREFERENCE_SCHEMA),
            M::up("CREATE TABLE upgrade_probe (id INTEGER PRIMARY KEY) STRICT;"),
        ]);
        initialize(&mut connection, &newer).unwrap();
        assert_eq!(version(&connection), 5);
        assert_eq!(
            connection
                .query_row("SELECT count(*) FROM books", [], |r| r.get::<_, i64>(0))
                .unwrap(),
            1
        );
    }
    assert!(matches!(
        open(directory.path()),
        Err(DatabaseError::FutureSchema)
    ));
    let connection = Connection::open(directory.path().join("write-daily.sqlite3")).unwrap();
    assert_eq!(version(&connection), 5);
    assert_eq!(
        connection
            .query_row("SELECT count(*) FROM books", [], |r| r.get::<_, i64>(0))
            .unwrap(),
        1
    );
}

#[test]
fn unrecognized_existing_database_is_not_modified() {
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("write-daily.sqlite3");
    {
        let connection = Connection::open(&path).unwrap();
        connection
            .execute_batch(
                "CREATE TABLE unrelated (text TEXT); INSERT INTO unrelated VALUES ('preserve');",
            )
            .unwrap();
    }
    let before = fs::read(&path).unwrap();
    assert!(matches!(
        open(directory.path()),
        Err(DatabaseError::UnrecognizedDatabase)
    ));
    assert_eq!(fs::read(&path).unwrap(), before);
}

#[test]
fn corrupt_files_and_invalid_directory_paths_are_not_reset() {
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("write-daily.sqlite3");
    fs::write(&path, b"not a SQLite database").unwrap();
    assert!(matches!(
        open(directory.path()),
        Err(DatabaseError::Sqlite(_))
    ));
    assert_eq!(fs::read(&path).unwrap(), b"not a SQLite database");
    assert!(matches!(open(&path), Err(DatabaseError::Directory(_))));
}

#[test]
fn version_three_adds_default_preferences_without_changing_books_or_chapters() {
    use crate::chapters::{ChapterDetails, ChapterRepository};
    let directory = tempfile::tempdir().unwrap();
    let mut connection = Connection::open(directory.path().join("write-daily.sqlite3")).unwrap();
    let old = Migrations::new(vec![
        M::up(INITIAL_SCHEMA),
        M::up(COVER_SCHEMA),
        M::up(CHAPTER_SCHEMA),
    ]);
    initialize(&mut connection, &old).unwrap();
    seed_book(&connection);
    let chapter = ChapterRepository::new(&mut connection)
        .create(
            BOOK_ID,
            ChapterDetails {
                title: "Retained chapter".into(),
            },
        )
        .unwrap();
    drop(connection);
    let db = open(directory.path()).unwrap();
    let mut connection = db.lock().unwrap();
    assert_eq!(version(&connection), 4);
    assert_eq!(
        ChapterRepository::new(&mut connection)
            .get(BOOK_ID, &chapter.summary.id)
            .unwrap(),
        chapter
    );
    assert_eq!(
        crate::editor_preferences::get(&mut connection)
            .unwrap()
            .font_size,
        18
    );
    assert!(matches!(
        initialize(&mut connection, &old),
        Err(DatabaseError::FutureSchema)
    ));
    assert_eq!(version(&connection), 4);
}
