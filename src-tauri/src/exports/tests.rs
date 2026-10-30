use super::*;
use crate::{
    books::{BookDetails, BookRepository},
    chapters::{Chapter, ChapterContent, ChapterDetails, ChapterRepository},
    database,
};
use serde_json::json;

fn paragraph(text: &str) -> serde_json::Value {
    if text.is_empty() {
        json!({"type":"paragraph"})
    } else {
        json!({"type":"paragraph","content":[{"type":"text","text":text}]})
    }
}
fn body(text: &str) -> String {
    json!({"schemaVersion":1,"document":{"type":"doc","content":[paragraph(text)]}}).to_string()
}
fn seed(c: &mut Connection, title: &str, raw: &str) -> Chapter {
    let book = BookRepository::new(c)
        .create(BookDetails {
            title: "Книга".into(),
            target_word_count: Some(100),
            daily_word_goal: Some(100),
            deadline: None,
        })
        .unwrap();
    let chapter = ChapterRepository::new(c)
        .create(
            &book.id,
            ChapterDetails {
                title: title.into(),
            },
        )
        .unwrap();
    ChapterRepository::new(c)
        .save_content(&book.id, &chapter.summary.id, chapter.summary.revision, raw)
        .unwrap()
}
fn snapshot(c: &mut Connection, chapter: &Chapter) -> SavedChapterExport {
    SavedChapterExport::load(
        c,
        &chapter.summary.book_id,
        &chapter.summary.id,
        chapter.summary.revision,
    )
    .unwrap()
}

#[test]
fn exports_only_the_selected_saved_chapter_without_database_or_activity_writes() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let first = seed(&mut c, "Same title", &body("Not selected"));
    let selected = seed(
        &mut c,
        "Same title",
        &body("Привіт, світе! 🌿 e\u{301} <b>literal</b>"),
    );
    let book_before = crate::books::load(&c, &selected.summary.book_id).unwrap();
    let export = snapshot(&mut c, &selected);
    let destination = dir.path().join("Мій розділ.txt");
    let result = export.write_new(&destination).unwrap();
    assert_eq!(
        std::fs::read_to_string(&destination).unwrap(),
        "Same title\n\nПривіт, світе! 🌿 e\u{301} <b>literal</b>\n"
    );
    assert_eq!(
        serde_json::to_value(result).unwrap(),
        json!({"status":"exported","fileName":"Мій розділ.txt","revision":selected.summary.revision})
    );
    for chapter in [first, selected] {
        assert_eq!(
            ChapterRepository::new(&mut c)
                .get(&chapter.summary.book_id, &chapter.summary.id)
                .unwrap(),
            chapter
        );
    }
    assert_eq!(
        crate::books::load(&c, &book_before.id).unwrap(),
        book_before
    );
    for table in [
        "activity_operations",
        "writing_activity",
        "activity_day_plans",
        "achievement_unlocks",
        "achievement_notification_receipts",
    ] {
        assert_eq!(
            c.query_row(&format!("SELECT count(*) FROM {table}"), [], |row| row
                .get::<_, i64>(0))
                .unwrap(),
            0,
            "{table}"
        );
    }
}

#[test]
fn text_export_keeps_structure_literal_unicode_and_mark_boundaries() {
    let content = ChapterContent::parse(&json!({"schemaVersion":6,"document":{"type":"doc","content":[
        {"type":"heading","attrs":{"level":2,"textAlign":"center"},"content":[{"type":"text","text":"Заголовок","marks":[{"type":"bold"}]}]},
        {"type":"paragraph","content":[{"type":"text","text":"пів","marks":[{"type":"fontSize","attrs":{"size":20}}]},{"type":"text","text":"’яблука","marks":[{"type":"italic"},{"type":"underline"},{"type":"fontFamily","attrs":{"family":"Georgia"}}]},{"type":"hardBreak"},{"type":"text","text":"<script> & 🌿"}]},
        {"type":"paragraph"},
        {"type":"orderedList","attrs":{"start":3,"type":"a"},"content":[
            {"type":"listItem","content":[paragraph("First"),{"type":"bulletList","content":[{"type":"listItem","content":[paragraph("Nested")]}]},paragraph("Continued")]},
            {"type":"listItem","content":[paragraph("Second")]}
        ]},
        {"type":"pageBreak"}, paragraph("After page")
    ]}}).to_string()).unwrap();
    // Plain text normalizes ordered-list presentation to decimal markers while
    // preserving the stored starting number, item order and nested structure.
    assert_eq!(
        content.plain_text(),
        "Заголовок\n\nпів’яблука\n<script> & 🌿\n\n\n\n3. First\n  - Nested\n  Continued\n4. Second\n\n\n\nAfter page"
    );
}

