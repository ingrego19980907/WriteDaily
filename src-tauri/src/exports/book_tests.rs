use super::*;
use crate::{
    books::{self, Book, BookDetails, BookRepository},
    chapters::{Chapter, ChapterDetails},
    database,
};
use serde_json::json;

fn body(text: &str) -> String {
    json!({"schemaVersion":1,"document":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":text}]}]}}).to_string()
}
fn seed(c: &mut Connection) -> (Book, Vec<Chapter>) {
    let book = BookRepository::new(c)
        .create(BookDetails {
            title: "Книга 🌿".into(),
            target_word_count: None,
            daily_word_goal: None,
            deadline: None,
        })
        .unwrap();
    let mut chapters = Vec::new();
    for (title, text) in [
        ("Zulu", Some("First <b>literal</b>")),
        ("Однакова назва", Some("Другий текст e\u{301} 🌿")),
        ("Однакова назва", None),
    ] {
        let chapter = ChapterRepository::new(c)
            .create(
                &book.id,
                ChapterDetails {
                    title: title.into(),
                },
            )
            .unwrap();
        chapters.push(if let Some(text) = text {
            ChapterRepository::new(c)
                .save_content(
                    &book.id,
                    &chapter.summary.id,
                    chapter.summary.revision,
                    &body(text),
                )
                .unwrap()
        } else {
            chapter
        });
    }
    (books::load(c, &book.id).unwrap(), chapters)
}
fn entries(chapters: &[Chapter]) -> Vec<ChapterOrderEntry> {
    chapters
        .iter()
        .map(|chapter| ChapterOrderEntry {
            id: chapter.summary.id.clone(),
            revision: chapter.summary.revision,
        })
        .collect()
}
fn load(
    c: &mut Connection,
    book: &Book,
    chapters: &[Chapter],
) -> Result<SavedBookExport, ExportError> {
    SavedBookExport::load(c, &book.id, &book.updated_at, &entries(chapters))
}

#[test]
fn book_export_follows_persisted_reorder_keeps_duplicate_titles_empty_chapters_and_other_books_private()
 {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let (book, chapters) = seed(&mut c);
    let (_, other) = seed(&mut c);
    ChapterRepository::new(&mut c)
        .save_content(
            &other[0].summary.book_id,
            &other[0].summary.id,
            other[0].summary.revision,
            &body("DO NOT EXPORT ANOTHER BOOK"),
        )
        .unwrap();
    let order = [
        chapters[2].summary.id.clone(),
        chapters[0].summary.id.clone(),
        chapters[1].summary.id.clone(),
    ];
    let committed = ChapterRepository::new(&mut c)
        .reorder(&book.id, &entries(&chapters), &order)
        .unwrap();
    let expected: Vec<_> = committed
        .iter()
        .map(|row| ChapterOrderEntry {
            id: row.id.clone(),
            revision: row.revision,
        })
        .collect();
    let snapshot = SavedBookExport::load(&mut c, &book.id, &book.updated_at, &expected).unwrap();
    let path = dir.path().join("повна-книга.txt");
    let result = snapshot.write_new(&path).unwrap();
    assert_eq!(
        std::fs::read_to_string(&path).unwrap(),
        "Книга 🌿\n\nОднакова назва\n\n\n\n\nZulu\n\nFirst <b>literal</b>\n\n\nОднакова назва\n\nДругий текст e\u{301} 🌿\n"
    );
    assert_eq!(
        serde_json::to_value(result).unwrap(),
        json!({"status":"exported","fileName":"повна-книга.txt","bookUpdatedAt":book.updated_at,"chapters":expected})
    );
    assert_eq!(
        ChapterRepository::new(&mut c).list(&book.id).unwrap(),
        committed
    );
    assert_eq!(books::load(&c, &book.id).unwrap(), book);
    for table in [
        "writing_activity",
        "activity_operations",
        "achievement_unlocks",
        "achievement_notification_receipts",
    ] {
        assert_eq!(
            c.query_row(&format!("SELECT count(*) FROM {table}"), [], |row| row
                .get::<_, i64>(0))
                .unwrap(),
            0
        );
    }
}

#[test]
fn changed_membership_order_revisions_and_title_cannot_export_a_stale_book() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let (book, chapters) = seed(&mut c);
    let original = entries(&chapters);
    let mut cases = vec![
        original[..2].to_vec(),
        original.iter().rev().cloned().collect(),
    ];
    let mut changed = original.clone();
    changed[1].revision += 1;
    cases.push(changed);
    for expected in cases {
        assert!(matches!(
            SavedBookExport::load(&mut c, &book.id, &book.updated_at, &expected),
            Err(ExportError::Chapter(ChapterError::Conflict))
        ));
    }
    let extra = ChapterRepository::new(&mut c)
        .create(
            &book.id,
            ChapterDetails {
                title: "Added".into(),
            },
        )
        .unwrap();
    assert!(matches!(
        SavedBookExport::load(&mut c, &book.id, &book.updated_at, &original),
        Err(ExportError::Chapter(ChapterError::Conflict))
    ));
    ChapterRepository::new(&mut c)
        .delete(&book.id, &extra.summary.id, extra.summary.revision)
        .unwrap();
    // Metadata update through the real revision-checked book repository.
    BookRepository::new(&mut c)
        .update(
            &book.id,
            &book.updated_at,
            BookDetails {
                title: "Changed".into(),
                target_word_count: None,
                daily_word_goal: None,
                deadline: None,
            },
        )
        .unwrap();
    assert!(matches!(
        load(&mut c, &book, &chapters),
        Err(ExportError::Chapter(ChapterError::Conflict))
    ));
}

#[test]
fn empty_missing_foreign_and_invalid_book_inputs_fail_before_a_file_is_written() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let (book, chapters) = seed(&mut c);
    let (other, foreign) = seed(&mut c);
    assert!(matches!(
        load(&mut c, &book, &foreign),
        Err(ExportError::Chapter(ChapterError::Conflict))
    ));
    assert!(
        SavedBookExport::load(&mut c, "invalid", &book.updated_at, &entries(&chapters)).is_err()
    );
    assert!(
        SavedBookExport::load(&mut c, &book.id, "not-a-timestamp", &entries(&chapters)).is_err()
    );
    assert!(
        SavedBookExport::load(
            &mut c,
            &book.id,
            &book.updated_at,
            &[entries(&chapters)[0].clone(), entries(&chapters)[0].clone()]
        )
        .is_err()
    );
    let mut bad = entries(&chapters);
    bad[0].revision = 0;
    assert!(SavedBookExport::load(&mut c, &book.id, &book.updated_at, &bad).is_err());
    for chapter in foreign.iter().rev() {
        ChapterRepository::new(&mut c)
            .delete(&other.id, &chapter.summary.id, chapter.summary.revision)
            .unwrap();
    }
    assert!(matches!(
        SavedBookExport::load(&mut c, &other.id, &other.updated_at, &[]),
        Err(ExportError::EmptyBook)
    ));
    BookRepository::new(&mut c)
        .delete(&other.id, &other.updated_at)
        .unwrap();
    assert!(matches!(
        SavedBookExport::load(&mut c, &other.id, &other.updated_at, &[]),
        Err(ExportError::Chapter(ChapterError::NotFound))
    ));
}

