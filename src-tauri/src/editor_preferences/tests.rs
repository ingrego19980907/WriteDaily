use super::*;
use crate::database;

fn change(font_size: i64, expected_revision: i64) -> PreferenceChange {
    PreferenceChange {
        font_size,
        expected_revision,
    }
}

#[test]
fn global_font_size_commits_and_survives_database_reopen() {
    let directory = tempfile::tempdir().unwrap();
    let db = database::open(directory.path()).unwrap();
    let mut connection = db.lock().unwrap();
    assert_eq!(
        get(&mut connection).unwrap(),
        EditorPreferences {
            schema_version: 1,
            font_size: 18,
            revision: 1
        }
    );
    let saved = save(&mut connection, change(24, 1)).unwrap();
    assert_eq!(saved.font_size, 24);
    assert_eq!(saved.revision, 2);
    drop(connection);
    drop(db);
    let db = database::open(directory.path()).unwrap();
    assert_eq!(get(&mut db.lock().unwrap()).unwrap(), saved);
}

#[test]
fn bounds_noop_and_invalid_updates_preserve_the_committed_snapshot() {
    let directory = tempfile::tempdir().unwrap();
    let db = database::open(directory.path()).unwrap();
    let mut connection = db.lock().unwrap();
    let initial = get(&mut connection).unwrap();
    assert_eq!(save(&mut connection, change(18, 1)).unwrap(), initial);
    for (size, revision) in [
        (11, 1),
        (33, 1),
        (-1, 1),
        (i64::MAX, 1),
        (20, 0),
        (20, MAX_REVISION + 1),
    ] {
        assert!(matches!(
            save(&mut connection, change(size, revision)),
            Err(PreferenceError::Validation)
        ));
        assert_eq!(get(&mut connection).unwrap(), initial);
    }
    let minimum = save(&mut connection, change(12, 1)).unwrap();
    let maximum = save(&mut connection, change(32, minimum.revision)).unwrap();
    assert_eq!(maximum.font_size, 32);
    assert_eq!(maximum.revision, 3);
    for sql in [
        "UPDATE editor_preferences SET font_size = 11",
        "UPDATE editor_preferences SET font_size = 33",
        "UPDATE editor_preferences SET font_size = 18.5",
        "UPDATE editor_preferences SET schema_version = 2",
        "INSERT INTO editor_preferences VALUES (2, 1, 18, 1)",
    ] {
        assert!(connection.execute(sql, []).is_err());
    }
    assert_eq!(get(&mut connection).unwrap(), maximum);
}

#[test]
fn independent_connections_reject_stale_preferences_without_overwriting() {
    let directory = tempfile::tempdir().unwrap();
    let first = database::open(directory.path()).unwrap();
    let second = database::open(directory.path()).unwrap();
    let a = get(&mut first.lock().unwrap()).unwrap();
    let b = get(&mut second.lock().unwrap()).unwrap();
    let saved = save(&mut first.lock().unwrap(), change(20, a.revision)).unwrap();
    assert!(matches!(
        save(&mut second.lock().unwrap(), change(22, b.revision)),
        Err(PreferenceError::Conflict)
    ));
    assert_eq!(get(&mut second.lock().unwrap()).unwrap(), saved);
    assert_eq!(
        save(&mut second.lock().unwrap(), change(22, saved.revision))
            .unwrap()
            .font_size,
        22
    );
}

#[test]
fn failed_commit_keeps_previous_size_revision_and_unrelated_data() {
    let directory = tempfile::tempdir().unwrap();
    let db = database::open(directory.path()).unwrap();
    let mut connection = db.lock().unwrap();
    let before = get(&mut connection).unwrap();
    connection.execute_batch("CREATE TABLE preference_commit_probe (book_id TEXT REFERENCES books(id) DEFERRABLE INITIALLY DEFERRED); CREATE TRIGGER reject_preference_commit AFTER UPDATE ON editor_preferences BEGIN INSERT INTO preference_commit_probe VALUES ('missing'); END;").unwrap();
    assert!(save(&mut connection, change(24, before.revision)).is_err());
    assert_eq!(get(&mut connection).unwrap(), before);
    assert_eq!(
        connection
            .query_row("SELECT count(*) FROM preference_commit_probe", [], |r| r
                .get::<_, i64>(0))
            .unwrap(),
        0
    );
    connection.execute_batch("DROP TRIGGER reject_preference_commit; CREATE TRIGGER ignore_preference_write BEFORE UPDATE ON editor_preferences BEGIN SELECT RAISE(IGNORE); END;").unwrap();
    assert!(matches!(
        save(&mut connection, change(24, before.revision)),
        Err(PreferenceError::Conflict)
    ));
    assert_eq!(get(&mut connection).unwrap(), before);
}

#[test]
fn corrupt_or_missing_preferences_are_rejected_without_defaults_or_repair() {
    let directory = tempfile::tempdir().unwrap();
    let db = database::open(directory.path()).unwrap();
    let mut connection = db.lock().unwrap();
    connection
        .execute_batch(
            "PRAGMA ignore_check_constraints = ON; UPDATE editor_preferences SET font_size = 99;",
        )
        .unwrap();
    assert!(matches!(
        get(&mut connection),
        Err(PreferenceError::InvalidStoredData)
    ));
    assert!(matches!(
        save(&mut connection, change(20, 1)),
        Err(PreferenceError::InvalidStoredData)
    ));
    assert_eq!(
        connection
            .query_row("SELECT font_size FROM editor_preferences", [], |r| r
                .get::<_, i64>(0))
            .unwrap(),
        99
    );
    connection
        .execute_batch("UPDATE editor_preferences SET font_size = 18, schema_version = 2;")
        .unwrap();
    assert!(matches!(
        get(&mut connection),
        Err(PreferenceError::InvalidStoredData)
    ));
    connection
        .execute_batch("DELETE FROM editor_preferences;")
        .unwrap();
    assert!(matches!(
        get(&mut connection),
        Err(PreferenceError::InvalidStoredData)
    ));
    assert!(matches!(
        save(&mut connection, change(20, 1)),
        Err(PreferenceError::InvalidStoredData)
    ));
    assert_eq!(
        connection
            .query_row("SELECT count(*) FROM editor_preferences", [], |r| r
                .get::<_, i64>(0))
            .unwrap(),
        0
    );
}

#[test]
fn revision_overflow_and_untrusted_dto_fields_are_rejected() {
    let directory = tempfile::tempdir().unwrap();
    let db = database::open(directory.path()).unwrap();
    let mut connection = db.lock().unwrap();
    connection
        .execute(
            "UPDATE editor_preferences SET revision = ?1",
            [MAX_REVISION],
        )
        .unwrap();
    assert!(matches!(
        save(&mut connection, change(20, MAX_REVISION)),
        Err(PreferenceError::LimitReached)
    ));
    assert_eq!(get(&mut connection).unwrap().font_size, 18);
    for payload in [
        r#"{"fontSize":18.5,"expectedRevision":1}"#,
        r#"{"fontSize":18,"expectedRevision":1,"revision":9}"#,
        r#"{"fontSize":"18","expectedRevision":1}"#,
    ] {
        assert!(serde_json::from_str::<PreferenceChange>(payload).is_err());
    }
    let data = serde_json::to_value(get(&mut connection).unwrap()).unwrap();
    assert_eq!(
        data,
        serde_json::json!({"schemaVersion":1,"fontSize":18,"revision":MAX_REVISION})
    );
}
