use super::*;
use crate::{
    backups::{
        DATABASE_NAME, MAX_DATABASE_BYTES, MAX_FILES, MAX_MANIFEST_BYTES, MAX_PAYLOAD_BYTES,
    },
    books::{
        self,
        validation::{parse_timestamp, valid_cover},
    },
    chapters::for_each_chapter,
    covers::{CoverStore, ordinary},
    database,
};
use rusqlite::{Connection, OpenFlags};
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeSet,
    fs::{self, File, OpenOptions},
    io::{Read, Write},
};
use zip::{CompressionMethod, ZipArchive};

pub(super) fn safe_directory(root: &Path, path: &Path) -> Result<(), RestoreError> {
    if !path.starts_with(root)
        || !ordinary(&fs::symlink_metadata(path)?)
        || !path.is_dir()
        || !fs::canonicalize(path)?.starts_with(root)
    {
        return Err(RestoreError::InvalidBackup);
    }
    Ok(())
}

fn copy_checked(
    mut input: impl Read,
    mut output: impl Write,
    expected: &crate::backups::BackupFile,
) -> Result<(), RestoreError> {
    let mut bytes = 0u64;
    let mut hash = Sha256::new();
    let mut buffer = [0u8; 65536];
    loop {
        let count = input.read(&mut buffer)?;
        if count == 0 {
            break;
        }
        bytes = bytes
            .checked_add(count as u64)
            .ok_or(RestoreError::TooLarge)?;
        if bytes > expected.byte_length {
            return Err(RestoreError::InvalidBackup);
        }
        hash.update(&buffer[..count]);
        output.write_all(&buffer[..count])?;
    }
    if bytes != expected.byte_length || format!("{:x}", hash.finalize()) != expected.sha256 {
        return Err(RestoreError::InvalidBackup);
    }
    Ok(())
}

pub(super) fn validate_payload(root: &Path, manifest: &BackupManifest) -> Result<(), RestoreError> {
    let mut c =
        Connection::open_with_flags(root.join(DATABASE_NAME), OpenFlags::SQLITE_OPEN_READ_ONLY)?;
    c.pragma_update(None, "trusted_schema", false)?;
    if database::schema(&c)? != database::expected_schema()? {
        return Err(RestoreError::Unsupported);
    }
    crate::backups::validate_database(&c).map_err(|_| RestoreError::InvalidBackup)?;
    let mut books = 0u64;
    let mut chapters = 0u64;
    let mut references = BTreeSet::new();
    {
        let mut ids = c.prepare("SELECT id FROM books ORDER BY id")?;
        for row in ids.query_map([], |row| row.get::<_, String>(0))? {
            let book = books::load(&c, &row?).map_err(|_| RestoreError::InvalidBackup)?;
            books += 1;
            if let Some(path) = book.cover_path {
                references.insert(path);
            }
            for_each_chapter(&c, &book.id, |_| {
                chapters += 1;
                Ok(())
            })
            .map_err(|_| RestoreError::InvalidBackup)?;
        }
    }
    if (books, chapters, references.len() as u64)
        != (
            manifest.book_count,
            manifest.chapter_count,
            manifest.cover_count,
        )
        || references
            != manifest
                .files
                .iter()
                .skip(1)
                .map(|entry| entry.path.clone())
                .collect()
    {
        return Err(RestoreError::InvalidBackup);
    }
    crate::editor_preferences::get(&mut c).map_err(|_| RestoreError::InvalidBackup)?;
    crate::schedule::read(&c).map_err(|_| RestoreError::InvalidBackup)?;
    crate::achievements::list(&c).map_err(|_| RestoreError::InvalidBackup)?;
    let covers = CoverStore::new(root).map_err(|_| RestoreError::InvalidBackup)?;
    for file in &manifest.files {
        if file.path != DATABASE_NAME {
            covers
                .read_managed(&file.path)
                .map_err(|_| RestoreError::InvalidBackup)?;
        }
        copy_checked(File::open(root.join(&file.path))?, std::io::sink(), file)?;
    }
    Ok(())
}