#[test]
fn a_corrupt_last_chapter_refuses_the_entire_export_without_repairing_or_writing_partial_text() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let (book, chapters) = seed(&mut c);
    c.execute(
        "UPDATE chapters SET content_schema_version=99 WHERE id=?1",
        [&chapters[2].summary.id],
    )
    .unwrap();
    assert!(matches!(
        load(&mut c, &book, &chapters),
        Err(ExportError::Chapter(ChapterError::InvalidStoredData))
    ));
    assert_eq!(
        c.query_row(
            "SELECT content_schema_version FROM chapters WHERE id=?1",
            [&chapters[2].summary.id],
            |row| row.get::<_, i64>(0)
        )
        .unwrap(),
        99
    );
    assert!(!dir.path().join("book.txt").exists());
}

#[test]
fn frozen_book_export_survives_later_book_and_chapter_deletion_without_changing_originals() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let (book, chapters) = seed(&mut c);
    let snapshot = load(&mut c, &book, &chapters).unwrap();
    let expected = snapshot.text.clone();
    BookRepository::new(&mut c)
        .delete(&book.id, &book.updated_at)
        .unwrap();
    let path = dir.path().join("frozen.txt");
    snapshot.write_new(&path).unwrap();
    assert_eq!(std::fs::read_to_string(&path).unwrap(), expected);
    assert!(matches!(
        snapshot.write_new(&path),
        Err(ExportError::AlreadyExists)
    ));
    assert_eq!(std::fs::read_to_string(&path).unwrap(), expected);
}

