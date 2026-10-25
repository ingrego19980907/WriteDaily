use super::*;
use crate::{
    books::{BookDetails, BookRepository},
    database,
};
use rusqlite::{Connection, params};
use serde_json::json;

#[test]
fn shared_content_contract_matches_typescript() {
    let cases: Vec<serde_json::Value> =
        serde_json::from_str(include_str!("../../../tests/fixtures/chapter-content.json")).unwrap();
    for case in cases {
        let parsed = ChapterContent::parse(&case["input"].to_string());
        assert_eq!(
            parsed.is_ok(),
            case["valid"].as_bool().unwrap(),
            "{}",
            case["name"]
        );
        if let Ok(content) = parsed {
            let serialized = serde_json::to_string(&content).unwrap();
            assert_eq!(ChapterContent::parse(&serialized).unwrap(), content);
        }
    }
}

#[test]
fn sqlite_constraints_reject_invalid_chapter_storage() {
    let directory = tempfile::tempdir().unwrap();
    let database = database::open(directory.path()).unwrap();
    let mut connection = database.lock().unwrap();
    let parent = book(&mut connection);
    ChapterRepository::new(&mut connection)
        .create(&parent.id, details("x"))
        .unwrap();
    ChapterRepository::new(&mut connection)
        .create(&parent.id, details("x"))
        .unwrap();
    for statement in [
        "UPDATE chapters SET id = 'invalid'",
        "UPDATE chapters SET book_id = 'missing'",
        "UPDATE chapters SET position = -1",
        "UPDATE chapters SET position = 0",
        "UPDATE chapters SET position = 9007199254740992",
        "UPDATE chapters SET position = 1.5",
        "UPDATE chapters SET title = ''",
        "UPDATE chapters SET title = ' padded '",
        "UPDATE chapters SET revision = 0",
        "UPDATE chapters SET revision = 9007199254740992",
        "UPDATE chapters SET word_count = -1",
        "UPDATE chapters SET word_count = 9007199254740992",
        "UPDATE chapters SET content_schema_version = 0",
        "UPDATE chapters SET content_json = 'invalid JSON'",
        "UPDATE chapters SET updated_at = '2000-01-01T00:00:00.000Z'",
    ] {
        assert!(
            connection.execute(statement, []).is_err(),
            "accepted: {statement}"
        );
    }
    assert!(
        connection
            .execute(
                "UPDATE chapters SET content_json = ?1",
                [format!("\"{}\"", "x".repeat(content::MAX_BYTES))]
            )
            .is_err()
    );
    assert_eq!(
        ChapterRepository::new(&mut connection)
            .list(&parent.id)
            .unwrap()
            .len(),
        2
    );
}

