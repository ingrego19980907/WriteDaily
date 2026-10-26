use super::*;
use crate::{
    books::{BookDetails, BookRepository},
    database,
};
use serde_json::{Value, json};

fn details() -> ChapterDetails {
    ChapterDetails {
        title: "A title that does not count".into(),
    }
}
fn text_content(text: &str) -> String {
    let paragraph = if text.is_empty() {
        json!({"type":"paragraph"})
    } else {
        json!({"type":"paragraph","content":[{"type":"text","text":text}]})
    };
    json!({"schemaVersion":1,"document":{"type":"doc","content":[paragraph]}}).to_string()
}
fn book(connection: &mut rusqlite::Connection) -> crate::books::Book {
    BookRepository::new(connection)
        .create(BookDetails {
            title: "Book".into(),
            target_word_count: None,
            daily_word_goal: None,
            deadline: None,
        })
        .unwrap()
}

#[test]
fn shared_text_word_count_contract() {
    let cases: Vec<Value> =
        serde_json::from_str(include_str!("../../../tests/fixtures/word-count.json")).unwrap();
    for case in cases {
        let text = case["text"].as_str().unwrap();
        let expected = case["expected"].as_i64().unwrap();
        let mut counter = super::word_count::WordCounter::default();
        counter.push(text);
        assert_eq!(counter.count, expected, "{}", case["name"]);
        let content = ChapterContent::parse(&text_content(text)).unwrap();
        assert_eq!(content.word_count(), expected, "{}", case["name"]);
    }
}

#[test]
fn shared_document_word_count_contract() {
    let cases: Vec<Value> = serde_json::from_str(include_str!(
        "../../../tests/fixtures/word-count-documents.json"
    ))
    .unwrap();
    for case in cases {
        let content = ChapterContent::parse(&case["content"].to_string()).unwrap();
        assert_eq!(
            content.word_count(),
            case["expected"].as_i64().unwrap(),
            "{}",
            case["name"]
        );
    }
}

#[test]
fn unicode_categories_are_pinned_sorted_and_disjoint() {
    let data: Value = serde_json::from_str(include_str!(
        "../../../resources/unicode/word-categories-17.0.0.json"
    ))
    .unwrap();
    assert_eq!(data["unicodeVersion"], "17.0.0");
    assert_eq!(
        data["sourceSha256"],
        "2e1efc1dcb59c575eedf5ccae60f95229f706ee6d031835247d843c11d96470c"
    );
    let mut previous: Option<u64> = None;
    for range in data["ranges"].as_array().unwrap() {
        let start = range[0].as_u64().unwrap();
        let end = range[1].as_u64().unwrap();
        let kind = range[2].as_u64().unwrap();
        assert!(previous.is_none_or(|value| start > value));
        assert!(start <= end && end <= 0x10ffff && (1..=3).contains(&kind));
        previous = Some(end);
    }
}

#[test]
fn counts_commit_with_content_survive_reopen_and_metadata_order_changes() {
    let directory = tempfile::tempdir().unwrap();
    let db = database::open(directory.path()).unwrap();
    let mut connection = db.lock().unwrap();
    let parent = book(&mut connection);
    let mut repository = ChapterRepository::new(&mut connection);
    let original = repository.create(&parent.id, details()).unwrap();
    let other = repository.create(&parent.id, details()).unwrap();
    let written = repository
        .save_content(
            &parent.id,
            &original.summary.id,
            1,
            &text_content("п'ять foo-bar 12,500.75 😀 e\u{301}"),
        )
        .unwrap();
    assert_eq!(written.summary.word_count, Some(4));
    let renamed = repository
        .rename(
            &parent.id,
            &original.summary.id,
            2,
            ChapterDetails {
                title: "Renamed".into(),
            },
        )
        .unwrap();
    assert_eq!(renamed.summary.word_count, Some(4));
    let before = repository.list(&parent.id).unwrap();
    let expected: Vec<_> = before
        .iter()
        .map(|chapter| ChapterOrderEntry {
            id: chapter.id.clone(),
            revision: chapter.revision,
        })
        .collect();
    let after = repository
        .reorder(
            &parent.id,
            &expected,
            &[other.summary.id.clone(), original.summary.id.clone()],
        )
        .unwrap();
    assert_eq!(after[1].word_count, Some(4));
    assert_eq!(after[1].revision, 4);
    drop(connection);
    drop(db);
    let db = database::open(directory.path()).unwrap();
    let mut connection = db.lock().unwrap();
    assert_eq!(
        connection
            .query_row(
                "SELECT word_count FROM chapters WHERE id = ?1",
                [&original.summary.id],
                |row| row.get::<_, i64>(0)
            )
            .unwrap(),
        4
    );
    let mut repository = ChapterRepository::new(&mut connection);
    let reopened = repository.get(&parent.id, &original.summary.id).unwrap();
    assert_eq!(reopened.content, written.content);
    assert_eq!(reopened.summary.word_count, Some(4));
    let empty = repository
        .save_content(&parent.id, &original.summary.id, 4, &text_content(""))
        .unwrap();
    assert_eq!(empty.summary.word_count, Some(0));
    assert!(matches!(
        repository.save_content(
            &parent.id,
            &original.summary.id,
            4,
            &text_content("stale newer count")
        ),
        Err(ChapterError::Conflict)
    ));
    assert_eq!(
        repository.get(&parent.id, &original.summary.id).unwrap(),
        empty
    );
}

