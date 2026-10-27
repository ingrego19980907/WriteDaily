use super::*;
use crate::database;
use rusqlite::params;
use serde_json::{Value, json};

fn details(title: &str) -> BookDetails {
    BookDetails {
        title: title.into(),
        target_word_count: None,
        daily_word_goal: None,
        deadline: None,
    }
}

#[test]
fn shared_metadata_contract_matches_typescript() {
    let fixtures: Vec<Value> =
        serde_json::from_str(include_str!("../../../tests/fixtures/book-details.json")).unwrap();
    for fixture in fixtures {
        let input: BookDetails = serde_json::from_value(fixture["input"].clone()).unwrap();
        let actual = match validation::normalize_details(input) {
            Ok(data) => json!({"success": true, "data": data}),
            Err(BookError::Validation(issues)) => json!({"success": false, "issues": issues}),
            Err(error) => panic!("unexpected error: {error}"),
        };
        assert_eq!(actual, fixture["expected"], "fixture: {}", fixture["name"]);
    }
}

#[test]
fn title_length_uses_unicode_code_points_not_utf8_bytes() {
    let accepted = details(&"📖".repeat(200));
    assert!(validation::normalize_details(accepted).is_ok());
    let rejected = details(&"📖".repeat(201));
    assert!(matches!(
        validation::normalize_details(rejected),
        Err(BookError::Validation(_))
    ));
}

#[test]
fn create_get_and_list_use_normalized_committed_metadata() {
    let directory = tempfile::tempdir().unwrap();
    let database = database::open(directory.path()).unwrap();
    let mut connection = database.lock().unwrap();
    let mut repository = BookRepository::new(&mut connection);
    assert!(repository.list().unwrap().is_empty());
    let book = repository
        .create(details(" \u{feff}Cafe\u{301} 📖 "))
        .unwrap();
    assert_eq!(book.title, "Café 📖");
    assert!(validation::valid_id(&book.id));
    assert!(validation::parse_timestamp(&book.created_at).is_some());
    assert_eq!(book.created_at, book.updated_at);
    assert_eq!(book.cover_path, None);
    assert_eq!(book.completed_at, None);
    assert_eq!(repository.get(&book.id).unwrap(), book);
    assert_eq!(repository.list().unwrap(), vec![book]);
}

#[test]
fn updates_persist_after_reopen_without_changing_identity_or_creation_time() {
    let directory = tempfile::tempdir().unwrap();
    let saved = {
        let database = database::open(directory.path()).unwrap();
        let mut connection = database.lock().unwrap();
        let mut repository = BookRepository::new(&mut connection);
        let book = repository.create(details("Original")).unwrap();
        let metadata = BookDetails {
            title: "Моя історія".into(),
            target_word_count: Some(50000),
            daily_word_goal: Some(500),
            deadline: Some("2000-02-29".into()),
        };
        let updated = repository
            .update(&book.id, &book.updated_at, metadata)
            .unwrap();
        assert_eq!(updated.id, book.id);
        assert_eq!(updated.created_at, book.created_at);
        assert!(updated.updated_at > book.updated_at);
        updated
    };
    let database = database::open(directory.path()).unwrap();
    let mut connection = database.lock().unwrap();
    let mut repository = BookRepository::new(&mut connection);
    assert_eq!(repository.get(&saved.id).unwrap(), saved);
    let cleared = repository
        .update(&saved.id, &saved.updated_at, details("Cleared goals"))
        .unwrap();
    assert_eq!(cleared.target_word_count, None);
    assert_eq!(cleared.daily_word_goal, None);
    assert_eq!(cleared.deadline, None);
}

#[test]
fn quoted_titles_are_data_not_sql_and_duplicate_titles_are_allowed() {
    let directory = tempfile::tempdir().unwrap();
    let database = database::open(directory.path()).unwrap();
    let mut connection = database.lock().unwrap();
    let mut repository = BookRepository::new(&mut connection);
    let title = "Story'); DROP TABLE books; --";
    let first = repository.create(details(title)).unwrap();
    let second = repository.create(details(title)).unwrap();
    assert_ne!(first.id, second.id);
    assert_eq!(repository.get(&first.id).unwrap().title, title);
    assert_eq!(repository.list().unwrap().len(), 2);
}

