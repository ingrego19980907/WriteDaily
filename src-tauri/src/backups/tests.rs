use super::*;
use crate::{
    books::{Book, BookDetails, BookRepository},
    chapters::{ChapterDetails, ChapterRepository},
};
use serde_json::json;

fn book(c: &mut Connection, title: &str) -> Book {
    BookRepository::new(c)
        .create(BookDetails {
            title: title.into(),
            target_word_count: Some(10000),
            daily_word_goal: Some(100),
            deadline: Some("2027-01-01".into()),
        })
        .unwrap()
}
fn png() -> Vec<u8> {
    let mut data = std::io::Cursor::new(Vec::new());
    image::DynamicImage::new_rgba8(8, 12)
        .write_to(&mut data, image::ImageFormat::Png)
        .unwrap();
    data.into_inner()
}
fn facts(c: &Connection) -> Vec<(String, Vec<Vec<rusqlite::types::Value>>)> {
    let tables = c.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").unwrap()
        .query_map([], |r| r.get::<_,String>(0)).unwrap().collect::<Result<Vec<_>,_>>().unwrap();
    tables
        .into_iter()
        .map(|name| {
            let quoted = name.replace('"', "\"\"");
            let columns = c
                .prepare(&format!("SELECT * FROM \"{quoted}\""))
                .unwrap()
                .column_count();
            let order = (1..=columns)
                .map(|i| i.to_string())
                .collect::<Vec<_>>()
                .join(",");
            let mut s = c
                .prepare(&format!("SELECT * FROM \"{quoted}\" ORDER BY {order}"))
                .unwrap();
            let rows = s
                .query_map([], |r| (0..columns).map(|i| r.get(i)).collect())
                .unwrap()
                .collect::<Result<Vec<_>, _>>()
                .unwrap();
            (name, rows)
        })
        .collect()
}
fn snapshot_db(snapshot: &LibraryBackup) -> Connection {
    Connection::open_with_flags(
        snapshot.directory.path().join(DATABASE_NAME),
        OpenFlags::SQLITE_OPEN_READ_ONLY,
    )
    .unwrap()
}

#[test]
fn empty_library_creates_a_valid_versioned_archive_including_preferences_and_schedule() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let covers = CoverStore::new(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let before = facts(&c);
    let snapshot = LibraryBackup::capture(&mut c, &covers).unwrap();
    assert_eq!(facts(&c), before);
    assert_eq!(facts(&snapshot_db(&snapshot)), before);
    assert_eq!(
        (
            snapshot.manifest.book_count,
            snapshot.manifest.chapter_count,
            snapshot.manifest.cover_count
        ),
        (0, 0, 0)
    );
    assert_eq!(snapshot.manifest.format, "writedaily-library");
    assert_eq!(snapshot.manifest.format_version, 1);
    assert_eq!(snapshot.manifest.database_schema_version, 8);
    assert_eq!(
        snapshot.manifest.database_application_id,
        database::APPLICATION_ID
    );
    assert!(crate::books::validation::parse_timestamp(&snapshot.manifest.created_at).is_some());
    let mut zip = ZipArchive::new(File::open(snapshot.archive_path()).unwrap()).unwrap();
    assert_eq!(zip.len(), 2);
    let manifest: BackupManifest =
        serde_json::from_reader(zip.by_name("manifest.json").unwrap()).unwrap();
    assert_eq!(manifest, snapshot.manifest);
    let path = dir.path().join("Порожня бібліотека.zip");
    assert!(matches!(
        snapshot.write_new(&path).unwrap(),
        BackupResult::Created { book_count: 0, .. }
    ));
}

