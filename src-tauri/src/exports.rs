use crate::chapters::{ChapterError, ChapterOrderEntry, ChapterRepository, for_each_chapter};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::{io::Write, path::Path, sync::Mutex};

#[derive(Default)]
pub struct ExportGate(pub Mutex<()>);

#[derive(Debug, thiserror::Error)]
pub enum ExportError {
    #[error(transparent)]
    Chapter(#[from] ChapterError),
    #[error("Choose a new text file")]
    InvalidDestination,
    #[error("Destination already exists")]
    AlreadyExists,
    #[error("Book contains no chapters")]
    EmptyBook,
    #[error("Book export exceeds supported limits")]
    TooLarge,
    #[error(transparent)]
    Io(#[from] std::io::Error),
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ExportDialogLabels {
    pub title: String,
    pub file_type: String,
}
impl ExportDialogLabels {
    pub fn valid(&self) -> bool {
        [&self.title, &self.file_type].iter().all(|label| {
            !label.is_empty()
                && label.chars().count() <= 160
                && !label.chars().any(char::is_control)
        })
    }
}

#[derive(Debug, Serialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum ChapterExportResult {
    Cancelled,
    Exported {
        #[serde(rename = "fileName")]
        file_name: String,
        revision: i64,
    },
}

pub struct SavedChapterExport {
    pub file_name: String,
    pub revision: i64,
    text: String,
}

impl SavedChapterExport {
    pub fn load(
        c: &mut Connection,
        book: &str,
        chapter: &str,
        revision: i64,
    ) -> Result<Self, ExportError> {
        if !(1..=crate::chapters::MAX_SAFE_INTEGER).contains(&revision) {
            return Err(ChapterError::Validation("invalid_revision").into());
        }
        let chapter = ChapterRepository::new(c).get(book, chapter)?;
        if chapter.summary.revision != revision {
            return Err(ChapterError::Conflict.into());
        }
        let body = chapter.content.plain_text();
        Ok(Self {
            file_name: file_name(&chapter.summary.title),
            revision,
            text: format!("{}\n\n{body}\n", chapter.summary.title),
        })
    }

    /// Called only with a path selected by the native Save As dialog. Never
    /// overwrite existing files (including symlinks), even if the name races.
    pub fn write_new(&self, path: &Path) -> Result<ChapterExportResult, ExportError> {
        let name = write_new(&self.text, path)?;
        Ok(ChapterExportResult::Exported {
            file_name: name,
            revision: self.revision,
        })
    }
}

fn write_new(text: &str, path: &Path) -> Result<String, ExportError> {
    let destination = new_destination(path, "txt")?;
    let name = destination
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or(ExportError::InvalidDestination)?;
    let mut staging = tempfile::Builder::new()
        .prefix(".writedaily-export-")
        .tempfile_in(
            destination
                .parent()
                .ok_or(ExportError::InvalidDestination)?,
        )?;
    staging.write_all(text.as_bytes())?;
    staging.as_file().sync_all()?;
    staging.persist_noclobber(&destination).map_err(|error| {
        if error.error.kind() == std::io::ErrorKind::AlreadyExists {
            ExportError::AlreadyExists
        } else {
            ExportError::Io(error.error)
        }
    })?;
    Ok(name.into())
}

/// Native Save As destinations only; shared by text exports and ZIP backups.
pub(crate) fn new_destination(
    path: &Path,
    extension: &str,
) -> Result<std::path::PathBuf, ExportError> {
    let name = path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or(ExportError::InvalidDestination)?;
    if !path.is_absolute()
        || name.len() <= extension.len() + 1
        || !path
            .extension()
            .is_some_and(|ext| ext.eq_ignore_ascii_case(extension))
        || name.chars().any(forbidden)
        || reserved(name)
        || name.ends_with([' ', '.'])
    {
        return Err(ExportError::InvalidDestination);
    }
    let parent = std::fs::canonicalize(path.parent().ok_or(ExportError::InvalidDestination)?)?;
    Ok(parent.join(name))
}

const MAX_BOOK_EXPORT_BYTES: usize = 64 * 1024 * 1024;
const MAX_BOOK_EXPORT_CHAPTERS: usize = 10_000;

#[derive(Debug, Serialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum BookExportResult {
    Cancelled,
    Exported {
        #[serde(rename = "fileName")]
        file_name: String,
        #[serde(rename = "bookUpdatedAt")]
        book_updated_at: String,
        chapters: Vec<ChapterOrderEntry>,
    },
}

pub struct SavedBookExport {
    pub file_name: String,
    book_updated_at: String,
    chapters: Vec<ChapterOrderEntry>,
    text: String,
}

fn push_bounded(output: &mut String, text: &str, limit: usize) -> Result<(), ChapterError> {
    if output
        .len()
        .checked_add(text.len())
        .is_none_or(|size| size > limit)
    {
        return Err(ChapterError::LimitReached);
    }
    output.push_str(text);
    Ok(())
}

impl SavedBookExport {
    pub fn load(
        c: &mut Connection,
        book_id: &str,
        expected_book_updated_at: &str,
        expected_chapters: &[ChapterOrderEntry],
    ) -> Result<Self, ExportError> {
        use crate::books::{
            self, BookError,
            validation::{parse_timestamp, valid_id},
        };
        if !valid_id(book_id) || parse_timestamp(expected_book_updated_at).is_none() {
            return Err(ChapterError::Validation("invalid_snapshot").into());
        }
        if expected_chapters.len() > MAX_BOOK_EXPORT_CHAPTERS {
            return Err(ExportError::TooLarge);
        }
        let mut ids = std::collections::HashSet::new();
        for entry in expected_chapters {
            if !valid_id(&entry.id)
                || !(1..=crate::chapters::MAX_SAFE_INTEGER).contains(&entry.revision)
                || !ids.insert(&entry.id)
            {
                return Err(ChapterError::Validation("invalid_snapshot").into());
            }
        }
        // A deferred read transaction pins book metadata, membership, order and
        // every body to one SQLite snapshot. No DB transaction spans Save As.
        let tx = c.transaction().map_err(ChapterError::Database)?;
        let book = books::load(&tx, book_id).map_err(|error| {
            ExportError::Chapter(match error {
                BookError::NotFound => ChapterError::NotFound,
                BookError::Database(error) => ChapterError::Database(error),
                _ => ChapterError::InvalidStoredData,
            })
        })?;
        if book.updated_at != expected_book_updated_at {
            return Err(ChapterError::Conflict.into());
        }
        let mut text = format!("{}\n\n", book.title);
        let mut chapters = Vec::new();
        for_each_chapter(&tx, book_id, |chapter| {
            let index = chapters.len();
            if expected_chapters.get(index).is_none_or(|entry| {
                entry.id != chapter.summary.id || entry.revision != chapter.summary.revision
            }) {
                return Err(ChapterError::Conflict);
            }
            let section = format!(
                "{}\n\n{}\n",
                chapter.summary.title,
                chapter.content.plain_text()
            );
            if index > 0 {
                push_bounded(&mut text, "\n\n", MAX_BOOK_EXPORT_BYTES)?;
            }
            push_bounded(&mut text, &section, MAX_BOOK_EXPORT_BYTES)?;
            chapters.push(ChapterOrderEntry {
                id: chapter.summary.id,
                revision: chapter.summary.revision,
            });
            Ok(())
        })
        .map_err(|error| match error {
            ChapterError::LimitReached => ExportError::TooLarge,
            other => ExportError::Chapter(other),
        })?;
        if chapters.len() != expected_chapters.len() {
            return Err(ChapterError::Conflict.into());
        }
        if chapters.is_empty() {
            return Err(ExportError::EmptyBook);
        }
        tx.commit().map_err(ChapterError::Database)?;
        Ok(Self {
            file_name: file_name(&book.title),
            book_updated_at: book.updated_at,
            chapters,
            text,
        })
    }