#[test]
fn invalid_writes_leave_existing_data_unchanged() {
    let directory = tempfile::tempdir().unwrap();
    let database = database::open(directory.path()).unwrap();
    let mut connection = database.lock().unwrap();
    let mut repository = BookRepository::new(&mut connection);
    let book = repository.create(details("Original")).unwrap();
    let invalid = BookDetails {
        title: "\n\t".into(),
        target_word_count: Some(0),
        daily_word_goal: Some(-1),
        deadline: Some("1900-02-29".into()),
    };
    assert!(matches!(
        repository.create(invalid.clone()),
        Err(BookError::Validation(_))
    ));
    assert!(matches!(
        repository.update(&book.id, &book.updated_at, invalid),
        Err(BookError::Validation(_))
    ));
    assert_eq!(repository.list().unwrap(), vec![book]);
}

#[test]
fn two_connections_reject_stale_updates_and_deletes() {
    let directory = tempfile::tempdir().unwrap();
    let first = database::open(directory.path()).unwrap();
    let second = database::open(directory.path()).unwrap();
    let mut first_connection = first.lock().unwrap();
    let mut second_connection = second.lock().unwrap();
    let mut older_view = BookRepository::new(&mut first_connection);
    let book = older_view.create(details("Original")).unwrap();
    let latest = BookRepository::new(&mut second_connection)
        .update(&book.id, &book.updated_at, details("Newer edit"))
        .unwrap();
    assert!(matches!(
        older_view.update(&book.id, &book.updated_at, details("Stale edit")),
        Err(BookError::Conflict)
    ));
    assert!(matches!(
        older_view.delete(&book.id, &book.updated_at),
        Err(BookError::Conflict)
    ));
    assert_eq!(older_view.get(&book.id).unwrap(), latest);
}

#[test]
fn timestamps_stay_monotonic_after_clock_rollback_and_list_order_is_stable() {
    let directory = tempfile::tempdir().unwrap();
    let database = database::open(directory.path()).unwrap();
    let mut connection = database.lock().unwrap();
    let first = BookRepository::new(&mut connection)
        .create(details("First"))
        .unwrap();
    let second = BookRepository::new(&mut connection)
        .create(details("Second"))
        .unwrap();
    let future = "2100-01-01T00:00:00.000Z";
    connection
        .execute("UPDATE books SET updated_at = ?1", [future])
        .unwrap();
    let mut repository = BookRepository::new(&mut connection);
    let listed = repository.list().unwrap();
    let mut ids = vec![first.id.clone(), second.id.clone()];
    ids.sort();
    assert_eq!(
        listed
            .iter()
            .map(|book| book.id.clone())
            .collect::<Vec<_>>(),
        ids
    );
    let updated = repository
        .update(&first.id, future, details("After rollback"))
        .unwrap();
    assert_eq!(updated.updated_at, "2100-01-01T00:00:00.001Z");
    assert_eq!(repository.list().unwrap()[0].id, first.id);
}

#[test]
fn missing_or_invalid_identifiers_and_tokens_have_explicit_errors() {
    let directory = tempfile::tempdir().unwrap();
    let database = database::open(directory.path()).unwrap();
    let mut connection = database.lock().unwrap();
    let mut repository = BookRepository::new(&mut connection);
    let missing = "123e4567-e89b-42d3-a456-426614174000";
    let time = "2026-10-24T00:00:00.000Z";
    assert!(matches!(repository.get(missing), Err(BookError::NotFound)));
    assert!(matches!(
        repository.update(missing, time, details("Title")),
        Err(BookError::NotFound)
    ));
    assert!(matches!(
        repository.delete(missing, time),
        Err(BookError::NotFound)
    ));
    assert!(matches!(
        repository.get("' OR 1=1 --"),
        Err(BookError::Validation(_))
    ));
    assert!(matches!(
        repository.delete(missing, "invalid"),
        Err(BookError::Validation(_))
    ));
}