pub(super) fn prepare(root: &Path, selected: &Path) -> Result<PreparedRestore, RestoreError> {
    let root = fs::canonicalize(root)?;
    safe_directory(&root, &root)?;
    let working = root.join("restore-work");
    if !working.exists() {
        fs::create_dir(&working)?;
    }
    safe_directory(&root, &working)?;
    let directory = tempfile::Builder::new()
        .prefix("preview-")
        .tempdir_in(&working)?;
    let incoming = directory.path().join("incoming");
    fs::create_dir(&incoming)?;
    fs::create_dir(incoming.join("covers"))?;
    let file_name = selected
        .file_name()
        .and_then(|name| name.to_str())
        .filter(|name| {
            name.encode_utf16().count() <= 255
                && name.len() > 4
                && name.to_ascii_lowercase().ends_with(".zip")
                && !name.chars().any(char::is_control)
        })
        .ok_or(RestoreError::InvalidBackup)?
        .to_owned();
    let source = File::open(selected)?;
    if source.metadata()?.len() > MAX_PAYLOAD_BYTES + 1024 * 1024 * 1024 {
        return Err(RestoreError::TooLarge);
    }
    let mut zip = ZipArchive::new(source)?;
    if zip.len() < 2 || zip.len() > MAX_FILES + 1 {
        return Err(RestoreError::TooLarge);
    }
    let mut names = BTreeSet::new();
    for i in 0..zip.len() {
        let entry = zip.by_index(i)?;
        if entry.encrypted()
            || entry.is_dir()
            || entry.is_symlink()
            || entry.compression() != CompressionMethod::Stored
            || entry.name_raw() != entry.name().as_bytes()
            || !names.insert(entry.name().to_owned())
        {
            return Err(RestoreError::InvalidBackup);
        }
        if entry.name() != "manifest.json"
            && entry.name() != DATABASE_NAME
            && !valid_cover(entry.name())
        {
            return Err(RestoreError::InvalidBackup);
        }
    }
    let manifest: BackupManifest = {
        let entry = zip.by_name("manifest.json")?;
        if entry.size() > MAX_MANIFEST_BYTES as u64 {
            return Err(RestoreError::TooLarge);
        }
        let mut data = Vec::new();
        entry
            .take(MAX_MANIFEST_BYTES as u64 + 1)
            .read_to_end(&mut data)?;
        if data.len() > MAX_MANIFEST_BYTES {
            return Err(RestoreError::TooLarge);
        }
        serde_json::from_slice(&data)?
    };
    if manifest.format != "writedaily-library"
        || manifest.format_version != 1
        || manifest.database_schema_version != database::SCHEMA_VERSION
        || manifest.database_application_id != database::APPLICATION_ID
    {
        return Err(RestoreError::Unsupported);
    }
    if parse_timestamp(&manifest.created_at).is_none()
        || manifest.application_version.is_empty()
        || manifest.application_version.len() > 64
        || manifest.files.is_empty()
        || manifest.files.len() > MAX_FILES
        || manifest.files[0].path != DATABASE_NAME
        || manifest.cover_count > manifest.book_count
        || manifest.book_count > crate::chapters::MAX_SAFE_INTEGER as u64
        || manifest.chapter_count > crate::chapters::MAX_SAFE_INTEGER as u64
        || manifest.cover_count.checked_add(1) != Some(manifest.files.len() as u64)
    {
        return Err(RestoreError::InvalidBackup);
    }
    let mut expected = BTreeSet::from(["manifest.json".to_owned()]);
    let mut total = 0u64;
    for (i, entry) in manifest.files.iter().enumerate() {
        if (i > 0 && !valid_cover(&entry.path))
            || !expected.insert(entry.path.clone())
            || entry.sha256.len() != 64
            || !entry
                .sha256
                .bytes()
                .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
            || entry.byte_length == 0
        {
            return Err(RestoreError::InvalidBackup);
        }
        if (i == 0 && entry.byte_length > MAX_DATABASE_BYTES)
            || (i > 0 && entry.byte_length > 8 * 1024 * 1024)
        {
            return Err(RestoreError::TooLarge);
        }
        total = total
            .checked_add(entry.byte_length)
            .ok_or(RestoreError::TooLarge)?;
        if total > MAX_PAYLOAD_BYTES {
            return Err(RestoreError::TooLarge);
        }
    }
    if names != expected {
        return Err(RestoreError::InvalidBackup);
    }
    for expected in &manifest.files {
        let entry = zip.by_name(&expected.path)?;
        if entry.size() != expected.byte_length {
            return Err(RestoreError::InvalidBackup);
        }
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(incoming.join(&expected.path))?;
        copy_checked(entry, &mut file, expected)?;
        file.sync_all()?;
    }
    validate_payload(&incoming, &manifest)?;
    let preview = RestorePreview {
        token: uuid::Uuid::new_v4().to_string(),
        file_name,
        created_at: manifest.created_at.clone(),
        book_count: manifest.book_count,
        chapter_count: manifest.chapter_count,
        cover_count: manifest.cover_count,
    };
    Ok(PreparedRestore {
        directory,
        root,
        manifest,
        preview,
    })
}