fn book(connection: &mut Connection) -> crate::books::Book {
    BookRepository::new(connection)
        .create(BookDetails {
            title: "Book".into(),
            target_word_count: None,
            daily_word_goal: None,
            deadline: None,
        })
        .unwrap()
}
fn details(title: &str) -> ChapterDetails {
    ChapterDetails {
        title: title.into(),
    }
}
fn order(chapters: &[ChapterSummary]) -> Vec<ChapterOrderEntry> {
    chapters
        .iter()
        .map(|chapter| ChapterOrderEntry {
            id: chapter.id.clone(),
            revision: chapter.revision,
        })
        .collect()
}
fn ids(chapters: &[ChapterSummary]) -> Vec<String> {
    chapters.iter().map(|chapter| chapter.id.clone()).collect()
}
fn body(text: &str) -> String {
    json!({"schemaVersion":1,"document":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":text,"marks":[{"type":"bold"},{"type":"italic"}]}]}]}}).to_string()
}

#[test]
fn crud_preserves_unicode_writing_counts_and_parent_across_reopen() {
    let directory = tempfile::tempdir().unwrap();
    let database = database::open(directory.path()).unwrap();
    let mut connection = database.lock().unwrap();
    let parent = book(&mut connection);
    let mut repository = ChapterRepository::new(&mut connection);
    assert!(repository.list(&parent.id).unwrap().is_empty());
    let original = repository
        .create(&parent.id, details(" \u{feff}Розділ e\u{301} "))
        .unwrap();
    assert_eq!(original.summary.title, "Розділ é");
    assert_eq!(
        (
            original.summary.position,
            original.summary.revision,
            original.summary.word_count
        ),
        (0, 1, Some(0))
    );
    let duplicate = repository.create(&parent.id, details("Розділ é")).unwrap();
    assert_ne!(original.summary.id, duplicate.summary.id);
    let text = "  Україна 🖋️ e\u{301}\n\t<tag>\u{0000}  ";
    let raw = body(text);
    let saved = repository
        .save_content(&parent.id, &original.summary.id, 1, &raw)
        .unwrap();
    assert_eq!(
        serde_json::to_value(&saved.content).unwrap()["document"]["content"][0]["content"][0]["text"],
        text
    );
    assert_eq!(saved.summary.word_count, None);
    let renamed = repository
        .rename(&parent.id, &saved.summary.id, 2, details("Renamed"))
        .unwrap();
    assert_eq!(renamed.content, saved.content);
    assert_eq!(renamed.summary.created_at, original.summary.created_at);
    assert!(renamed.summary.updated_at > saved.summary.updated_at);
    assert_eq!(renamed.summary.revision, 3);
    assert!(matches!(
        repository.save_content(&parent.id, &saved.summary.id, 2, &body("stale")),
        Err(ChapterError::Conflict)
    ));
    assert!(matches!(
        repository.delete(&parent.id, &saved.summary.id, 2),
        Err(ChapterError::Conflict)
    ));
    assert_eq!(
        repository.get(&parent.id, &saved.summary.id).unwrap(),
        renamed
    );
    assert_eq!(
        BookRepository::new(&mut connection)
            .get(&parent.id)
            .unwrap(),
        parent
    );
    drop(connection);
    drop(database);
    let reopened = database::open(directory.path()).unwrap();
    let mut connection = reopened.lock().unwrap();
    let mut repository = ChapterRepository::new(&mut connection);
    assert_eq!(
        repository.get(&parent.id, &saved.summary.id).unwrap(),
        renamed
    );
    let remaining = repository.delete(&parent.id, &saved.summary.id, 3).unwrap();
    assert_eq!(
        (
            remaining[0].position,
            remaining[0].revision,
            remaining[0].word_count
        ),
        (0, 2, Some(0))
    );
    assert_eq!(remaining[0].id, duplicate.summary.id);
    assert!(matches!(
        repository.get(&parent.id, &saved.summary.id),
        Err(ChapterError::NotFound)
    ));
}

#[test]
fn reorder_validates_full_snapshot_and_permutation_without_touching_unchanged_rows() {
    let directory = tempfile::tempdir().unwrap();
    let database = database::open(directory.path()).unwrap();
    let mut connection = database.lock().unwrap();
    let parent = book(&mut connection);
    let other = book(&mut connection);
    let mut repository = ChapterRepository::new(&mut connection);
    for _ in 0..3 {
        repository.create(&parent.id, details("Same")).unwrap();
    }
    let foreign = repository.create(&other.id, details("Other")).unwrap();
    let before = repository.list(&parent.id).unwrap();
    assert_eq!(
        repository
            .reorder(&parent.id, &order(&before), &ids(&before))
            .unwrap(),
        before
    );
    for invalid in [
        vec![before[0].id.clone(); 3],
        vec![before[0].id.clone()],
        vec![
            before[0].id.clone(),
            before[1].id.clone(),
            foreign.summary.id.clone(),
        ],
    ] {
        assert!(matches!(
            repository.reorder(&parent.id, &order(&before), &invalid),
            Err(ChapterError::Validation("invalid_order"))
        ));
        assert_eq!(repository.list(&parent.id).unwrap(), before);
    }
    let mut reversed = ids(&before);
    reversed.reverse();
    let after = repository
        .reorder(&parent.id, &order(&before), &reversed)
        .unwrap();
    assert_eq!(ids(&after), reversed);
    assert_eq!(after[1], before[1]);
    assert_eq!(after[0].revision, 2);
    assert_eq!(after[2].revision, 2);
    assert_eq!(after[0].created_at, before[2].created_at);
    assert!(matches!(
        repository.reorder(&parent.id, &order(&before), &ids(&before)),
        Err(ChapterError::Conflict)
    ));
    assert!(matches!(
        repository.rename(&parent.id, &after[0].id, 1, details("Stale")),
        Err(ChapterError::Conflict)
    ));
    let snapshot = after;
    repository.create(&parent.id, details("Added")).unwrap();
    assert!(matches!(
        repository.reorder(&parent.id, &order(&snapshot), &ids(&snapshot)),
        Err(ChapterError::Conflict)
    ));
}

#[test]
fn ownership_missing_parents_invalid_inputs_and_cascade_are_enforced() {
    let directory = tempfile::tempdir().unwrap();
    let database = database::open(directory.path()).unwrap();
    let mut connection = database.lock().unwrap();
    let parent = book(&mut connection);
    let other = book(&mut connection);
    let mut repository = ChapterRepository::new(&mut connection);
    let chapter = repository.create(&parent.id, details("x")).unwrap();
    for title in ["", "  ", "a\u{85}b", &"🖋".repeat(201)] {
        assert!(matches!(
            repository.create(&parent.id, details(title)),
            Err(ChapterError::Validation(_))
        ));
    }
    assert!(
        repository
            .create(&parent.id, details(&"🖋".repeat(200)))
            .is_ok()
    );
    for token in [0, -1, MAX_SAFE_INTEGER + 1] {
        assert!(matches!(
            repository.rename(&parent.id, &chapter.summary.id, token, details("x")),
            Err(ChapterError::Validation("invalid_revision"))
        ));
    }
    assert!(matches!(
        repository.get(&other.id, &chapter.summary.id),
        Err(ChapterError::NotFound)
    ));
    assert!(matches!(
        repository.delete(&other.id, &chapter.summary.id, 1),
        Err(ChapterError::NotFound)
    ));
    assert!(matches!(
        repository.list("bad id"),
        Err(ChapterError::Validation("invalid_id"))
    ));
    assert!(matches!(
        repository.create(&uuid::Uuid::new_v4().to_string(), details("x")),
        Err(ChapterError::NotFound)
    ));
    BookRepository::new(&mut connection)
        .delete(&parent.id, &parent.updated_at)
        .unwrap();
    assert_eq!(
        connection
            .query_row("SELECT count(*) FROM chapters", [], |row| row
                .get::<_, i64>(0))
            .unwrap(),
        0
    );
    assert!(BookRepository::new(&mut connection).get(&other.id).is_ok());
}

#[test]
fn stale_writes_from_two_connections_never_overwrite_committed_writing() {
    let directory = tempfile::tempdir().unwrap();
    let first = database::open(directory.path()).unwrap();
    let mut first = first.lock().unwrap();
    let parent = book(&mut first);
    let original = ChapterRepository::new(&mut first)
        .create(&parent.id, details("x"))
        .unwrap();
    let second = database::open(directory.path()).unwrap();
    let mut second = second.lock().unwrap();
    let snapshot = ChapterRepository::new(&mut second)
        .get(&parent.id, &original.summary.id)
        .unwrap();
    let saved = ChapterRepository::new(&mut first)
        .save_content(&parent.id, &original.summary.id, 1, &body("Committed"))
        .unwrap();
    assert!(matches!(
        ChapterRepository::new(&mut second).save_content(
            &parent.id,
            &snapshot.summary.id,
            snapshot.summary.revision,
            &body("Lost edit")
        ),
        Err(ChapterError::Conflict)
    ));
    assert_eq!(
        ChapterRepository::new(&mut second)
            .get(&parent.id, &original.summary.id)
            .unwrap(),
        saved
    );
}

#[test]
fn failed_reorder_delete_update_and_commit_roll_back_all_changes() {
    let directory = tempfile::tempdir().unwrap();
    let database = database::open(directory.path()).unwrap();
    let mut connection = database.lock().unwrap();
    let parent = book(&mut connection);
    for _ in 0..3 {
        ChapterRepository::new(&mut connection)
            .create(&parent.id, details("x"))
            .unwrap();
    }
    let before = ChapterRepository::new(&mut connection)
        .list(&parent.id)
        .unwrap();
    connection.execute_batch("CREATE TRIGGER fail_change BEFORE UPDATE ON chapters WHEN NEW.position = 0 OR NEW.revision > OLD.revision BEGIN SELECT RAISE(ABORT, 'injected failure'); END;").unwrap();
    let mut reversed = ids(&before);
    reversed.reverse();
    assert!(
        ChapterRepository::new(&mut connection)
            .reorder(&parent.id, &order(&before), &reversed)
            .is_err()
    );
    assert!(
        ChapterRepository::new(&mut connection)
            .delete(&parent.id, &before[0].id, 1)
            .is_err()
    );
    assert!(
        ChapterRepository::new(&mut connection)
            .save_content(&parent.id, &before[0].id, 1, &body("failed"))
            .is_err()
    );
    assert_eq!(
        ChapterRepository::new(&mut connection)
            .list(&parent.id)
            .unwrap(),
        before
    );
    connection.execute_batch("DROP TRIGGER fail_change; CREATE TABLE commit_probe (id INTEGER REFERENCES books(id) DEFERRABLE INITIALLY DEFERRED); CREATE TRIGGER fail_commit AFTER INSERT ON chapters BEGIN INSERT INTO commit_probe VALUES (999); END;").unwrap();
    assert!(
        ChapterRepository::new(&mut connection)
            .create(&parent.id, details("commit fails"))
            .is_err()
    );
    assert_eq!(
        ChapterRepository::new(&mut connection)
            .list(&parent.id)
            .unwrap(),
        before
    );
    assert_eq!(
        connection
            .query_row("SELECT count(*) FROM commit_probe", [], |row| row
                .get::<_, i64>(0))
            .unwrap(),
        0
    );
}

#[test]
fn revision_overflow_rolls_back_reorder_and_gap_closing_deletion() {
    let directory = tempfile::tempdir().unwrap();
    let database = database::open(directory.path()).unwrap();
    let mut connection = database.lock().unwrap();
    let parent = book(&mut connection);
    for _ in 0..3 {
        ChapterRepository::new(&mut connection)
            .create(&parent.id, details("x"))
            .unwrap();
    }
    connection
        .execute(
            "UPDATE chapters SET revision = ?1 WHERE position = 2",
            [MAX_SAFE_INTEGER],
        )
        .unwrap();
    let before = ChapterRepository::new(&mut connection)
        .list(&parent.id)
        .unwrap();
    let mut reversed = ids(&before);
    reversed.reverse();
    assert!(matches!(
        ChapterRepository::new(&mut connection).rename(
            &parent.id,
            &before[2].id,
            MAX_SAFE_INTEGER,
            details("overflow")
        ),
        Err(ChapterError::LimitReached)
    ));
    assert!(matches!(
        ChapterRepository::new(&mut connection).reorder(&parent.id, &order(&before), &reversed),
        Err(ChapterError::LimitReached)
    ));
    assert!(matches!(
        ChapterRepository::new(&mut connection).delete(&parent.id, &before[0].id, 1),
        Err(ChapterError::LimitReached)
    ));
    assert_eq!(
        ChapterRepository::new(&mut connection)
            .list(&parent.id)
            .unwrap(),
        before
    );
}

#[test]
fn corrupt_or_unsupported_stored_content_and_order_are_not_repaired() {
    let directory = tempfile::tempdir().unwrap();
    let database = database::open(directory.path()).unwrap();
    let mut connection = database.lock().unwrap();
    let parent = book(&mut connection);
    let chapter = ChapterRepository::new(&mut connection)
        .create(&parent.id, details("x"))
        .unwrap();
    let original: String = connection
        .query_row("SELECT content_json FROM chapters", [], |row| row.get(0))
        .unwrap();
    for statement in [
        "UPDATE chapters SET content_schema_version = 2",
        "UPDATE chapters SET content_json = '{\"type\":\"doc\",\"content\":[]}'",
        "UPDATE chapters SET position = 1",
        "UPDATE chapters SET title = 'e' || char(769)",
        "UPDATE chapters SET updated_at = '9999-99-99T00:00:00.000Z'",
    ] {
        connection.execute_batch(statement).unwrap();
        assert!(matches!(
            ChapterRepository::new(&mut connection).get(&parent.id, &chapter.summary.id),
            Err(ChapterError::InvalidStoredData)
        ));
        assert!(
            ChapterRepository::new(&mut connection)
                .rename(&parent.id, &chapter.summary.id, 1, details("repair"))
                .is_err()
        );
        assert!(
            ChapterRepository::new(&mut connection)
                .create(&parent.id, details("repair"))
                .is_err()
        );
        connection.execute("UPDATE chapters SET content_schema_version = 1, content_json = ?1, position = 0, title = 'x', updated_at = ?2", params![original, chapter.summary.updated_at]).unwrap();
    }
    assert_eq!(
        ChapterRepository::new(&mut connection)
            .get(&parent.id, &chapter.summary.id)
            .unwrap(),
        chapter
    );
}

#[test]
fn invalid_content_never_changes_revision_or_saved_bytes() {
    let directory = tempfile::tempdir().unwrap();
    let database = database::open(directory.path()).unwrap();
    let mut connection = database.lock().unwrap();
    let parent = book(&mut connection);
    let mut repository = ChapterRepository::new(&mut connection);
    let chapter = repository.create(&parent.id, details("x")).unwrap();
    for raw in [
        "{}",
        "null",
        "{\"schemaVersion\":2,\"document\":{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\"}]}}",
        "{\"schemaVersion\":1,\"document\":{\"type\":\"doc\",\"content\":[]}}",
        "{\"schemaVersion\":1,\"document\":{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":null}]}}",
        "{\"schemaVersion\":1,\"schemaVersion\":2,\"document\":{}}",
    ] {
        assert!(matches!(
            repository.save_content(&parent.id, &chapter.summary.id, 1, raw),
            Err(ChapterError::Validation(_))
        ));
        assert_eq!(
            repository.get(&parent.id, &chapter.summary.id).unwrap(),
            chapter
        );
    }
}