#[test]
fn failed_sql_writes_roll_back_and_never_return_a_saved_snapshot() {
    let directory = tempfile::tempdir().unwrap();
    let database = database::open(directory.path()).unwrap();
    let mut connection = database.lock().unwrap();
    connection.execute_batch("CREATE TRIGGER fail_insert AFTER INSERT ON books BEGIN SELECT RAISE(ABORT, 'test insert failure'); END;").unwrap();
    assert!(matches!(
        BookRepository::new(&mut connection).create(details("No save")),
        Err(BookError::Database(_))
    ));
    assert!(
        BookRepository::new(&mut connection)
            .list()
            .unwrap()
            .is_empty()
    );
    connection
        .execute_batch("DROP TRIGGER fail_insert;")
        .unwrap();
    let book = BookRepository::new(&mut connection)
        .create(details("Original"))
        .unwrap();
    connection.execute_batch("CREATE TRIGGER fail_update AFTER UPDATE ON books BEGIN SELECT RAISE(ABORT, 'test update failure'); END;").unwrap();
    assert!(matches!(
        BookRepository::new(&mut connection).update(
            &book.id,
            &book.updated_at,
            details("No update")
        ),
        Err(BookError::Database(_))
    ));
    assert_eq!(
        BookRepository::new(&mut connection).get(&book.id).unwrap(),
        book
    );
    connection.execute_batch("DROP TRIGGER fail_update; CREATE TRIGGER fail_delete AFTER DELETE ON books BEGIN SELECT RAISE(ABORT, 'test delete failure'); END;").unwrap();
    assert!(matches!(
        BookRepository::new(&mut connection).delete(&book.id, &book.updated_at),
        Err(BookError::Database(_))
    ));
    assert_eq!(
        BookRepository::new(&mut connection).get(&book.id).unwrap(),
        book
    );
}

#[test]
fn delete_removes_only_the_selected_book_and_preserves_covered_books() {
    let directory = tempfile::tempdir().unwrap();
    let database = database::open(directory.path()).unwrap();
    let mut connection = database.lock().unwrap();
    let first = BookRepository::new(&mut connection)
        .create(details("First"))
        .unwrap();
    let second = BookRepository::new(&mut connection)
        .create(details("Second"))
        .unwrap();
    BookRepository::new(&mut connection)
        .delete(&first.id, &first.updated_at)
        .unwrap();
    assert!(matches!(
        BookRepository::new(&mut connection).get(&first.id),
        Err(BookError::NotFound)
    ));
    let cover = format!("covers/{}.png", second.id);
    std::fs::create_dir(directory.path().join("covers")).unwrap();
    std::fs::write(directory.path().join(&cover), b"test owned cover").unwrap();
    connection
        .execute(
            "UPDATE books SET cover_path = ?1 WHERE id = ?2",
            params![cover, second.id],
        )
        .unwrap();
    assert!(matches!(
        BookRepository::new(&mut connection).delete(&second.id, &second.updated_at),
        Err(BookError::CoverCleanupRequired)
    ));
    assert_eq!(
        BookRepository::new(&mut connection).list().unwrap().len(),
        1
    );
    assert_eq!(
        std::fs::read(directory.path().join(cover)).unwrap(),
        b"test owned cover"
    );
    drop(connection);
    drop(database);
    let reopened = database::open(directory.path()).unwrap();
    let mut connection = reopened.lock().unwrap();
    let repository = BookRepository::new(&mut connection);
    assert!(matches!(
        repository.get(&first.id),
        Err(BookError::NotFound)
    ));
    assert_eq!(repository.list().unwrap()[0].id, second.id);
}