#[test]
fn every_supported_content_version_and_empty_chapter_export_without_invented_text() {
    for version in 1..=6 {
        let raw = json!({"schemaVersion":version,"document":{"type":"doc","content":[paragraph("Слова"),paragraph("")]}}).to_string();
        assert_eq!(
            ChapterContent::parse(&raw).unwrap().plain_text(),
            "Слова\n\n"
        );
    }
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let chapter = seed(&mut c, "Empty", &body(""));
    let target = dir.path().join("empty.txt");
    snapshot(&mut c, &chapter).write_new(&target).unwrap();
    assert_eq!(std::fs::read(&target).unwrap(), b"Empty\n\n\n");
}

#[test]
fn duplicate_names_and_failed_promotions_never_overwrite_existing_files_or_leave_staging() {
    let dir = tempfile::tempdir().unwrap();
    let export = SavedChapterExport {
        file_name: "chapter.txt".into(),
        revision: 1,
        text: "Full export 🌿".into(),
    };
    let path = dir.path().join("chapter.txt");
    std::fs::write(&path, "Keep original").unwrap();
    assert!(matches!(
        export.write_new(&path),
        Err(ExportError::AlreadyExists)
    ));
    assert_eq!(std::fs::read_to_string(&path).unwrap(), "Keep original");
    let directory = dir.path().join("folder.txt");
    std::fs::create_dir(&directory).unwrap();
    assert!(export.write_new(&directory).is_err());
    assert!(directory.is_dir());
    assert_eq!(std::fs::read_dir(dir.path()).unwrap().count(), 2);
}

#[test]
fn existing_hard_link_cannot_be_used_to_overwrite_another_file() {
    let dir = tempfile::tempdir().unwrap();
    let original = dir.path().join("library.sqlite3");
    let alias = dir.path().join("alias.txt");
    std::fs::write(&original, "untouched").unwrap();
    std::fs::hard_link(&original, &alias).unwrap();
    let export = SavedChapterExport {
        file_name: "chapter.txt".into(),
        revision: 1,
        text: "new".into(),
    };
    assert!(export.write_new(&alias).is_err());
    assert_eq!(std::fs::read_to_string(&original).unwrap(), "untouched");
    assert_eq!(std::fs::read_to_string(&alias).unwrap(), "untouched");
}

#[test]
fn concurrent_exports_to_one_name_have_one_winner_and_complete_bytes() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("chapter.txt");
    let barrier = std::sync::Arc::new(std::sync::Barrier::new(2));
    let handles = ["first 🌿", "second Україна"].map(|text| {
        let path = path.clone();
        let barrier = barrier.clone();
        std::thread::spawn(move || {
            let export = SavedChapterExport {
                file_name: "chapter.txt".into(),
                revision: 1,
                text: text.into(),
            };
            barrier.wait();
            export.write_new(&path)
        })
    });
    let results = handles.map(|handle| handle.join().unwrap());
    assert_eq!(results.iter().filter(|result| result.is_ok()).count(), 1);
    assert!(
        results
            .iter()
            .any(|result| matches!(result, Err(ExportError::AlreadyExists)))
    );
    assert!(
        ["first 🌿", "second Україна"].contains(&std::fs::read_to_string(path).unwrap().as_str())
    );
    assert_eq!(std::fs::read_dir(dir.path()).unwrap().count(), 1);
}

#[test]
fn destination_validation_and_io_failure_do_not_create_partial_exports() {
    let dir = tempfile::tempdir().unwrap();
    let export = SavedChapterExport {
        file_name: "chapter.txt".into(),
        revision: 1,
        text: "new".into(),
    };
    assert!(export.write_new(Path::new("relative.txt")).is_err());
    for name in [
        "database.sqlite3",
        "NUL.txt",
        "com1.txt",
        "file:stream.txt",
        "bad?.txt",
        "name.txt.",
    ] {
        assert!(
            matches!(
                export.write_new(&dir.path().join(name)),
                Err(ExportError::InvalidDestination)
            ),
            "{name}"
        );
    }
    assert!(
        export
            .write_new(&dir.path().join("missing/child.txt"))
            .is_err()
    );
    assert_eq!(std::fs::read_dir(dir.path()).unwrap().count(), 0);
    export.write_new(&dir.path().join("Книга.TXT")).unwrap();
}

