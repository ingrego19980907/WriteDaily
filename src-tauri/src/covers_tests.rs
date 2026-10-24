use super::*;
use crate::books::BookDetails;

fn setup() -> (tempfile::TempDir, CoverStore, Connection) {
    let directory = tempfile::tempdir().unwrap();
    let connection = crate::database::open(directory.path())
        .unwrap()
        .into_inner()
        .unwrap();
    let store = CoverStore::new(directory.path()).unwrap();
    (directory, store, connection)
}
fn create(connection: &mut Connection) -> Book {
    BookRepository::new(connection)
        .create(BookDetails {
            title: "Story".into(),
            target_word_count: None,
            daily_word_goal: None,
            deadline: None,
        })
        .unwrap()
}
fn image(format: ImageFormat) -> Vec<u8> {
    let mut bytes = Cursor::new(Vec::new());
    image::DynamicImage::new_rgb8(8, 12)
        .write_to(&mut bytes, format)
        .unwrap();
    bytes.into_inner()
}

#[test]
fn accepts_supported_contents_and_reencodes_to_png_ignoring_source_filename() {
    for format in [ImageFormat::Png, ImageFormat::Jpeg, ImageFormat::WebP] {
        let bytes = normalize(&image(format)).unwrap();
        assert_eq!(image::guess_format(&bytes).unwrap(), ImageFormat::Png);
        assert_eq!(image::load_from_memory(&bytes).unwrap().width(), 8);
    }
}

#[test]
fn rejects_unsupported_corrupt_oversized_and_extreme_dimensions() {
    for bytes in [
        b"<svg xmlns='http://www.w3.org/2000/svg'></svg>".as_slice(),
        b"GIF89a",
        b"\x89PNG\r\n\x1a\ntruncated",
        b"",
        b"not an image",
    ] {
        assert!(normalize(bytes).is_err());
    }
    assert!(matches!(
        normalize(&vec![0; MAX_INPUT + 1]),
        Err(CoverError::TooLarge)
    ));
    let mut bytes = Cursor::new(Vec::new());
    image::DynamicImage::new_rgb8(4097, 1)
        .write_to(&mut bytes, ImageFormat::Png)
        .unwrap();
    assert!(normalize(bytes.get_ref()).is_err());
    let mut bytes = Cursor::new(Vec::new());
    image::DynamicImage::new_rgb8(2000, 2000)
        .write_to(&mut bytes, ImageFormat::Png)
        .unwrap();
    let normalized = image::load_from_memory(&normalize(bytes.get_ref()).unwrap()).unwrap();
    assert!(normalized.width() <= 1200 && normalized.height() <= 1600);
}

#[test]
fn independent_covers_survive_reopen_and_source_removal() {
    let (directory, store, mut connection) = setup();
    let first = create(&mut connection);
    let second = create(&mut connection);
    let source = directory.path().join("source.jpg");
    fs::write(&source, image(ImageFormat::Jpeg)).unwrap();
    let bytes = fs::read(&source).unwrap();
    let first = store
        .set(&mut connection, &first.id, &first.updated_at, Some(&bytes))
        .unwrap()
        .book;
    let second = store
        .set(
            &mut connection,
            &second.id,
            &second.updated_at,
            Some(&bytes),
        )
        .unwrap()
        .book;
    assert_ne!(first.cover_path, second.cover_path);
    assert!(source.exists());
    fs::remove_file(source).unwrap(); // Disposable source only; never a real user file.
    drop(connection);
    let mut reopened = crate::database::open(directory.path())
        .unwrap()
        .into_inner()
        .unwrap();
    let store = CoverStore::new(directory.path()).unwrap();
    assert!(!store.cleanup(&mut reopened).unwrap());
    assert_eq!(
        BookRepository::new(&mut reopened).get(&first.id).unwrap(),
        first
    );
    assert!(
        !store
            .read(
                &mut reopened,
                &first.id,
                first.cover_path.as_deref().unwrap()
            )
            .unwrap()
            .is_empty()
    );
    store
        .delete(&mut reopened, &first.id, &first.updated_at)
        .unwrap();
    assert!(
        store
            .read(
                &mut reopened,
                &second.id,
                second.cover_path.as_deref().unwrap()
            )
            .is_ok()
    );
}