#[test]
fn metadata_update_preserves_cover_and_explicit_completion() {
    let directory = tempfile::tempdir().unwrap();
    let database = database::open(directory.path()).unwrap();
    let mut connection = database.lock().unwrap();
    let book = BookRepository::new(&mut connection)
        .create(details("Original"))
        .unwrap();
    let cover = format!("covers/{}.webp", book.id);
    connection
        .execute(
            "UPDATE books SET cover_path = ?1, completed_at = created_at WHERE id = ?2",
            params![cover, book.id],
        )
        .unwrap();
    let updated = BookRepository::new(&mut connection)
        .update(&book.id, &book.updated_at, details("New title"))
        .unwrap();
    assert_eq!(updated.cover_path.as_deref(), Some(cover.as_str()));
    assert_eq!(
        updated.completed_at.as_deref(),
        Some(book.created_at.as_str())
    );
}

#[test]
fn invalid_stored_metadata_is_reported_without_silent_repair_or_discard() {
    let directory = tempfile::tempdir().unwrap();
    let database = database::open(directory.path()).unwrap();
    let mut connection = database.lock().unwrap();
    let book = BookRepository::new(&mut connection)
        .create(details("Original"))
        .unwrap();
    for (column, value) in [
        ("title", "First\nSecond"),
        ("title", "Cafe\u{301}"),
        ("title", "\u{feff}Story"),
        ("updated_at", "9999-13-24T00:00:00.000Z"),
        ("completed_at", "2100-01-01T00:00:00.000Z"),
        ("cover_path", "covers/unowned.png"),
    ] {
        // Column names are fixed test constants, never application input.
        connection
            .execute(
                &format!("UPDATE books SET {column} = ?1 WHERE id = ?2"),
                params![value, book.id],
            )
            .unwrap();
        assert!(matches!(
            BookRepository::new(&mut connection).get(&book.id),
            Err(BookError::InvalidStoredData(_))
        ));
        assert!(matches!(
            BookRepository::new(&mut connection).list(),
            Err(BookError::InvalidStoredData(_))
        ));
        assert!(matches!(
            BookRepository::new(&mut connection).delete(&book.id, &book.updated_at),
            Err(BookError::InvalidStoredData(_))
        ));
        let stored: String = connection
            .query_row(
                &format!("SELECT {column} FROM books WHERE id = ?1"),
                [&book.id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(stored, value);
        connection.execute("UPDATE books SET title = 'Original', updated_at = created_at, cover_path = NULL, completed_at = NULL WHERE id = ?1", [&book.id]).unwrap();
    }
}

#[test]
fn dto_serialization_matches_frontend_and_input_rejects_system_fields_and_wrong_types() {
    for value in [
        json!({"title":"Title","id":"injected"}),
        json!({"title":"Title","targetWordCount":"1000"}),
        json!({"title":"Title","dailyWordGoal":1.5}),
        json!({"title":123}),
    ] {
        assert!(serde_json::from_value::<BookDetails>(value).is_err());
    }
    let directory = tempfile::tempdir().unwrap();
    let database = database::open(directory.path()).unwrap();
    let mut connection = database.lock().unwrap();
    let book = BookRepository::new(&mut connection)
        .create(details("Title"))
        .unwrap();
    assert_eq!(
        serde_json::to_value(&book).unwrap(),
        json!({
            "id": book.id, "title":"Title", "targetWordCount":null, "dailyWordGoal":null,
            "deadline":null, "coverPath":null, "completedAt":null, "createdAt":book.created_at,
            "updatedAt":book.updated_at
        })
    );
}

#[test]
fn timestamp_validation_rejects_offsets_noncanonical_precision_and_leap_seconds() {
    for time in [
        "2026-10-24T00:00:00Z",
        "2026-10-24T00:00:00.000+00:00",
        "2026-02-30T00:00:00.000Z",
        "0000-01-01T00:00:00.000Z",
        "2016-12-31T23:59:60.000Z",
    ] {
        assert!(
            validation::parse_timestamp(time).is_none(),
            "accepted {time}"
        );
    }
}

#[test]
fn daily_goal_bounds_removal_and_failed_writes_survive_reopen() {
    let directory = tempfile::tempdir().unwrap();
    let saved = {
        let database = database::open(directory.path()).unwrap();
        let mut connection = database.lock().unwrap();
        let mut repository = BookRepository::new(&mut connection);
        let mut metadata = details("Daily writing");
        metadata.target_word_count = Some(10000);
        metadata.deadline = Some("2027-01-01".into());
        metadata.daily_word_goal = Some(1);
        let created = repository.create(metadata.clone()).unwrap();
        assert_eq!(created.daily_word_goal, Some(1));
        metadata.daily_word_goal = Some(9007199254740991);
        let updated = repository
            .update(&created.id, &created.updated_at, metadata.clone())
            .unwrap();
        for invalid in [0, -1, 9007199254740992] {
            metadata.daily_word_goal = Some(invalid);
            assert!(matches!(
                repository.update(&updated.id, &updated.updated_at, metadata.clone()),
                Err(BookError::Validation(_))
            ));
            assert_eq!(repository.get(&updated.id).unwrap(), updated);
        }
        metadata.daily_word_goal = Some(500);
        assert!(matches!(
            repository.update(&created.id, &created.updated_at, metadata),
            Err(BookError::Conflict)
        ));
        updated
    };
    let cleared = {
        let database = database::open(directory.path()).unwrap();
        let mut connection = database.lock().unwrap();
        let mut repository = BookRepository::new(&mut connection);
        assert_eq!(repository.get(&saved.id).unwrap(), saved);
        let metadata = BookDetails {
            title: saved.title.clone(),
            target_word_count: saved.target_word_count,
            daily_word_goal: None,
            deadline: saved.deadline.clone(),
        };
        let cleared = repository
            .update(&saved.id, &saved.updated_at, metadata)
            .unwrap();
        assert_eq!(cleared.daily_word_goal, None);
        assert_eq!(cleared.target_word_count, saved.target_word_count);
        assert_eq!(cleared.deadline, saved.deadline);
        cleared
    };
    let database = database::open(directory.path()).unwrap();
    let mut connection = database.lock().unwrap();
    assert_eq!(
        BookRepository::new(&mut connection).get(&saved.id).unwrap(),
        cleared
    );
}

#[test]
fn total_goals_preserve_completion_and_writing_and_survive_reopen_and_removal() {
    let directory = tempfile::tempdir().unwrap();
    let (saved, chapter_id) = {
        let database = database::open(directory.path()).unwrap();
        let mut connection = database.lock().unwrap();
        let mut metadata = details("Book goal");
        metadata.target_word_count = Some(1);
        metadata.daily_word_goal = Some(500);
        metadata.deadline = Some("2027-01-01".into());
        let book = BookRepository::new(&mut connection)
            .create(metadata.clone())
            .unwrap();
        let chapter = crate::chapters::ChapterRepository::new(&mut connection)
            .create(
                &book.id,
                crate::chapters::ChapterDetails {
                    title: "Chapter".into(),
                },
            )
            .unwrap();
        let content = json!({"schemaVersion":1,"document":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"two words"}]}]}}).to_string();
        let written = crate::chapters::ChapterRepository::new(&mut connection)
            .save_content(
                &book.id,
                &chapter.summary.id,
                chapter.summary.revision,
                &content,
            )
            .unwrap();
        assert_eq!(written.summary.word_count, Some(2));
        let mut repository = BookRepository::new(&mut connection);
        assert_eq!(repository.get(&book.id).unwrap().completed_at, None);
        metadata.target_word_count = Some(9007199254740991);
        let updated = repository
            .update(&book.id, &book.updated_at, metadata.clone())
            .unwrap();
        for invalid in [0, -1, 9007199254740992] {
            metadata.target_word_count = Some(invalid);
            assert!(matches!(
                repository.update(&updated.id, &updated.updated_at, metadata.clone()),
                Err(BookError::Validation(_))
            ));
            assert_eq!(repository.get(&updated.id).unwrap(), updated);
        }
        metadata.target_word_count = Some(10);
        assert!(matches!(
            repository.update(&book.id, &book.updated_at, metadata),
            Err(BookError::Conflict)
        ));
        assert_eq!(repository.get(&updated.id).unwrap(), updated);
        (updated, chapter.summary.id)
    };
    let cleared = {
        let database = database::open(directory.path()).unwrap();
        let mut connection = database.lock().unwrap();
        assert_eq!(
            BookRepository::new(&mut connection).get(&saved.id).unwrap(),
            saved
        );
        assert_eq!(
            crate::chapters::ChapterRepository::new(&mut connection)
                .get(&saved.id, &chapter_id)
                .unwrap()
                .summary
                .word_count,
            Some(2)
        );
        BookRepository::new(&mut connection)
            .update(
                &saved.id,
                &saved.updated_at,
                BookDetails {
                    title: saved.title.clone(),
                    target_word_count: None,
                    daily_word_goal: saved.daily_word_goal,
                    deadline: saved.deadline.clone(),
                },
            )
            .unwrap()
    };
    let database = database::open(directory.path()).unwrap();
    let mut connection = database.lock().unwrap();
    assert_eq!(
        BookRepository::new(&mut connection).get(&saved.id).unwrap(),
        cleared
    );
    assert_eq!(cleared.target_word_count, None);
    assert_eq!(cleared.completed_at, None);
    assert_eq!(cleared.daily_word_goal, Some(500));
    assert_eq!(cleared.deadline, Some("2027-01-01".into()));
    assert_eq!(
        crate::chapters::ChapterRepository::new(&mut connection)
            .get(&saved.id, &chapter_id)
            .unwrap()
            .summary
            .word_count,
        Some(2)
    );
}

