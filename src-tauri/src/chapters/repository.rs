use super::{
    Chapter, ChapterContent, ChapterDetails, ChapterError, ChapterOrderEntry, ChapterSummary,
    MAX_SAFE_INTEGER,
};
use crate::books::{
    self, BookError,
    validation::{parse_timestamp, timestamp, valid_id},
};
use rusqlite::{Connection, OptionalExtension, Row, TransactionBehavior, params};
use std::collections::HashSet;
use unicode_normalization::UnicodeNormalization;
use uuid::Uuid;

const COLUMNS: &str = "id, book_id, title, position, word_count, revision, created_at, updated_at, content_schema_version, CASE WHEN length(CAST(content_json AS BLOB)) <= 5242880 THEN content_json ELSE NULL END";

pub struct ChapterRepository<'connection> {
    connection: &'connection mut Connection,
}

fn id(value: &str) -> Result<(), ChapterError> {
    if valid_id(value) {
        Ok(())
    } else {
        Err(ChapterError::Validation("invalid_id"))
    }
}
fn revision(value: i64) -> Result<(), ChapterError> {
    if (1..=MAX_SAFE_INTEGER).contains(&value) {
        Ok(())
    } else {
        Err(ChapterError::Validation("invalid_revision"))
    }
}
fn title(details: ChapterDetails) -> Result<String, ChapterError> {
    let edge = |c: char| matches!(c, '\u{0009}'..='\u{000d}' | '\u{0020}' | '\u{00a0}' | '\u{1680}' | '\u{2000}'..='\u{200a}' | '\u{2028}' | '\u{2029}' | '\u{202f}' | '\u{205f}' | '\u{3000}' | '\u{feff}');
    let title: String = details.title.trim_matches(edge).nfc().collect();
    let code = if title.is_empty() {
        Some("required")
    } else if title.chars().any(char::is_control) {
        Some("invalid_title")
    } else if title.chars().count() > 200 {
        Some("too_long")
    } else {
        None
    };
    code.map_or(Ok(title), |code| Err(ChapterError::Validation(code)))
}
fn parent(connection: &Connection, book_id: &str) -> Result<(), ChapterError> {
    id(book_id)?;
    books::load(connection, book_id)
        .map(|_| ())
        .map_err(|error| match error {
            BookError::NotFound => ChapterError::NotFound,
            BookError::Database(error) => ChapterError::Database(error),
            _ => ChapterError::InvalidStoredData,
        })
}
fn now(after: Option<&str>) -> Result<String, ChapterError> {
    timestamp(after).map_err(|_| ChapterError::LimitReached)
}
fn decode(row: &Row<'_>) -> rusqlite::Result<(ChapterSummary, i64, Option<String>)> {
    Ok((
        ChapterSummary {
            id: row.get(0)?,
            book_id: row.get(1)?,
            title: row.get(2)?,
            position: row.get(3)?,
            word_count: row.get(4)?,
            revision: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        },
        row.get(8)?,
        row.get(9)?,
    ))
}
fn checked(raw: (ChapterSummary, i64, Option<String>)) -> Result<Chapter, ChapterError> {
    let (summary, version, json) = raw;
    let invalid = || ChapterError::InvalidStoredData;
    if !valid_id(&summary.id)
        || !valid_id(&summary.book_id)
        || !(0..=MAX_SAFE_INTEGER).contains(&summary.position)
        || !(1..=MAX_SAFE_INTEGER).contains(&summary.revision)
        || summary
            .word_count
            .is_some_and(|value| !(0..=MAX_SAFE_INTEGER).contains(&value))
        || title(ChapterDetails {
            title: summary.title.clone(),
        })
        .map_err(|_| invalid())?
            != summary.title
    {
        return Err(invalid());
    }
    let created = parse_timestamp(&summary.created_at).ok_or_else(invalid)?;
    let updated = parse_timestamp(&summary.updated_at).ok_or_else(invalid)?;
    if updated < created {
        return Err(invalid());
    }
    let content = ChapterContent::stored(version, &json.ok_or_else(invalid)?)?;
    Ok(Chapter { summary, content })
}
fn load(connection: &Connection, book_id: &str, chapter_id: &str) -> Result<Chapter, ChapterError> {
    let raw = connection
        .query_row(
            &format!("SELECT {COLUMNS} FROM chapters WHERE book_id = ?1 AND id = ?2"),
            params![book_id, chapter_id],
            decode,
        )
        .optional()?
        .ok_or(ChapterError::NotFound)?;
    checked(raw)
}
fn list(connection: &Connection, book_id: &str) -> Result<Vec<ChapterSummary>, ChapterError> {
    parent(connection, book_id)?;
    let mut statement = connection.prepare(&format!(
        "SELECT {COLUMNS} FROM chapters WHERE book_id = ?1 ORDER BY position"
    ))?;
    let mut result = Vec::new();
    for row in statement.query_map([book_id], decode)? {
        let chapter = checked(row?)?;
        if chapter.summary.position != result.len() as i64 {
            return Err(ChapterError::InvalidStoredData);
        }
        result.push(chapter.summary);
    }
    Ok(result)
}
fn expected(current: &ChapterSummary, token: i64) -> Result<(), ChapterError> {
    if current.revision == token {
        Ok(())
    } else {
        Err(ChapterError::Conflict)
    }
}
fn next(current: &ChapterSummary) -> Result<(i64, String), ChapterError> {
    if current.revision >= MAX_SAFE_INTEGER {
        return Err(ChapterError::LimitReached);
    }
    Ok((current.revision + 1, now(Some(&current.updated_at))?))
}

