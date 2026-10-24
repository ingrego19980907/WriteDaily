use rusqlite::{Connection, OptionalExtension, Row, TransactionBehavior, params};
use uuid::Uuid;

use super::{Book, BookDetails, BookError, validation::*};

const COLUMNS: &str = "id, title, target_word_count, daily_word_goal, deadline, cover_path, completed_at, created_at, updated_at";

pub struct BookRepository<'connection> {
    connection: &'connection mut Connection,
}

fn row_book(row: &Row<'_>) -> rusqlite::Result<Book> {
    Ok(Book {
        id: row.get(0)?,
        title: row.get(1)?,
        target_word_count: row.get(2)?,
        daily_word_goal: row.get(3)?,
        deadline: row.get(4)?,
        cover_path: row.get(5)?,
        completed_at: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

pub(crate) fn load(connection: &Connection, id: &str) -> Result<Book, BookError> {
    let book = connection
        .query_row(
            &format!("SELECT {COLUMNS} FROM books WHERE id = ?1"),
            [id],
            row_book,
        )
        .optional()?
        .ok_or(BookError::NotFound)?;
    validate_stored(book)
}

impl<'connection> BookRepository<'connection> {
    pub fn new(connection: &'connection mut Connection) -> Self {
        Self { connection }
    }

    pub fn list(&self) -> Result<Vec<Book>, BookError> {
        let mut statement = self.connection.prepare(&format!(
            "SELECT {COLUMNS} FROM books ORDER BY updated_at DESC, id ASC"
        ))?;
        statement
            .query_map([], row_book)?
            .map(|row| validate_stored(row?))
            .collect()
    }

    pub fn get(&self, id: &str) -> Result<Book, BookError> {
        validate_id(id)?;
        load(self.connection, id)
    }

    pub fn create(&mut self, details: BookDetails) -> Result<Book, BookError> {
        let details = normalize_details(details)?;
        let id = Uuid::new_v4().to_string();
        let now = timestamp(None)?;
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)?;
        transaction.execute(
            "INSERT INTO books (id, title, target_word_count, daily_word_goal, deadline, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)",
            params![id, details.title, details.target_word_count, details.daily_word_goal, details.deadline, now],
        )?;
        let book = load(&transaction, &id)?;
        transaction.commit()?;
        Ok(book)
    }

    /// The caller must pass the snapshot it edited; stale writes never overwrite newer data.
    pub fn update(
        &mut self,
        id: &str,
        expected_updated_at: &str,
        details: BookDetails,
    ) -> Result<Book, BookError> {
        validate_id(id)?;
        validate_expected(expected_updated_at)?;
        let details = normalize_details(details)?;
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)?;
        let current = load(&transaction, id)?;
        if current.updated_at != expected_updated_at {
            return Err(BookError::Conflict);
        }
        let now = timestamp(Some(&current.updated_at))?;
        let changed = transaction.execute(
            "UPDATE books SET title = ?1, target_word_count = ?2, daily_word_goal = ?3,
             deadline = ?4, updated_at = ?5 WHERE id = ?6 AND updated_at = ?7",
            params![
                details.title,
                details.target_word_count,
                details.daily_word_goal,
                details.deadline,
                now,
                id,
                expected_updated_at
            ],
        )?;
        if changed != 1 {
            return Err(BookError::Conflict);
        }
        let book = load(&transaction, id)?;
        transaction.commit()?;
        Ok(book)
    }

    /// Internal persistence operation. UI confirmation is a separate requirement (2.6).
    pub fn delete(&mut self, id: &str, expected_updated_at: &str) -> Result<(), BookError> {
        self.delete_inner(id, expected_updated_at, false)
    }

    pub(crate) fn delete_with_cleanup(
        &mut self,
        id: &str,
        expected_updated_at: &str,
    ) -> Result<(), BookError> {
        self.delete_inner(id, expected_updated_at, true)
    }

    fn delete_inner(
        &mut self,
        id: &str,
        expected_updated_at: &str,
        managed_cleanup: bool,
    ) -> Result<(), BookError> {
        validate_id(id)?;
        validate_expected(expected_updated_at)?;
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)?;
        let book = load(&transaction, id)?;
        if book.updated_at != expected_updated_at {
            return Err(BookError::Conflict);
        }
        if book.cover_path.is_some() && !managed_cleanup {
            return Err(BookError::CoverCleanupRequired);
        }
        if let Some(path) = book.cover_path {
            transaction.execute(
                "INSERT OR IGNORE INTO pending_cover_cleanup(path) VALUES (?1)",
                [path],
            )?;
        }
        let changed = transaction.execute(
            "DELETE FROM books WHERE id = ?1 AND updated_at = ?2",
            params![id, expected_updated_at],
        )?;
        if changed != 1 {
            return Err(BookError::Conflict);
        }
        transaction.commit()?;
        Ok(())
    }
}