#[test]
fn deadline_dates_validate_preserve_goals_and_survive_reopen_and_removal() {
    let directory = tempfile::tempdir().unwrap();
    let saved = {
        let database = database::open(directory.path()).unwrap();
        let mut connection = database.lock().unwrap();
        let mut repository = BookRepository::new(&mut connection);
        let mut metadata = details("Calendar book");
        metadata.target_word_count = Some(10000);
        metadata.daily_word_goal = Some(500);
        let created = repository.create(metadata.clone()).unwrap();
        assert_eq!(created.deadline, None);
        let mut saved = created.clone();
        for date in ["0001-01-01", "9999-12-31", "2024-02-29", "2026-10-27"] {
            metadata.deadline = Some(date.into());
            saved = repository
                .update(&saved.id, &saved.updated_at, metadata.clone())
                .unwrap();
            assert_eq!(saved.deadline.as_deref(), Some(date));
        }
        for date in [
            "0000-01-01",
            "10000-01-01",
            "1900-02-29",
            "2026-02-29",
            "2026-02-30",
            "2026-10-27T00:00:00Z",
        ] {
            metadata.deadline = Some(date.into());
            assert!(matches!(
                repository.update(&saved.id, &saved.updated_at, metadata.clone()),
                Err(BookError::Validation(_))
            ));
            assert_eq!(repository.get(&saved.id).unwrap(), saved);
        }
        metadata.deadline = Some("2026-10-28".into());
        assert!(matches!(
            repository.update(&created.id, &created.updated_at, metadata),
            Err(BookError::Conflict)
        ));
        assert_eq!(repository.get(&saved.id).unwrap(), saved);
        saved
    };
    let cleared = {
        let database = database::open(directory.path()).unwrap();
        let mut connection = database.lock().unwrap();
        let mut repository = BookRepository::new(&mut connection);
        assert_eq!(repository.get(&saved.id).unwrap(), saved);
        repository
            .update(
                &saved.id,
                &saved.updated_at,
                BookDetails {
                    title: saved.title.clone(),
                    target_word_count: saved.target_word_count,
                    daily_word_goal: saved.daily_word_goal,
                    deadline: None,
                },
            )
            .unwrap()
    };
    let database = database::open(directory.path()).unwrap();
    let mut connection = database.lock().unwrap();
    assert_eq!(
        BookRepository::new(&mut connection).get(&saved.id).unwrap(),
        cleared
    );
    assert_eq!(cleared.deadline, None);
    assert_eq!(cleared.target_word_count, Some(10000));
    assert_eq!(cleared.daily_word_goal, Some(500));
    assert_eq!(cleared.completed_at, None);
}
