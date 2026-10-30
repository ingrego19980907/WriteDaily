use super::*;
use crate::{
    backups::LibraryBackup,
    books::{BookDetails, BookRepository},
    covers::CoverStore,
    database,
};
use rusqlite::Connection;
use std::{
    fs,
    io::{Read, Write},
};

fn populated(title: &str) -> (tempfile::TempDir, Database, CoverStore) {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let covers = CoverStore::new(dir.path()).unwrap();
    {
        let mut c = db.lock().unwrap();
        let book = BookRepository::new(&mut c)
            .create(BookDetails {
                title: title.into(),
                target_word_count: Some(10000),
                daily_word_goal: Some(100),
                deadline: None,
            })
            .unwrap();
        let mut image = std::io::Cursor::new(Vec::new());
        image::DynamicImage::new_rgba8(4, 6)
            .write_to(&mut image, image::ImageFormat::Png)
            .unwrap();
        covers
            .set(&mut c, &book.id, &book.updated_at, Some(image.get_ref()))
            .unwrap();
        let chapter = crate::chapters::ChapterRepository::new(&mut c)
            .create(
                &book.id,
                crate::chapters::ChapterDetails {
                    title: "Розділ".into(),
                },
            )
            .unwrap();
        crate::chapters::ChapterRepository::new(&mut c)
            .save_content(
                &book.id,
                &chapter.summary.id,
                chapter.summary.revision,
                include_str!("../../../tests/fixtures/text-export/formatted.json"),
            )
            .unwrap();
        c.execute("UPDATE chapters SET word_count=NULL", [])
            .unwrap();
        c.execute(
            "UPDATE editor_preferences SET font_size=24,revision=revision+1",
            [],
        )
        .unwrap();
    }
    (dir, db, covers)
}
fn archive(db: &Database, covers: &CoverStore, path: &Path) {
    LibraryBackup::capture(&mut db.lock().unwrap(), covers)
        .unwrap()
        .write_new(path)
        .unwrap();
}
fn facts(c: &Connection) -> Vec<(String, Vec<Vec<rusqlite::types::Value>>)> {
    let tables = c.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").unwrap().query_map([], |r| r.get::<_,String>(0)).unwrap().collect::<Result<Vec<_>,_>>().unwrap();
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
            let rows = c
                .prepare(&format!("SELECT * FROM \"{quoted}\" ORDER BY {order}"))
                .unwrap()
                .query_map([], |r| (0..columns).map(|i| r.get(i)).collect())
                .unwrap()
                .collect::<Result<Vec<_>, _>>()
                .unwrap();
            (name, rows)
        })
        .collect()
}
fn rewrite(source: &Path, output: &Path, change: impl FnOnce(&mut Vec<(String, Vec<u8>)>)) {
    let mut zip = zip::ZipArchive::new(fs::File::open(source).unwrap()).unwrap();
    let mut entries = (0..zip.len())
        .map(|i| {
            let mut f = zip.by_index(i).unwrap();
            let name = f.name().to_owned();
            let mut bytes = Vec::new();
            f.read_to_end(&mut bytes).unwrap();
            (name, bytes)
        })
        .collect::<Vec<_>>();
    change(&mut entries);
    let mut zip = zip::ZipWriter::new(fs::File::create(output).unwrap());
    for (name, bytes) in entries {
        zip.start_file(
            name,
            zip::write::SimpleFileOptions::default()
                .compression_method(zip::CompressionMethod::Stored),
        )
        .unwrap();
        zip.write_all(&bytes).unwrap();
    }
    zip.finish().unwrap();
}

#[test]
fn full_rows_covers_settings_and_unknown_counts_roundtrip_and_safety_restores_old_library() {
    let (source, source_db, source_covers) = populated("Archive 🌿");
    let selected = source.path().join("source.zip");
    archive(&source_db, &source_covers, &selected);
    let expected = facts(&source_db.lock().unwrap());
    let (live, db, covers) = populated("Current");
    let before = facts(&db.lock().unwrap());
    let prepared = PreparedRestore::prepare(&db.root, &selected).unwrap();
    let token = prepared.preview.token.clone();
    assert_eq!(facts(&db.lock().unwrap()), before);
    prepared.apply(&db, &covers).unwrap();
    drop(db);
    let restored = database::open(live.path()).unwrap();
    assert_eq!(facts(&restored.lock().unwrap()), expected);
    for entry in crate::books::BookRepository::new(&mut restored.lock().unwrap())
        .list()
        .unwrap()
    {
        let reference = entry.cover_path.unwrap();
        assert_eq!(
            fs::read(live.path().join(&reference)).unwrap(),
            fs::read(source.path().join(reference)).unwrap()
        );
    }
    let safety = live
        .path()
        .join("restore-history")
        .join(token)
        .join("safety.zip");
    let plan = PreparedRestore::prepare(&restored.root, &safety).unwrap();
    plan.apply(&restored, &CoverStore::new(live.path()).unwrap())
        .unwrap();
    drop(restored);
    let original = database::open(live.path()).unwrap();
    assert_eq!(facts(&original.lock().unwrap()), before);
}