/// Caller owns an IMMEDIATE transaction. Stage changed rows above the existing
/// range before assigning final positions to satisfy the immediate UNIQUE index.
fn positions(
    connection: &Connection,
    ordered: &[&ChapterSummary],
    original_len: usize,
) -> Result<(), ChapterError> {
    let base = i64::try_from(original_len).map_err(|_| ChapterError::LimitReached)?;
    if base
        .checked_mul(2)
        .is_none_or(|limit| limit > MAX_SAFE_INTEGER)
    {
        return Err(ChapterError::LimitReached);
    }
    let mut changes = Vec::new();
    for (position, chapter) in ordered.iter().enumerate() {
        if chapter.position != position as i64 {
            let (revision, updated) = next(chapter)?;
            changes.push((*chapter, position as i64, revision, updated));
        }
    }
    for (chapter, _, _, _) in &changes {
        connection.execute(
            "UPDATE chapters SET position = ?1 WHERE id = ?2 AND book_id = ?3",
            params![base + chapter.position, chapter.id, chapter.book_id],
        )?;
    }
    for (chapter, position, revision, updated) in changes {
        let changed = connection.execute("UPDATE chapters SET position = ?1, revision = ?2, updated_at = ?3 WHERE id = ?4 AND book_id = ?5 AND revision = ?6", params![position, revision, updated, chapter.id, chapter.book_id, chapter.revision])?;
        if changed != 1 {
            return Err(ChapterError::Conflict);
        }
    }
    Ok(())
}

impl<'connection> ChapterRepository<'connection> {
    pub fn new(connection: &'connection mut Connection) -> Self {
        Self { connection }
    }

    pub fn list(&mut self, book_id: &str) -> Result<Vec<ChapterSummary>, ChapterError> {
        let tx = self.connection.transaction()?;
        let result = list(&tx, book_id)?;
        tx.commit()?;
        Ok(result)
    }

    pub fn get(&mut self, book_id: &str, chapter_id: &str) -> Result<Chapter, ChapterError> {
        id(chapter_id)?;
        let tx = self.connection.transaction()?;
        list(&tx, book_id)?;
        let chapter = load(&tx, book_id, chapter_id)?;
        tx.commit()?;
        Ok(chapter)
    }