#[test]
fn legacy_unknown_counts_remain_unknown_after_whole_book_export() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let (book, chapters) = seed(&mut c);
    c.execute(
        "UPDATE chapters SET word_count=NULL WHERE book_id=?1",
        [&book.id],
    )
    .unwrap();
    load(&mut c, &book, &chapters)
        .unwrap()
        .write_new(&dir.path().join("legacy.txt"))
        .unwrap();
    assert!(
        ChapterRepository::new(&mut c)
            .list(&book.id)
            .unwrap()
            .iter()
            .all(|row| row.word_count.is_none())
    );
}

#[test]
fn book_and_chapter_stream_share_one_wal_read_snapshot_during_a_concurrent_commit() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let (book, chapters) = seed(&mut c);
    let other_db = database::open(dir.path()).unwrap();
    let mut writer = other_db.lock().unwrap();
    let tx = c.transaction().unwrap();
    assert_eq!(books::load(&tx, &book.id).unwrap(), book); // Pins the same snapshot as the exporter.
    ChapterRepository::new(&mut writer)
        .save_content(
            &book.id,
            &chapters[1].summary.id,
            chapters[1].summary.revision,
            &body("New committed body"),
        )
        .unwrap();
    let mut seen = Vec::new();
    for_each_chapter(&tx, &book.id, |chapter| {
        seen.push(chapter);
        Ok(())
    })
    .unwrap();
    assert_eq!(seen, chapters);
    tx.commit().unwrap();
    assert!(matches!(
        load(&mut c, &book, &chapters),
        Err(ExportError::Chapter(ChapterError::Conflict))
    ));
}

#[test]
fn uncommitted_metadata_and_bodies_are_excluded_from_book_export() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let (book, chapters) = seed(&mut c);
    let expected = load(&mut c, &book, &chapters).unwrap().text;
    let other_db = database::open(dir.path()).unwrap();
    let mut writer = other_db.lock().unwrap();
    let tx = writer.transaction().unwrap();
    tx.execute(
        "UPDATE books SET title='Uncommitted title' WHERE id=?1",
        [&book.id],
    )
    .unwrap();
    tx.execute(
        "UPDATE chapters SET title='Uncommitted chapter',revision=revision+1 WHERE book_id=?1",
        [&book.id],
    )
    .unwrap();
    let snapshot = load(&mut c, &book, &chapters).unwrap();
    assert_eq!(snapshot.text, expected);
    tx.rollback().unwrap();
}

#[test]
fn output_bounds_count_utf8_bytes_without_partial_append_and_manifest_limit_is_explicit() {
    let mut text = String::new();
    push_bounded(&mut text, "🌿", 4).unwrap();
    assert!(push_bounded(&mut text, "a", 4).is_err());
    assert_eq!(text, "🌿");
    push_bounded(&mut text, "", 4).unwrap();
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let (book, chapters) = seed(&mut c);
    let too_many = vec![entries(&chapters)[0].clone(); MAX_BOOK_EXPORT_CHAPTERS + 1];
    assert!(matches!(
        SavedBookExport::load(&mut c, &book.id, &book.updated_at, &too_many),
        Err(ExportError::TooLarge)
    ));
}