#[test]
fn preview_cancel_and_second_instance_refusal_leave_source_unchanged() {
    let (source, source_db, source_covers) = populated("Selected");
    let selected = source.path().join("source.zip");
    archive(&source_db, &source_covers, &selected);
    let (live, db, covers) = populated("Current");
    let before = facts(&db.lock().unwrap());
    let plan = PreparedRestore::prepare(&db.root, &selected).unwrap();
    let staged = plan.directory.path().to_path_buf();
    drop(plan);
    assert!(!staged.exists());
    assert_eq!(facts(&db.lock().unwrap()), before);
    let other = database::open(live.path()).unwrap();
    let plan = PreparedRestore::prepare(&db.root, &selected).unwrap();
    assert!(matches!(plan.apply(&db, &covers), Err(RestoreError::Busy)));
    assert!(!db.blocked());
    assert_eq!(facts(&db.lock().unwrap()), before);
    drop(other);
    PreparedRestore::prepare(&db.root, &selected)
        .unwrap()
        .apply(&db, &covers)
        .unwrap();
}

#[test]
fn missing_safety_cover_refuses_restore_without_replacing_or_locking_current_rows() {
    let (source, source_db, source_covers) = populated("Selected");
    let selected = source.path().join("source.zip");
    archive(&source_db, &source_covers, &selected);
    let (live, db, covers) = populated("Current");
    let before = facts(&db.lock().unwrap());
    let reference = BookRepository::new(&mut db.lock().unwrap()).list().unwrap()[0]
        .cover_path
        .clone()
        .unwrap();
    fs::remove_file(live.path().join(reference)).unwrap();
    let plan = PreparedRestore::prepare(&db.root, &selected).unwrap();
    assert!(matches!(
        plan.apply(&db, &covers),
        Err(RestoreError::Backup(_))
    ));
    assert!(!db.blocked());
    assert_eq!(facts(&db.lock().unwrap()), before);
    assert!(!journal_exists(live.path()));
}

#[test]
fn invalid_archives_never_change_current_library_or_escape_staging() {
    let (source, source_db, source_covers) = populated("Selected");
    let selected = source.path().join("source.zip");
    archive(&source_db, &source_covers, &selected);
    let (live, db, _) = populated("Current");
    let before = facts(&db.lock().unwrap());
    for case in 0..6 {
        let bad = source.path().join(format!("bad-{case}.zip"));
        rewrite(&selected, &bad, |entries| {
            if case == 0 {
                entries.push(("../escaped.txt".into(), b"unsafe".to_vec()));
            } else if case == 1 {
                entries.retain(|(name, _)| !name.starts_with("covers/"));
            } else if case == 2 {
                entries
                    .iter_mut()
                    .find(|(name, _)| name == "write-daily.sqlite3")
                    .unwrap()
                    .1[100] ^= 1;
            } else {
                let bytes = &mut entries
                    .iter_mut()
                    .find(|(name, _)| name == "manifest.json")
                    .unwrap()
                    .1;
                let mut manifest: serde_json::Value = serde_json::from_slice(bytes).unwrap();
                if case == 3 {
                    manifest["formatVersion"] = serde_json::json!(99);
                }
                if case == 4 {
                    manifest["bookCount"] = serde_json::json!(u64::MAX);
                    manifest["coverCount"] = serde_json::json!(u64::MAX);
                }
                if case == 5 {
                    manifest["files"][0]["path"] = serde_json::json!("../outside.sqlite3");
                }
                *bytes = serde_json::to_vec(&manifest).unwrap();
            }
        });
        assert!(
            PreparedRestore::prepare(&db.root, &bad).is_err(),
            "case {case}"
        );
        assert_eq!(facts(&db.lock().unwrap()), before);
    }
    assert!(!live.path().join("escaped.txt").exists());
    assert!(!journal_exists(live.path()));
}