#[test]
fn default_filenames_keep_unicode_but_strip_paths_devices_and_excessive_length() {
    assert_eq!(file_name("Привіт 🌿"), "Привіт 🌿.txt");
    assert_eq!(file_name("../../a\\b:*/?<>|\""), "_.._a_b________.txt");
    for title in ["CON", "prn", "AUX", "NUL", "COM1", "LPT9", "con.anything"] {
        assert!(file_name(title).starts_with('_'), "{title}");
    }
    assert_eq!(file_name(" . "), "chapter.txt");
    assert_eq!(file_name(&"🌿".repeat(200)).chars().count(), 84);
}

#[test]
fn stale_cross_book_deleted_and_invalid_snapshots_fail_before_writing() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let chapter = seed(&mut c, "First", &body("Saved"));
    let other = seed(&mut c, "Other", &body("Other words"));
    assert!(matches!(
        SavedChapterExport::load(&mut c, &chapter.summary.book_id, &chapter.summary.id, 1),
        Err(ExportError::Chapter(ChapterError::Conflict))
    ));
    assert!(matches!(
        SavedChapterExport::load(
            &mut c,
            &other.summary.book_id,
            &chapter.summary.id,
            chapter.summary.revision
        ),
        Err(ExportError::Chapter(ChapterError::NotFound))
    ));
    assert!(
        SavedChapterExport::load(&mut c, &chapter.summary.book_id, &chapter.summary.id, 0).is_err()
    );
    assert!(SavedChapterExport::load(&mut c, "bad", "bad", 1).is_err());
    ChapterRepository::new(&mut c)
        .delete(
            &chapter.summary.book_id,
            &chapter.summary.id,
            chapter.summary.revision,
        )
        .unwrap();
    assert!(matches!(
        SavedChapterExport::load(
            &mut c,
            &chapter.summary.book_id,
            &chapter.summary.id,
            chapter.summary.revision
        ),
        Err(ExportError::Chapter(ChapterError::NotFound))
    ));
}

#[test]
fn unsupported_stored_document_is_refused_instead_of_exporting_partial_text() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let chapter = seed(&mut c, "Chapter", &body("Saved"));
    c.execute(
        "UPDATE chapters SET content_json=?1 WHERE id=?2",
        rusqlite::params![
            r#"{"type":"doc","content":[{"type":"image"}]}"#,
            chapter.summary.id
        ],
    )
    .unwrap();
    assert!(matches!(
        SavedChapterExport::load(
            &mut c,
            &chapter.summary.book_id,
            &chapter.summary.id,
            chapter.summary.revision
        ),
        Err(ExportError::Chapter(ChapterError::InvalidStoredData))
    ));
}

#[test]
fn chosen_snapshot_remains_frozen_if_source_changes_or_disappears_during_the_picker() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let chapter = seed(&mut c, "Original", &body("Saved snapshot"));
    let export = snapshot(&mut c, &chapter);
    let changed = ChapterRepository::new(&mut c)
        .save_content(
            &chapter.summary.book_id,
            &chapter.summary.id,
            chapter.summary.revision,
            &body("Later version"),
        )
        .unwrap();
    ChapterRepository::new(&mut c)
        .delete(
            &changed.summary.book_id,
            &changed.summary.id,
            changed.summary.revision,
        )
        .unwrap();
    let target = dir.path().join("snapshot.txt");
    export.write_new(&target).unwrap();
    assert_eq!(
        std::fs::read_to_string(target).unwrap(),
        "Original\n\nSaved snapshot\n"
    );
}

#[test]
fn another_connections_uncommitted_text_is_never_exported() {
    let dir = tempfile::tempdir().unwrap();
    let first = database::open(dir.path()).unwrap();
    let mut c = first.lock().unwrap();
    let chapter = seed(&mut c, "Chapter", &body("Committed"));
    let second = database::open(dir.path()).unwrap();
    let mut writer = second.lock().unwrap();
    let tx = writer.transaction().unwrap();
    tx.execute(
        "UPDATE chapters SET content_json=?1, revision=revision+1 WHERE id=?2",
        rusqlite::params![
            json!({"type":"doc","content":[paragraph("Uncommitted")]}).to_string(),
            chapter.summary.id
        ],
    )
    .unwrap();
    let export = snapshot(&mut c, &chapter);
    let path = dir.path().join("committed.txt");
    export.write_new(&path).unwrap();
    assert_eq!(
        std::fs::read_to_string(path).unwrap(),
        "Chapter\n\nCommitted\n"
    );
    tx.rollback().unwrap();
}