    pub fn write_new(&self, path: &Path) -> Result<BookExportResult, ExportError> {
        let file_name = write_new(&self.text, path)?;
        Ok(BookExportResult::Exported {
            file_name,
            book_updated_at: self.book_updated_at.clone(),
            chapters: self.chapters.clone(),
        })
    }
}

fn forbidden(character: char) -> bool {
    character.is_control() || "<>:\"/\\|?*".contains(character)
}
fn reserved(name: &str) -> bool {
    let stem = name
        .split('.')
        .next()
        .unwrap_or("")
        .trim_end_matches(' ')
        .to_ascii_uppercase();
    ["CON", "PRN", "AUX", "NUL"].contains(&stem.as_str())
        || ["COM", "LPT"].iter().any(|prefix| {
            stem.strip_prefix(prefix).is_some_and(|suffix| {
                suffix.len() == 1 && matches!(suffix.as_bytes()[0], b'1'..=b'9')
            })
        })
}
fn file_name(title: &str) -> String {
    let safe: String = title
        .chars()
        .take(80)
        .map(|character| if forbidden(character) { '_' } else { character })
        .collect();
    let stem = safe.trim_matches([' ', '.']);
    let stem = if stem.is_empty() { "chapter" } else { stem };
    format!("{}{stem}.txt", if reserved(stem) { "_" } else { "" })
}

#[cfg(test)]
mod book_tests;
#[cfg(test)]
mod portable_tests;
#[cfg(test)]
mod tests;