#[test]
fn failed_commit_rolls_back_count_content_and_revision_together() {
    let directory = tempfile::tempdir().unwrap();
    let db = database::open(directory.path()).unwrap();
    let mut connection = db.lock().unwrap();
    let parent = book(&mut connection);
    let original = ChapterRepository::new(&mut connection)
        .create(&parent.id, details())
        .unwrap();
    connection.execute_batch("CREATE TABLE count_commit_probe (book_id TEXT REFERENCES books(id) DEFERRABLE INITIALLY DEFERRED); CREATE TRIGGER fail_count_commit AFTER UPDATE ON chapters BEGIN INSERT INTO count_commit_probe VALUES ('missing'); END;").unwrap();
    assert!(
        ChapterRepository::new(&mut connection)
            .save_content(
                &parent.id,
                &original.summary.id,
                1,
                &text_content("These four words count")
            )
            .is_err()
    );
    assert_eq!(
        ChapterRepository::new(&mut connection)
            .get(&parent.id, &original.summary.id)
            .unwrap(),
        original
    );
    assert_eq!(
        connection
            .query_row("SELECT count(*) FROM count_commit_probe", [], |row| row
                .get::<_, i64>(0))
            .unwrap(),
        0
    );
}

#[test]
fn legacy_unknown_counts_stay_unknown_and_mismatched_known_counts_are_not_repaired() {
    let directory = tempfile::tempdir().unwrap();
    let db = database::open(directory.path()).unwrap();
    let mut connection = db.lock().unwrap();
    let parent = book(&mut connection);
    let original = ChapterRepository::new(&mut connection)
        .create(&parent.id, details())
        .unwrap();
    let saved = ChapterRepository::new(&mut connection)
        .save_content(
            &parent.id,
            &original.summary.id,
            1,
            &text_content("two words"),
        )
        .unwrap();
    connection
        .execute(
            "UPDATE chapters SET word_count = NULL WHERE id = ?1",
            [&original.summary.id],
        )
        .unwrap();
    let legacy = ChapterRepository::new(&mut connection)
        .get(&parent.id, &original.summary.id)
        .unwrap();
    assert_eq!(legacy.summary.word_count, None);
    assert_eq!(legacy.content, saved.content);
    assert_eq!(legacy.summary.revision, 2);
    let renamed = ChapterRepository::new(&mut connection)
        .rename(&parent.id, &original.summary.id, 2, details())
        .unwrap();
    assert_eq!(renamed.summary.word_count, None);
    let refreshed = ChapterRepository::new(&mut connection)
        .save_content(
            &parent.id,
            &original.summary.id,
            3,
            &text_content("two words"),
        )
        .unwrap();
    assert_eq!(refreshed.summary.word_count, Some(2));
    connection
        .execute(
            "UPDATE chapters SET word_count = 99 WHERE id = ?1",
            [&original.summary.id],
        )
        .unwrap();
    assert!(matches!(
        ChapterRepository::new(&mut connection).get(&parent.id, &original.summary.id),
        Err(ChapterError::InvalidStoredData)
    ));
    assert!(
        ChapterRepository::new(&mut connection)
            .rename(&parent.id, &original.summary.id, 4, details())
            .is_err()
    );
    assert_eq!(
        connection
            .query_row(
                "SELECT word_count FROM chapters WHERE id = ?1",
                [&original.summary.id],
                |row| row.get::<_, i64>(0)
            )
            .unwrap(),
        99
    );
}
