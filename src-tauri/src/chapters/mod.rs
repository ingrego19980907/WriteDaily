mod activity;
mod content;
mod repository;
mod word_count;
pub use content::ChapterContent;
pub use repository::ChapterRepository;
use serde::{Deserialize, Serialize};

pub const MAX_SAFE_INTEGER: i64 = 9_007_199_254_740_991;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ChapterDetails {
    pub title: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChapterSummary {
    pub id: String,
    pub book_id: String,
    pub title: String,
    pub position: i64,
    pub word_count: Option<i64>,
    pub revision: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Chapter {
    #[serde(flatten)]
    pub summary: ChapterSummary,
    pub content: ChapterContent,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ChapterOrderEntry {
    pub id: String,
    pub revision: i64,
}

#[derive(Debug, thiserror::Error)]
pub enum ChapterError {
    #[error("Invalid chapter input: {0}")]
    Validation(&'static str),
    #[error("Chapter or parent book not found")]
    NotFound,
    #[error("Chapter snapshot changed; reload before retrying")]
    Conflict,
    #[error("Stored chapter data is invalid; no repair attempted")]
    InvalidStoredData,
    #[error("Chapter revision/position/timestamp limit reached")]
    LimitReached,
    #[error("Chapter persistence failed: {0}")]
    Database(#[from] rusqlite::Error),
}

#[cfg(test)]
mod activity_tests;
#[cfg(test)]
mod tests;
#[cfg(test)]
mod word_count_tests;
