use crate::{covers::CoverStore, database, exports::new_destination};
use rusqlite::{
    Connection, OpenFlags, TransactionBehavior,
    backup::{Backup, StepResult},
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeSet,
    fs::{self, File},
    io::{Read, Write},
    path::{Path, PathBuf},
    time::Duration,
};
use zip::{CompressionMethod, ZipArchive, ZipWriter, write::SimpleFileOptions};

pub(crate) const DATABASE_NAME: &str = "write-daily.sqlite3";
pub(crate) const MAX_DATABASE_BYTES: u64 = 4 * 1024 * 1024 * 1024;
pub(crate) const MAX_PAYLOAD_BYTES: u64 = 8 * 1024 * 1024 * 1024;
pub(crate) const MAX_FILES: usize = 100_000;
pub(crate) const MAX_MANIFEST_BYTES: usize = 32 * 1024 * 1024;

#[derive(Debug, thiserror::Error)]
pub enum BackupError {
    #[error("Invalid library snapshot")]
    InvalidSource,
    #[error("Backup exceeds supported bounds")]
    TooLarge,
    #[error("Another writer is active")]
    Busy,
    #[error("Choose a new ZIP file")]
    InvalidDestination,
    #[error("Destination already exists")]
    AlreadyExists,
    #[error(transparent)]
    Sql(#[from] rusqlite::Error),
    #[error(transparent)]
    Cover(#[from] crate::covers::CoverError),
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Zip(#[from] zip::result::ZipError),
    #[error(transparent)]
    Json(#[from] serde_json::Error),
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BackupFile {
    pub path: String,
    pub byte_length: u64,
    pub sha256: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BackupManifest {
    pub format: String,
    pub format_version: u32,
    pub application_version: String,
    pub created_at: String,
    pub database_schema_version: i32,
    pub database_application_id: i32,
    pub book_count: u64,
    pub chapter_count: u64,
    pub cover_count: u64,
    pub files: Vec<BackupFile>,
}

#[derive(Debug, Serialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum BackupResult {
    Cancelled,
    Created {
        #[serde(rename = "fileName")]
        file_name: String,
        #[serde(rename = "createdAt")]
        created_at: String,
        #[serde(rename = "bookCount")]
        book_count: u64,
        #[serde(rename = "chapterCount")]
        chapter_count: u64,
        #[serde(rename = "coverCount")]
        cover_count: u64,
    },
}

pub struct LibraryBackup {
    directory: tempfile::TempDir,
    pub manifest: BackupManifest,
    pub file_name: String,
}

fn digest(mut reader: impl Read, limit: u64) -> Result<(u64, String), BackupError> {
    let mut hash = Sha256::new();
    let mut total = 0u64;
    let mut buffer = [0u8; 64 * 1024];
    loop {
        let count = reader.read(&mut buffer)?;
        if count == 0 {
            break;
        }
        total = total
            .checked_add(count as u64)
            .ok_or(BackupError::TooLarge)?;
        if total > limit {
            return Err(BackupError::TooLarge);
        }
        hash.update(&buffer[..count]);
    }
    Ok((total, format!("{:x}", hash.finalize())))
}

fn file_entry(root: &Path, path: &str) -> Result<BackupFile, BackupError> {
    let (byte_length, sha256) = digest(File::open(root.join(path))?, MAX_PAYLOAD_BYTES)?;
    Ok(BackupFile {
        path: path.into(),
        byte_length,
        sha256,
    })
}

pub(crate) fn validate_database(connection: &Connection) -> Result<(), BackupError> {
    let identity: i32 = connection.pragma_query_value(None, "application_id", |r| r.get(0))?;
    let version: i32 = connection.pragma_query_value(None, "user_version", |r| r.get(0))?;
    let integrity: String = connection.query_row("PRAGMA integrity_check(1)", [], |r| r.get(0))?;
    let foreign_keys: bool = connection.query_row(
        "SELECT EXISTS(SELECT 1 FROM pragma_foreign_key_check)",
        [],
        |r| r.get(0),
    )?;
    if identity != database::APPLICATION_ID
        || version != database::SCHEMA_VERSION
        || integrity != "ok"
        || foreign_keys
    {
        return Err(BackupError::InvalidSource);
    }
    Ok(())
}

fn natural(connection: &Connection, sql: &str) -> Result<u64, BackupError> {
    let value: i64 = connection.query_row(sql, [], |row| row.get(0))?;
    u64::try_from(value).map_err(|_| BackupError::InvalidSource)
}

impl LibraryBackup {
    /// One cooperative writer reservation covers BOTH the online SQLite snapshot
    /// and every referenced immutable cover. No DB lock survives capture.
    pub fn capture(connection: &mut Connection, covers: &CoverStore) -> Result<Self, BackupError> {
        let source_path = PathBuf::from(connection.path().ok_or(BackupError::InvalidSource)?);
        if source_path.as_os_str().is_empty() {
            return Err(BackupError::InvalidSource);
        }
        let directory = tempfile::Builder::new()
            .prefix("writedaily-backup-")
            .tempdir()?;
        let guard = connection.transaction_with_behavior(TransactionBehavior::Immediate)?;
        let created_at =
            crate::books::validation::timestamp(None).map_err(|_| BackupError::InvalidSource)?;
        // A separate read-only handle avoids calling backup_step on a handle
        // already owning a write transaction (SQLITE_LOCKED). WAL readers can
        // coexist with our reservation, but other app writers/cover cleanup cannot.
        let source = Connection::open_with_flags(source_path, OpenFlags::SQLITE_OPEN_READ_ONLY)?;
        source.busy_timeout(Duration::from_secs(5))?;
        let pages = natural(&source, "PRAGMA page_count")?;
        let page_size = natural(&source, "PRAGMA page_size")?;
        if pages
            .checked_mul(page_size)
            .is_none_or(|size| size > MAX_DATABASE_BYTES)
        {
            return Err(BackupError::TooLarge);
        }
        let mut snapshot = Connection::open(directory.path().join(DATABASE_NAME))?;
        {
            let backup = Backup::new(&source, &mut snapshot)?;
            if !matches!(backup.step(-1)?, StepResult::Done) {
                return Err(BackupError::Busy);
            }
        }
        snapshot.pragma_update(None, "journal_mode", "DELETE")?;
        snapshot.pragma_update(None, "synchronous", "FULL")?;
        validate_database(&snapshot)?;
        let book_count = natural(&snapshot, "SELECT count(*) FROM books")?;
        let chapter_count = natural(&snapshot, "SELECT count(*) FROM chapters")?;
        let references = snapshot.prepare("SELECT DISTINCT cover_path FROM books WHERE cover_path IS NOT NULL ORDER BY cover_path LIMIT ?1")?
            .query_map([MAX_FILES as i64], |r| r.get::<_, String>(0))?.collect::<Result<BTreeSet<_>, _>>()?;
        if references.len() + 1 > MAX_FILES {
            return Err(BackupError::TooLarge);
        }
        fs::create_dir(directory.path().join("covers"))?;
        let mut size = fs::metadata(directory.path().join(DATABASE_NAME))?.len();
        for reference in &references {
            let bytes = covers.read_managed(reference)?; // validates path, size and original stored PNG
            size = size
                .checked_add(bytes.len() as u64)
                .ok_or(BackupError::TooLarge)?;
            if size > MAX_PAYLOAD_BYTES {
                return Err(BackupError::TooLarge);
            }
            fs::write(directory.path().join(reference), bytes)?;
        }
        drop(snapshot);
        drop(source);
        guard.rollback()?; // No edits or cleanup; releases the source reservation.
        let mut files = vec![file_entry(directory.path(), DATABASE_NAME)?];
        for reference in &references {
            files.push(file_entry(directory.path(), reference)?);
        }
        let file_name = format!(
            "WriteDaily-backup-{}.zip",
            created_at.replace([':', '.'], "-")
        );
        let manifest = BackupManifest {
            format: "writedaily-library".into(),
            format_version: 1,
            application_version: env!("CARGO_PKG_VERSION").into(),
            created_at,
            database_schema_version: database::SCHEMA_VERSION,
            database_application_id: database::APPLICATION_ID,
            book_count,
            chapter_count,
            cover_count: references.len() as u64,
            files,
        };
        let captured = Self {
            directory,
            manifest,
            file_name,
        };
        captured.build_archive()?;
        Ok(captured)
    }

    fn archive_path(&self) -> PathBuf {
        self.directory.path().join("backup.zip")
    }

    fn build_archive(&self) -> Result<(), BackupError> {
        let manifest = serde_json::to_vec_pretty(&self.manifest)?;
        if manifest.len() > MAX_MANIFEST_BYTES {
            return Err(BackupError::TooLarge);
        }
        let options = SimpleFileOptions::default()
            .compression_method(CompressionMethod::Stored)
            .large_file(true)
            .unix_permissions(0o600);
        let mut zip = ZipWriter::new(File::create(self.archive_path())?);
        for entry in &self.manifest.files {
            zip.start_file(&entry.path, options)?;
            std::io::copy(
                &mut File::open(self.directory.path().join(&entry.path))?,
                &mut zip,
            )?;
        }
        zip.start_file("manifest.json", options)?;
        zip.write_all(&manifest)?;
        zip.finish()?.sync_all()?;
        // Verify OUR generated archive, not an untrusted restore input. No extraction.
        let mut zip = ZipArchive::new(File::open(self.archive_path())?)?;
        if zip.len() != self.manifest.files.len() + 1 {
            return Err(BackupError::InvalidSource);
        }
        for (index, expected) in self.manifest.files.iter().enumerate() {
            let entry = zip.by_index(index)?;
            if entry.name() != expected.path
                || entry.size() != expected.byte_length
                || entry.compression() != CompressionMethod::Stored
            {
                return Err(BackupError::InvalidSource);
            }
            if digest(entry, expected.byte_length)?
                != (expected.byte_length, expected.sha256.clone())
            {
                return Err(BackupError::InvalidSource);
            }
        }
        let mut actual = Vec::new();
        zip.by_name("manifest.json")?
            .take(manifest.len() as u64 + 1)
            .read_to_end(&mut actual)?;
        if actual != manifest {
            return Err(BackupError::InvalidSource);
        }
        Ok(())
    }

    pub fn write_new(&self, path: &Path) -> Result<BackupResult, BackupError> {
        let destination =
            new_destination(path, "zip").map_err(|_| BackupError::InvalidDestination)?;
        if destination.starts_with(fs::canonicalize(self.directory.path())?) {
            return Err(BackupError::InvalidDestination);
        }
        let file_name = destination
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or(BackupError::InvalidDestination)?
            .to_owned();
        let mut staging = tempfile::Builder::new()
            .prefix(".writedaily-backup-")
            .tempfile_in(
                destination
                    .parent()
                    .ok_or(BackupError::InvalidDestination)?,
            )?;
        std::io::copy(&mut File::open(self.archive_path())?, &mut staging)?;
        staging.as_file().sync_all()?;
        staging.persist_noclobber(destination).map_err(|error| {
            if error.error.kind() == std::io::ErrorKind::AlreadyExists {
                BackupError::AlreadyExists
            } else {
                BackupError::Io(error.error)
            }
        })?;
        Ok(BackupResult::Created {
            file_name,
            created_at: self.manifest.created_at.clone(),
            book_count: self.manifest.book_count,
            chapter_count: self.manifest.chapter_count,
            cover_count: self.manifest.cover_count,
        })
    }
}

#[cfg(test)]
mod tests;