#[test]
fn extra_sql_objects_are_rejected_even_with_a_valid_creator_hash_manifest() {
    let (source, db, covers) = populated("Untrusted schema");
    db.lock()
        .unwrap()
        .execute_batch("CREATE TRIGGER unexpected AFTER INSERT ON books BEGIN SELECT 1; END;")
        .unwrap();
    let selected = source.path().join("extra-schema.zip");
    archive(&db, &covers, &selected);
    let (live, current, _) = populated("Current");
    let before = facts(&current.lock().unwrap());
    assert!(matches!(
        PreparedRestore::prepare(&current.root, &selected),
        Err(RestoreError::Unsupported)
    ));
    assert_eq!(facts(&current.lock().unwrap()), before);
    assert!(!journal_exists(live.path()));
}

#[test]
fn internal_looking_names_do_not_bypass_the_exact_schema_check() {
    let (source, db, covers) = populated("Selected");
    db.lock()
        .unwrap()
        .execute_batch("CREATE TRIGGER sqlitex_hidden AFTER INSERT ON books BEGIN SELECT 1; END;")
        .unwrap();
    let selected = source.path().join("hidden-schema.zip");
    archive(&db, &covers, &selected);
    let (_live, current, _) = populated("Current");
    assert!(matches!(
        PreparedRestore::prepare(&current.root, &selected),
        Err(RestoreError::Unsupported)
    ));
}

#[test]
fn imported_pending_unlocks_are_silently_baselined_without_activity_or_timestamp_changes() {
    let (source, db, covers) = populated("Unlocked");
    let instant = "2026-10-29T12:00:00.000Z";
    db.lock()
        .unwrap()
        .execute(
            "INSERT INTO achievement_unlocks VALUES ('first_words',1,?1)",
            [instant],
        )
        .unwrap();
    let selected = source.path().join("unlocks.zip");
    archive(&db, &covers, &selected);
    let (live, current, current_covers) = populated("Current");
    PreparedRestore::prepare(&current.root, &selected)
        .unwrap()
        .apply(&current, &current_covers)
        .unwrap();
    drop(current);
    let reopened = database::open(live.path()).unwrap();
    let mut c = reopened.lock().unwrap();
    assert!(
        crate::achievements::claim_notifications(&mut c)
            .unwrap()
            .is_empty()
    );
    assert_eq!(
        c.query_row(
            "SELECT unlocked_at FROM achievement_unlocks WHERE achievement_id='first_words'",
            [],
            |r| r.get::<_, String>(0)
        )
        .unwrap(),
        instant
    );
    assert_eq!(c.query_row("SELECT disposition FROM achievement_notification_receipts WHERE achievement_id='first_words'",[],|r|r.get::<_,String>(0)).unwrap(),"baseline");
    assert_eq!(
        c.query_row("SELECT count(*) FROM writing_activity", [], |r| r
            .get::<_, i64>(0))
            .unwrap(),
        0
    );
}

#[test]
fn interrupted_swap_boundaries_roll_back_before_startup_queries_and_never_reset_database() {
    let (source, selected_db, selected_covers) = populated("Selected");
    let selected = source.path().join("source.zip");
    archive(&selected_db, &selected_covers, &selected);
    for steps in 0..=4 {
        let (live, db, covers) = populated("Current");
        let before = facts(&db.lock().unwrap());
        let plan = PreparedRestore::prepare(&db.root, &selected).unwrap();
        let token = plan.preview.token.clone();
        let history = db.root.join("restore-history").join(&token);
        fs::create_dir_all(history.parent().unwrap()).unwrap();
        fs::rename(plan.directory.keep(), &history).unwrap();
        fs::create_dir(history.join("previous")).unwrap();
        archive(&db, &covers, &history.join("safety.zip"));
        let mut guard = db.begin_restore().unwrap();
        guard.close().unwrap();
        let journal = db.root.join("restore-journal.json");
        fs::write(
            &journal,
            serde_json::to_vec(
                &serde_json::json!({"version":1,"transaction":token,"committed":false}),
            )
            .unwrap(),
        )
        .unwrap();
        let moves = [
            (
                db.root.join("write-daily.sqlite3"),
                history.join("previous/write-daily.sqlite3"),
            ),
            (db.root.join("covers"), history.join("previous/covers")),
            (
                history.join("incoming/write-daily.sqlite3"),
                db.root.join("write-daily.sqlite3"),
            ),
            (history.join("incoming/covers"), db.root.join("covers")),
        ];
        for (from, to) in moves.iter().take(steps) {
            assert!(from.starts_with(&db.root) && to.starts_with(&db.root));
            fs::rename(from, to).unwrap();
        }
        guard.finish(false);
        drop(guard);
        drop(db);
        let recovered = database::open(live.path()).unwrap();
        assert_eq!(
            facts(&recovered.lock().unwrap()),
            before,
            "boundary {steps}"
        );
        assert!(!journal_exists(live.path()));
        assert!(history.join("safety.zip").exists());
    }
}