#[test]
fn replacement_removal_and_covered_deletion_clean_only_owned_files_after_commit() {
    let (_directory, store, mut connection) = setup();
    let original = create(&mut connection);
    let first = store
        .set(
            &mut connection,
            &original.id,
            &original.updated_at,
            Some(&image(ImageFormat::Png)),
        )
        .unwrap()
        .book;
    let old_path = store.path(first.cover_path.as_deref().unwrap()).unwrap();
    let replaced = store
        .set(
            &mut connection,
            &first.id,
            &first.updated_at,
            Some(&image(ImageFormat::WebP)),
        )
        .unwrap();
    assert!(!replaced.cleanup_pending);
    assert!(!old_path.exists());
    let replaced_path = store
        .path(replaced.book.cover_path.as_deref().unwrap())
        .unwrap();
    let removed = store
        .set(&mut connection, &first.id, &replaced.book.updated_at, None)
        .unwrap()
        .book;
    assert!(removed.cover_path.is_none());
    assert!(!replaced_path.exists());
    let covered = store
        .set(
            &mut connection,
            &first.id,
            &removed.updated_at,
            Some(&image(ImageFormat::Png)),
        )
        .unwrap()
        .book;
    let owned = store.path(covered.cover_path.as_deref().unwrap()).unwrap();
    let unrelated = store.root.join("unrelated.txt");
    fs::write(&unrelated, b"keep").unwrap();
    assert!(
        !store
            .delete(&mut connection, &covered.id, &covered.updated_at)
            .unwrap()
            .cleanup_pending
    );
    assert!(!owned.exists());
    assert_eq!(fs::read(unrelated).unwrap(), b"keep");
    assert!(
        BookRepository::new(&mut connection)
            .get(&covered.id)
            .is_err()
    );
}

#[test]
fn committed_deletion_reports_deferred_cleanup_and_retries_safely() {
    let (_directory, store, mut connection) = setup();
    let book = create(&mut connection);
    let covered = store
        .set(
            &mut connection,
            &book.id,
            &book.updated_at,
            Some(&image(ImageFormat::Png)),
        )
        .unwrap()
        .book;
    let path = store.path(covered.cover_path.as_deref().unwrap()).unwrap();
    fs::remove_file(&path).unwrap();
    fs::create_dir(&path).unwrap();
    assert!(
        store
            .delete(&mut connection, &covered.id, &covered.updated_at)
            .unwrap()
            .cleanup_pending
    );
    assert!(
        BookRepository::new(&mut connection)
            .get(&covered.id)
            .is_err()
    );
    fs::remove_dir(&path).unwrap();
    fs::write(&path, b"queued orphan").unwrap();
    assert!(!store.cleanup(&mut connection).unwrap());
    assert!(!path.exists());
}

#[test]
fn failed_database_write_and_stale_updates_preserve_current_cover() {
    let (_directory, store, mut connection) = setup();
    let original = create(&mut connection);
    let covered = store
        .set(
            &mut connection,
            &original.id,
            &original.updated_at,
            Some(&image(ImageFormat::Png)),
        )
        .unwrap()
        .book;
    let path = store.path(covered.cover_path.as_deref().unwrap()).unwrap();
    assert!(matches!(
        store.set(
            &mut connection,
            &original.id,
            &original.updated_at,
            Some(&image(ImageFormat::Png))
        ),
        Err(CoverError::Book(BookError::Conflict))
    ));
    connection.execute_batch("CREATE TRIGGER fail_cover BEFORE UPDATE ON books BEGIN SELECT RAISE(ABORT, 'test failure'); END;").unwrap();
    assert!(
        store
            .set(
                &mut connection,
                &covered.id,
                &covered.updated_at,
                Some(&image(ImageFormat::Png))
            )
            .is_err()
    );
    assert!(
        store
            .set(&mut connection, &covered.id, &covered.updated_at, None)
            .is_err()
    );
    connection.execute_batch("CREATE TRIGGER fail_delete BEFORE DELETE ON books BEGIN SELECT RAISE(ABORT, 'test failure'); END;").unwrap();
    assert!(
        store
            .delete(&mut connection, &covered.id, &covered.updated_at)
            .is_err()
    );
    assert!(path.exists());
    assert_eq!(
        BookRepository::new(&mut connection)
            .get(&covered.id)
            .unwrap(),
        covered
    );
    assert_eq!(fs::read_dir(&store.root).unwrap().count(), 1);
}

