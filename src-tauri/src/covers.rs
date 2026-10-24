use crate::books::{
    Book, BookError, BookRepository, load,
    validation::{timestamp, valid_cover},
};
use image::{ImageFormat, ImageReader, Limits};
use rusqlite::{Connection, TransactionBehavior, params};
use serde::Serialize;
use std::{
    fs::{self, OpenOptions},
    io::{Cursor, Read, Write},
    path::{Path, PathBuf},
};
use uuid::Uuid;

pub const MAX_INPUT: usize = 5 * 1024 * 1024;
const MAX_STORED: usize = 8 * 1024 * 1024;

#[derive(Debug, thiserror::Error)]
pub enum CoverError {
    #[error("Invalid or unsupported cover image")]
    InvalidImage,
    #[error("Cover exceeds the supported size")]
    TooLarge,
    #[error("Unsafe managed cover path")]
    UnsafePath,
    #[error(transparent)]
    Book(#[from] BookError),
    #[error(transparent)]
    Sql(#[from] rusqlite::Error),
    #[error(transparent)]
    Io(#[from] std::io::Error),
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CoverResult {
    pub book: Book,
    pub cleanup_pending: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteResult {
    pub cleanup_pending: bool,
}

#[cfg(test)]
#[path = "covers_tests.rs"]
mod tests;

pub struct CoverStore {
    root: PathBuf,
}

fn ordinary(metadata: &fs::Metadata) -> bool {
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        if metadata.file_attributes() & 0x400 != 0 {
            return false;
        }
    }
    !metadata.file_type().is_symlink()
}

fn normalize(bytes: &[u8]) -> Result<Vec<u8>, CoverError> {
    if bytes.len() > MAX_INPUT {
        return Err(CoverError::TooLarge);
    }
    let mut reader = ImageReader::new(Cursor::new(bytes))
        .with_guessed_format()
        .map_err(|_| CoverError::InvalidImage)?;
    if !matches!(
        reader.format(),
        Some(ImageFormat::Png | ImageFormat::Jpeg | ImageFormat::WebP)
    ) {
        return Err(CoverError::InvalidImage);
    }
    let mut limits = Limits::default();
    limits.max_image_width = Some(4096);
    limits.max_image_height = Some(4096);
    limits.max_alloc = Some(128 * 1024 * 1024);
    reader.limits(limits);
    let decoded = reader.decode().map_err(|_| CoverError::InvalidImage)?;
    let normalized = if decoded.width() > 1200 || decoded.height() > 1600 {
        decoded.thumbnail(1200, 1600)
    } else {
        decoded
    }
    .to_rgba8();
    let mut output = Cursor::new(Vec::new());
    image::DynamicImage::ImageRgba8(normalized)
        .write_to(&mut output, ImageFormat::Png)
        .map_err(|_| CoverError::InvalidImage)?;
    if output.get_ref().len() > MAX_STORED {
        return Err(CoverError::TooLarge);
    }
    Ok(output.into_inner())
}

impl CoverStore {
    pub fn new(data: &Path) -> Result<Self, CoverError> {
        // Do not follow a replaced app-data directory or covers junction/symlink.
        if !ordinary(&fs::symlink_metadata(data)?) {
            return Err(CoverError::UnsafePath);
        }
        let root = data.join("covers");
        if !root.exists() {
            fs::create_dir(&root)?;
        }
        if !ordinary(&fs::symlink_metadata(&root)?) || !root.is_dir() {
            return Err(CoverError::UnsafePath);
        }
        Ok(Self {
            root: fs::canonicalize(root)?,
        })
    }

    fn path(&self, reference: &str) -> Result<PathBuf, CoverError> {
        if !valid_cover(reference) {
            return Err(CoverError::UnsafePath);
        }
        if !ordinary(&fs::symlink_metadata(&self.root)?)
            || !ordinary(&fs::symlink_metadata(
                self.root.parent().ok_or(CoverError::UnsafePath)?,
            )?)
        {
            return Err(CoverError::UnsafePath);
        }
        let path = self.root.join(
            reference
                .strip_prefix("covers/")
                .ok_or(CoverError::UnsafePath)?,
        );
        match fs::symlink_metadata(&path) {
            Ok(metadata) if !ordinary(&metadata) || !metadata.is_file() => {
                return Err(CoverError::UnsafePath);
            }
            Err(error) if error.kind() != std::io::ErrorKind::NotFound => return Err(error.into()),
            _ => {}
        }
        Ok(path)
    }

    /// Only durable, explicitly queued, unreferenced owned paths are considered. Never scan/delete arbitrary files.
    pub fn cleanup(&self, connection: &mut Connection) -> Result<bool, CoverError> {
        let transaction = connection.transaction_with_behavior(TransactionBehavior::Immediate)?;
        let paths = transaction
            .prepare("SELECT path FROM pending_cover_cleanup")?
            .query_map([], |row| row.get::<_, String>(0))?
            .collect::<Result<Vec<_>, _>>()?;
        for reference in paths {
            let referenced: bool = transaction.query_row(
                "SELECT EXISTS(SELECT 1 FROM books WHERE cover_path = ?1)",
                [&reference],
                |row| row.get(0),
            )?;
            if referenced {
                continue;
            }
            let removed = self
                .path(&reference)
                .and_then(|path| match fs::remove_file(path) {
                    Ok(()) => Ok(()),
                    Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
                    Err(error) => Err(error.into()),
                });
            if removed.is_ok() {
                transaction.execute(
                    "DELETE FROM pending_cover_cleanup WHERE path = ?1",
                    [&reference],
                )?;
            }
        }
        let pending = transaction.query_row(
            "SELECT EXISTS(SELECT 1 FROM pending_cover_cleanup)",
            [],
            |row| row.get(0),
        )?;
        transaction.commit()?;
        Ok(pending)
    }

    pub fn set(
        &self,
        connection: &mut Connection,
        id: &str,
        expected: &str,
        bytes: Option<&[u8]>,
    ) -> Result<CoverResult, CoverError> {
        let png = bytes.map(normalize).transpose()?;
        let reference = png
            .as_ref()
            .map(|_| format!("covers/{}.png", Uuid::new_v4()));
        if let Some(reference) = &reference {
            // Persist intent before writing a new file. Recovery can clean an interrupted import.
            let path = self.path(reference)?;
            if path.exists() {
                return Err(CoverError::UnsafePath);
            }
            connection.execute(
                "INSERT INTO pending_cover_cleanup(path) VALUES (?1)",
                [reference],
            )?;
        }
        let result: Result<Book, CoverError> = (|| {
            let transaction =
                connection.transaction_with_behavior(TransactionBehavior::Immediate)?;
            let book = load(&transaction, id)?;
            if book.updated_at != expected {
                return Err(BookError::Conflict.into());
            }
            if let (Some(reference), Some(png)) = (&reference, &png) {
                let registered: bool = transaction.query_row(
                    "SELECT EXISTS(SELECT 1 FROM pending_cover_cleanup WHERE path = ?1)",
                    [reference],
                    |row| row.get(0),
                )?;
                // Another process may have completed cleanup between registration and this lock.
                if !registered {
                    return Err(CoverError::UnsafePath);
                }
                let path = self.path(reference)?;
                let file = OpenOptions::new().write(true).create_new(true).open(path);
                let mut file = match file {
                    Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {
                        transaction.execute(
                            "DELETE FROM pending_cover_cleanup WHERE path = ?1",
                            [reference],
                        )?;
                        transaction.commit()?;
                        return Err(CoverError::UnsafePath);
                    }
                    other => other?,
                };
                file.write_all(png)?;
                file.sync_all()?;
            }
            if let Some(old) = &book.cover_path {
                transaction.execute(
                    "INSERT OR IGNORE INTO pending_cover_cleanup(path) VALUES (?1)",
                    [old],
                )?;
            }
            let updated_at = timestamp(Some(&book.updated_at))?;
            transaction.execute("UPDATE books SET cover_path = ?1, updated_at = ?2 WHERE id = ?3 AND updated_at = ?4", params![reference, updated_at, id, expected])?;
            if let Some(reference) = &reference {
                transaction.execute(
                    "DELETE FROM pending_cover_cleanup WHERE path = ?1",
                    [reference],
                )?;
            }
            let saved = load(&transaction, id)?;
            transaction.commit()?;
            Ok(saved)
        })();
        let cleanup_pending = self.cleanup(connection).unwrap_or(true);
        result.map(|book| CoverResult {
            book,
            cleanup_pending,
        })
    }

    pub fn read(
        &self,
        connection: &mut Connection,
        id: &str,
        expected_path: &str,
    ) -> Result<Vec<u8>, CoverError> {
        let book = BookRepository::new(connection).get(id)?;
        if book.cover_path.as_deref() != Some(expected_path) {
            return Err(BookError::Conflict.into());
        }
        let path = self.path(expected_path)?;
        let mut bytes = Vec::new();
        fs::File::open(path)?
            .take(MAX_STORED as u64 + 1)
            .read_to_end(&mut bytes)?;
        if bytes.len() > MAX_STORED {
            return Err(CoverError::TooLarge);
        }
        let mut reader = ImageReader::with_format(Cursor::new(&bytes), ImageFormat::Png);
        let mut limits = Limits::default();
        limits.max_image_width = Some(1200);
        limits.max_image_height = Some(1600);
        limits.max_alloc = Some(32 * 1024 * 1024);
        reader.limits(limits);
        reader.decode().map_err(|_| CoverError::InvalidImage)?;
        Ok(bytes)
    }

    pub fn delete(
        &self,
        connection: &mut Connection,
        id: &str,
        expected: &str,
    ) -> Result<DeleteResult, CoverError> {
        BookRepository::new(connection).delete_with_cleanup(id, expected)?;
        Ok(DeleteResult {
            cleanup_pending: self.cleanup(connection).unwrap_or(true),
        })
    }
}