#[test]
fn wal_snapshot_preserves_all_tables_and_exact_referenced_covers_without_cleanup_or_orphans() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let covers = CoverStore::new(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    c.pragma_update(None, "wal_autocheckpoint", 0).unwrap();
    let first = book(&mut c, "Книга 🌿");
    let first = covers
        .set(&mut c, &first.id, &first.updated_at, Some(&png()))
        .unwrap()
        .book;
    book(&mut c, "Інша книга");
    let chapter = ChapterRepository::new(&mut c)
        .create(
            &first.id,
            ChapterDetails {
                title: "Розділ".into(),
            },
        )
        .unwrap();
    ChapterRepository::new(&mut c).save_content(&first.id, &chapter.summary.id, chapter.summary.revision,
        &json!({"schemaVersion":1,"document":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Текст e\u{301} 👩‍💻 <b>literal</b>"}]}]}}).to_string()).unwrap();
    c.execute(
        "UPDATE editor_preferences SET font_size=24, revision=revision+1",
        [],
    )
    .unwrap();
    let orphan = format!("covers/{}.png", uuid::Uuid::new_v4());
    fs::write(dir.path().join(&orphan), png()).unwrap();
    c.execute(
        "INSERT INTO pending_cover_cleanup(path) VALUES (?1)",
        [&orphan],
    )
    .unwrap();
    fs::write(dir.path().join("unrelated.txt"), b"Not library data").unwrap();
    assert!(
        fs::metadata(dir.path().join("write-daily.sqlite3-wal"))
            .unwrap()
            .len()
            > 0
    );
    let before = facts(&c);
    let snapshot = LibraryBackup::capture(&mut c, &covers).unwrap();
    assert_eq!(facts(&c), before);
    assert_eq!(facts(&snapshot_db(&snapshot)), before);
    assert!(dir.path().join(&orphan).exists());
    assert_eq!(
        (
            snapshot.manifest.book_count,
            snapshot.manifest.chapter_count,
            snapshot.manifest.cover_count
        ),
        (2, 1, 1)
    );
    assert_eq!(snapshot.manifest.files.len(), 2);
    let reference = first.cover_path.unwrap();
    assert_eq!(
        fs::read(snapshot.directory.path().join(&reference)).unwrap(),
        fs::read(dir.path().join(&reference)).unwrap()
    );
    let zip = ZipArchive::new(File::open(snapshot.archive_path()).unwrap()).unwrap();
    let names = zip.file_names().map(str::to_owned).collect::<BTreeSet<_>>();
    assert_eq!(
        names,
        [DATABASE_NAME.to_owned(), reference, "manifest.json".into()]
            .into_iter()
            .collect()
    );
    for suffix in ["-wal", "-shm", "-journal"] {
        assert!(
            !snapshot
                .directory
                .path()
                .join(format!("{DATABASE_NAME}{suffix}"))
                .exists()
        );
    }
}

#[test]
fn staged_snapshot_stays_frozen_after_source_cover_replacement_and_book_deletion() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let covers = CoverStore::new(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let original = book(&mut c, "Original");
    let covered = covers
        .set(&mut c, &original.id, &original.updated_at, Some(&png()))
        .unwrap()
        .book;
    let snapshot = LibraryBackup::capture(&mut c, &covers).unwrap();
    let frozen = facts(&snapshot_db(&snapshot));
    let archive = fs::read(snapshot.archive_path()).unwrap();
    covers
        .delete(&mut c, &covered.id, &covered.updated_at)
        .unwrap();
    assert!(!dir.path().join(covered.cover_path.unwrap()).exists());
    let path = dir.path().join("frozen.zip");
    snapshot.write_new(&path).unwrap();
    assert_eq!(fs::read(path).unwrap(), archive);
    assert_eq!(facts(&snapshot_db(&snapshot)), frozen);
    // Capture is over: another independent writer can acquire its reservation.
    let other = database::open(dir.path()).unwrap();
    let mut other = other.lock().unwrap();
    other
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .unwrap()
        .rollback()
        .unwrap();
}

#[test]
fn missing_or_corrupt_referenced_cover_refuses_backup_without_repairing_source() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let covers = CoverStore::new(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let source = book(&mut c, "Covered");
    let source = covers
        .set(&mut c, &source.id, &source.updated_at, Some(&png()))
        .unwrap()
        .book;
    let path = dir.path().join(source.cover_path.unwrap());
    fs::remove_file(&path).unwrap();
    let before = facts(&c);
    assert!(matches!(
        LibraryBackup::capture(&mut c, &covers),
        Err(BackupError::Cover(_))
    ));
    assert_eq!(facts(&c), before);
    fs::write(&path, b"corrupt PNG").unwrap();
    assert!(matches!(
        LibraryBackup::capture(&mut c, &covers),
        Err(BackupError::Cover(_))
    ));
    assert_eq!(fs::read(path).unwrap(), b"corrupt PNG");
    assert_eq!(facts(&c), before);
}

#[test]
fn unsafe_cover_reference_is_never_read_or_put_in_archive() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let covers = CoverStore::new(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let source = book(&mut c, "Unsafe");
    c.pragma_update(None, "ignore_check_constraints", true)
        .unwrap();
    c.execute(
        "UPDATE books SET cover_path='../outside.png' WHERE id=?1",
        [&source.id],
    )
    .unwrap();
    c.pragma_update(None, "ignore_check_constraints", false)
        .unwrap();
    let before = facts(&c);
    assert!(LibraryBackup::capture(&mut c, &covers).is_err());
    assert_eq!(facts(&c), before);
}

#[test]
fn wrong_identity_future_schema_and_foreign_key_violations_refuse_capture() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let covers = CoverStore::new(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    for (pragma, wrong, correct) in [
        ("application_id", 123, database::APPLICATION_ID),
        ("user_version", 99, database::SCHEMA_VERSION),
    ] {
        c.pragma_update(None, pragma, wrong).unwrap();
        assert!(matches!(
            LibraryBackup::capture(&mut c, &covers),
            Err(BackupError::InvalidSource)
        ));
        assert_eq!(
            c.pragma_query_value(None, pragma, |r| r.get::<_, i32>(0))
                .unwrap(),
            wrong
        );
        c.pragma_update(None, pragma, correct).unwrap();
    }
    let b = book(&mut c, "Broken relation");
    let chapter = ChapterRepository::new(&mut c)
        .create(
            &b.id,
            ChapterDetails {
                title: "Chapter".into(),
            },
        )
        .unwrap();
    c.pragma_update(None, "foreign_keys", false).unwrap();
    c.execute(
        "UPDATE chapters SET book_id=?1 WHERE id=?2",
        rusqlite::params![uuid::Uuid::new_v4().to_string(), chapter.summary.id],
    )
    .unwrap();
    assert!(matches!(
        LibraryBackup::capture(&mut c, &covers),
        Err(BackupError::InvalidSource)
    ));
}

#[test]
fn active_uncommitted_writer_prevents_capture_and_can_retry_after_rollback() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let covers = CoverStore::new(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let b = book(&mut c, "Committed");
    c.busy_timeout(Duration::from_millis(5)).unwrap();
    let mut writer = Connection::open(dir.path().join(DATABASE_NAME)).unwrap();
    let tx = writer
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .unwrap();
    tx.execute("UPDATE books SET title='Uncommitted' WHERE id=?1", [&b.id])
        .unwrap();
    assert!(LibraryBackup::capture(&mut c, &covers).is_err());
    tx.rollback().unwrap();
    let snapshot = LibraryBackup::capture(&mut c, &covers).unwrap();
    assert_eq!(
        snapshot_db(&snapshot)
            .query_row("SELECT title FROM books", [], |r| r.get::<_, String>(0))
            .unwrap(),
        "Committed"
    );
}

#[test]
fn existing_destinations_and_hard_links_are_kept_and_staging_cleans_up() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let covers = CoverStore::new(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let snapshot = LibraryBackup::capture(&mut c, &covers).unwrap();
    let output = tempfile::tempdir().unwrap();
    let path = output.path().join("keep.zip");
    fs::write(&path, b"original").unwrap();
    let alias = output.path().join("alias.zip");
    fs::hard_link(&path, &alias).unwrap();
    for destination in [&path, &alias] {
        assert!(matches!(
            snapshot.write_new(destination),
            Err(BackupError::AlreadyExists)
        ));
    }
    assert_eq!(fs::read(path).unwrap(), b"original");
    assert_eq!(fs::read_dir(output.path()).unwrap().count(), 2);
    let private = snapshot.directory.path().to_path_buf();
    drop(snapshot);
    assert!(!private.exists());
}

#[test]
fn invalid_destinations_and_private_staging_paths_never_receive_a_backup() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let covers = CoverStore::new(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let snapshot = LibraryBackup::capture(&mut c, &covers).unwrap();
    for path in [
        PathBuf::from("relative.zip"),
        dir.path().join("database.sqlite3"),
        dir.path().join("NUL.zip"),
        dir.path().join("stream:ads.zip"),
        dir.path().join(".zip"),
        dir.path().join("missing/new.zip"),
        snapshot.directory.path().join("inside.zip"),
    ] {
        assert!(
            matches!(
                snapshot.write_new(&path),
                Err(BackupError::InvalidDestination)
            ),
            "{path:?}"
        );
    }
}

#[test]
fn generated_archive_verification_detects_changed_staged_bytes_and_digest_bounds() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let covers = CoverStore::new(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let snapshot = LibraryBackup::capture(&mut c, &covers).unwrap();
    fs::write(snapshot.directory.path().join(DATABASE_NAME), b"tampered").unwrap();
    assert!(matches!(
        snapshot.build_archive(),
        Err(BackupError::InvalidSource)
    ));
    assert_eq!(digest("🌿".as_bytes(), 4).unwrap().0, 4);
    assert!(matches!(
        digest("🌿".as_bytes(), 3),
        Err(BackupError::TooLarge)
    ));
}