#[test]
fn durable_cleanup_retries_after_reopen_and_never_follows_invalid_paths() {
    let (directory, store, mut connection) = setup();
    let reference = format!("covers/{}.png", Uuid::new_v4());
    let path = store.path(&reference).unwrap();
    // Simulate an interrupted import and a cleanup failure (directory in place of a file).
    connection
        .execute(
            "INSERT INTO pending_cover_cleanup VALUES (?1)",
            [&reference],
        )
        .unwrap();
    fs::create_dir(&path).unwrap();
    assert!(store.cleanup(&mut connection).unwrap());
    drop(connection);
    let mut reopened = crate::database::open(directory.path())
        .unwrap()
        .into_inner()
        .unwrap();
    fs::remove_dir(&path).unwrap();
    fs::write(&path, b"partial interrupted import").unwrap();
    assert!(!store.cleanup(&mut reopened).unwrap());
    assert!(!path.exists());
    let outside = directory.path().join("keep.txt");
    fs::write(&outside, b"keep").unwrap();
    reopened
        .execute(
            "INSERT INTO pending_cover_cleanup VALUES ('../keep.txt')",
            [],
        )
        .unwrap();
    assert!(store.cleanup(&mut reopened).unwrap());
    assert_eq!(fs::read(outside).unwrap(), b"keep");
    for invalid in [
        "../keep.txt",
        "covers/../keep.txt",
        "C:/cover.png",
        "covers/not-a-uuid.png",
        "covers/00000000-0000-4000-8000-000000000001.svg",
    ] {
        assert!(store.path(invalid).is_err());
    }
}

#[test]
fn referenced_files_are_never_cleaned_and_corrupt_reads_fail_without_modifying_metadata() {
    let (_directory, store, mut connection) = setup();
    let book = create(&mut connection);
    let covered = store
        .set(
            &mut connection,
            &book.id,
            &book.updated_at,
            Some(&image(ImageFormat::Png)),
        )
        .unwrap()
        .book;
    let reference = covered.cover_path.as_deref().unwrap();
    connection
        .execute("INSERT INTO pending_cover_cleanup VALUES (?1)", [reference])
        .unwrap();
    assert!(store.cleanup(&mut connection).unwrap());
    let path = store.path(reference).unwrap();
    assert!(path.exists());
    fs::write(&path, b"corrupt").unwrap();
    assert!(store.read(&mut connection, &book.id, reference).is_err());
    assert_eq!(
        BookRepository::new(&mut connection).get(&book.id).unwrap(),
        covered
    );
    assert!(
        store
            .read(&mut connection, &book.id, "covers/other.png")
            .is_err()
    );
}

#[cfg(windows)]
#[test]
fn replaced_cover_directory_junction_never_reads_or_deletes_outside_files() {
    let (_directory, store, mut connection) = setup();
    let outside = tempfile::tempdir().unwrap();
    let name = format!("{}.png", Uuid::new_v4());
    let outside_file = outside.path().join(&name);
    fs::write(&outside_file, b"preserve external file").unwrap();
    fs::remove_dir(&store.root).unwrap();
    let result = std::process::Command::new("cmd.exe")
        .args(["/c", "mklink", "/J"])
        .arg(&store.root)
        .arg(outside.path())
        .output()
        .unwrap();
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    connection
        .execute(
            "INSERT INTO pending_cover_cleanup VALUES (?1)",
            [format!("covers/{name}")],
        )
        .unwrap();
    assert!(store.cleanup(&mut connection).unwrap());
    assert!(store.path(&format!("covers/{name}")).is_err());
    assert_eq!(fs::read(outside_file).unwrap(), b"preserve external file");
    // Remove the disposable junction itself before TempDir cleanup; never recurse through it.
    fs::remove_dir(&store.root).unwrap();
}