#[test]
fn native_content_accepts_supported_grammar_and_rejects_extensions() {
    let valid = json!({"schemaVersion":1,"document":{"type":"doc","content":[{"type":"heading","attrs":{"level":6},"content":[{"type":"hardBreak","marks":[{"type":"italic"}]}]},{"type":"orderedList","attrs":{"start":MAX_SAFE_INTEGER,"type":"I"},"content":[{"type":"listItem","content":[{"type":"paragraph"},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph"}]}]}]}]}]}});
    assert!(ChapterContent::parse(&valid.to_string()).is_ok());
    let invalid = [
        json!({"type":"image"}),
        json!({"type":"paragraph","attrs":{}}),
        json!({"type":"heading","attrs":{"level":7}}),
        json!({"type":"bulletList","content":[]}),
        json!({"type":"listItem","content":[{"type":"heading","attrs":{"level":1}}]}),
        json!({"type":"text","text":"x"}),
        json!({"type":"paragraph","content":[{"type":"text","text":""}]}),
        json!({"type":"paragraph","content":[{"type":"text","text":"x","marks":[{"type":"bold"},{"type":"bold"}]}]}),
        json!({"type":"paragraph","content":[{"type":"hardBreak","marks":[{"type":"link"}]}]}),
    ];
    for node in invalid {
        assert!(
            ChapterContent::parse(
                &json!({"schemaVersion":1,"document":{"type":"doc","content":[node]}}).to_string()
            )
            .is_err()
        );
    }
}

#[test]
fn native_content_bounds_utf8_bytes_nodes_and_depth_before_persistence() {
    let overhead = body("x").len() - 1;
    assert!(ChapterContent::parse(&body(&"x".repeat(content::MAX_BYTES - overhead))).is_ok());
    assert!(matches!(
        ChapterContent::parse(&body(&"x".repeat(content::MAX_BYTES - overhead + 1))),
        Err(ChapterError::Validation("too_large"))
    ));
    assert!(ChapterContent::parse(&body(&"🖋".repeat(content::MAX_BYTES / 4))).is_err());
    let many = json!({"schemaVersion":1,"document":{"type":"doc","content":vec![json!({"type":"paragraph"});100_000]}}).to_string();
    assert!(matches!(
        ChapterContent::parse(&many),
        Err(ChapterError::Validation("too_large"))
    ));
    // Each nested list adds list + listItem + child; depth 64 is supported.
    let mut node = json!({"type":"paragraph"});
    for _ in 0..31 {
        node = json!({"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph"},node]}]});
    }
    let raw =
        json!({"schemaVersion":1,"document":{"type":"doc","content":[node.clone()]}}).to_string();
    assert!(ChapterContent::parse(&raw).is_ok());
    let deeper = json!({"schemaVersion":1,"document":{"type":"doc","content":[{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph"},node]}]}]}}).to_string();
    assert!(matches!(
        ChapterContent::parse(&deeper),
        Err(ChapterError::Validation("too_deep"))
    ));
    assert!(ChapterContent::parse(&"[".repeat(197)).is_err());
}