    pub fn create(
        &mut self,
        book_id: &str,
        details: ChapterDetails,
    ) -> Result<Chapter, ChapterError> {
        let title = title(details)?;
        let tx = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)?;
        let ordered = list(&tx, book_id)?;
        let position = i64::try_from(ordered.len()).map_err(|_| ChapterError::LimitReached)?;
        if position > MAX_SAFE_INTEGER {
            return Err(ChapterError::LimitReached);
        }
        let chapter_id = Uuid::new_v4().to_string();
        let time = now(None)?;
        let (version, document) = ChapterContent::empty().storage()?;
        tx.execute("INSERT INTO chapters (id, book_id, title, position, content_schema_version, content_json, word_count, revision, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, 1, ?7, ?7)", params![chapter_id, book_id, title, position, version, document, time])?;
        let chapter = load(&tx, book_id, &chapter_id)?;
        tx.commit()?;
        Ok(chapter)
    }

    pub fn rename(
        &mut self,
        book_id: &str,
        chapter_id: &str,
        expected_revision: i64,
        details: ChapterDetails,
    ) -> Result<Chapter, ChapterError> {
        let title = title(details)?;
        self.update(book_id, chapter_id, expected_revision, Some(title), None)
    }

    /// Raw bounded JSON envelope, not a client snapshot or caller-supplied word count.
    pub fn save_content(
        &mut self,
        book_id: &str,
        chapter_id: &str,
        expected_revision: i64,
        raw: &str,
    ) -> Result<Chapter, ChapterError> {
        let content = ChapterContent::parse(raw)?;
        self.update(book_id, chapter_id, expected_revision, None, Some(content))
    }

    fn update(
        &mut self,
        book_id: &str,
        chapter_id: &str,
        expected_revision: i64,
        title: Option<String>,
        content: Option<ChapterContent>,
    ) -> Result<Chapter, ChapterError> {
        id(chapter_id)?;
        revision(expected_revision)?;
        let tx = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)?;
        list(&tx, book_id)?;
        let current = load(&tx, book_id, chapter_id)?;
        expected(&current.summary, expected_revision)?;
        let (next_revision, time) = next(&current.summary)?;
        let changed = if let Some(content) = content {
            let (version, document) = content.storage()?;
            tx.execute("UPDATE chapters SET content_schema_version = ?1, content_json = ?2, word_count = NULL, revision = ?3, updated_at = ?4 WHERE book_id = ?5 AND id = ?6 AND revision = ?7", params![version, document, next_revision, time, book_id, chapter_id, expected_revision])?
        } else {
            tx.execute("UPDATE chapters SET title = ?1, revision = ?2, updated_at = ?3 WHERE book_id = ?4 AND id = ?5 AND revision = ?6", params![title.ok_or(ChapterError::Validation("required"))?, next_revision, time, book_id, chapter_id, expected_revision])?
        };
        if changed != 1 {
            return Err(ChapterError::Conflict);
        }
        let chapter = load(&tx, book_id, chapter_id)?;
        tx.commit()?;
        Ok(chapter)
    }

    /// UI confirmation is enforced by the command boundary; no real-user UI is wired yet.
    pub fn delete(
        &mut self,
        book_id: &str,
        chapter_id: &str,
        expected_revision: i64,
    ) -> Result<Vec<ChapterSummary>, ChapterError> {
        id(chapter_id)?;
        revision(expected_revision)?;
        let tx = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)?;
        let ordered = list(&tx, book_id)?;
        let current = ordered
            .iter()
            .find(|chapter| chapter.id == chapter_id)
            .ok_or(ChapterError::NotFound)?;
        expected(current, expected_revision)?;
        let changed = tx.execute(
            "DELETE FROM chapters WHERE book_id = ?1 AND id = ?2 AND revision = ?3",
            params![book_id, chapter_id, expected_revision],
        )?;
        if changed != 1 {
            return Err(ChapterError::Conflict);
        }
        let remaining: Vec<_> = ordered
            .iter()
            .filter(|chapter| chapter.id != chapter_id)
            .collect();
        positions(&tx, &remaining, ordered.len())?;
        let result = list(&tx, book_id)?;
        tx.commit()?;
        Ok(result)
    }

    pub fn reorder(
        &mut self,
        book_id: &str,
        expected_order: &[ChapterOrderEntry],
        chapter_ids: &[String],
    ) -> Result<Vec<ChapterSummary>, ChapterError> {
        for entry in expected_order {
            id(&entry.id)?;
            revision(entry.revision)?;
        }
        for chapter_id in chapter_ids {
            id(chapter_id)?;
        }
        let tx = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)?;
        let current = list(&tx, book_id)?;
        if current.len() != expected_order.len()
            || !current
                .iter()
                .zip(expected_order)
                .all(|(a, b)| a.id == b.id && a.revision == b.revision)
        {
            return Err(ChapterError::Conflict);
        }
        let unique: HashSet<_> = chapter_ids.iter().collect();
        if chapter_ids.len() != current.len()
            || unique.len() != current.len()
            || current.iter().any(|chapter| !unique.contains(&chapter.id))
        {
            return Err(ChapterError::Validation("invalid_order"));
        }
        let by_id: std::collections::HashMap<_, _> = current
            .iter()
            .map(|chapter| (&chapter.id, chapter))
            .collect();
        let ordered: Vec<_> = chapter_ids
            .iter()
            .map(|chapter_id| by_id[chapter_id])
            .collect();
        positions(&tx, &ordered, current.len())?;
        let result = list(&tx, book_id)?;
        tx.commit()?;
        Ok(result)
    }
}
