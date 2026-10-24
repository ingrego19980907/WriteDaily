mod repository;
mod validation;

pub use repository::BookRepository;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BookDetails {
    pub title: String,
    pub target_word_count: Option<i64>,
    pub daily_word_goal: Option<i64>,
    pub deadline: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Book {
    pub id: String,
    pub title: String,
    pub target_word_count: Option<i64>,
    pub daily_word_goal: Option<i64>,
    pub deadline: Option<String>,
    pub cover_path: Option<String>,
    pub completed_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct ValidationIssue {
    pub field: &'static str,
    pub code: &'static str,
}

#[derive(Debug, thiserror::Error)]
pub enum BookError {
    #[error("Invalid book metadata: {0:?}")]
    Validation(Vec<ValidationIssue>),
    #[error("Book not found")]
    NotFound,
    #[error("The book changed since it was loaded; reload before retrying")]
    Conflict,
    #[error("Stored book data violates the domain contract: {0}")]
    InvalidStoredData(&'static str),
    #[error("Book has a cover; managed file cleanup must be implemented before deletion")]
    CoverCleanupRequired,
    #[error("The system/stored clock is outside the supported timestamp range")]
    ClockOutOfRange,
    #[error("Book persistence failed: {0}")]
    Database(#[from] rusqlite::Error),
}

#[cfg(test)]
mod tests;