#[test]
fn malformed_recovery_markers_fail_closed_without_creating_a_fresh_library() {
    let (live, db, _) = populated("Current");
    let before = facts(&db.lock().unwrap());
    drop(db);
    fs::write(live.path().join("restore-journal.json"), b"{broken").unwrap();
    assert!(database::open(live.path()).is_err());
    fs::remove_file(live.path().join("restore-journal.json")).unwrap();
    assert_eq!(
        facts(&database::open(live.path()).unwrap().lock().unwrap()),
        before
    );
    fs::create_dir(live.path().join("restore-history")).unwrap();
    fs::rename(
        live.path().join("write-daily.sqlite3"),
        live.path().join("parked.sqlite3"),
    )
    .unwrap();
    assert!(database::open(live.path()).is_err());
    assert!(!live.path().join("write-daily.sqlite3").exists());
}

#[cfg(windows)]
#[test]
fn a_real_directory_rename_failure_rolls_back_the_db_move_and_reopens_the_old_library() {
    use std::os::windows::fs::OpenOptionsExt;
    let (source, selected_db, selected_covers) = populated("Selected");
    let selected = source.path().join("source.zip");
    archive(&selected_db, &selected_covers, &selected);
    let (live, db, covers) = populated("Current");
    let before = facts(&db.lock().unwrap());
    let directory_lock = fs::OpenOptions::new()
        .read(true)
        .share_mode(0x1 | 0x2)
        .custom_flags(0x02000000)
        .open(live.path().join("covers"))
        .unwrap();
    let plan = PreparedRestore::prepare(&db.root, &selected).unwrap();
    let token = plan.preview.token.clone();
    assert!(plan.apply(&db, &covers).is_err());
    assert!(!db.blocked());
    assert_eq!(facts(&db.lock().unwrap()), before);
    assert!(!journal_exists(live.path()));
    assert!(
        live.path()
            .join("restore-history")
            .join(token)
            .join("safety.zip")
            .exists()
    );
    drop(directory_lock);
}

#[test]
fn restored_rows_activate_only_after_close_and_reopen_and_safety_backup_is_kept() {
    let source = tempfile::tempdir().unwrap();
    let source_db = database::open(source.path()).unwrap();
    let source_covers = CoverStore::new(source.path()).unwrap();
    let book = BookRepository::new(&mut source_db.lock().unwrap())
        .create(BookDetails {
            title: "Відновлена книга 🌿".into(),
            target_word_count: None,
            daily_word_goal: None,
            deadline: None,
        })
        .unwrap();
    let archive = source.path().join("library.zip");
    LibraryBackup::capture(&mut source_db.lock().unwrap(), &source_covers)
        .unwrap()
        .write_new(&archive)
        .unwrap();
    let live = tempfile::tempdir().unwrap();
    let db = database::open(live.path()).unwrap();
    let covers = CoverStore::new(live.path()).unwrap();
    let original = BookRepository::new(&mut db.lock().unwrap())
        .create(BookDetails {
            title: "Current".into(),
            target_word_count: None,
            daily_word_goal: None,
            deadline: None,
        })
        .unwrap();
    let prepared = PreparedRestore::prepare(&db.root, &archive).unwrap();
    let token = prepared.preview.token.clone();
    assert_eq!(prepared.preview.book_count, 1);
    prepared.apply(&db, &covers).unwrap();
    assert!(db.restored());
    assert!(db.lock().is_err());
    assert!(
        live.path()
            .join("restore-history")
            .join(&token)
            .join("safety.zip")
            .is_file()
    );
    assert!(database::open(live.path()).is_err());
    drop(db);
    let reopened = database::open(live.path()).unwrap();
    let rows = BookRepository::new(&mut reopened.lock().unwrap())
        .list()
        .unwrap();
    assert_eq!(rows, vec![book]);
    assert_ne!(rows[0].id, original.id);
    assert!(!journal_exists(live.path()));
}
