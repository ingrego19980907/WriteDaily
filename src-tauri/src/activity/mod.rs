mod statistics;
mod streak;
pub use statistics::{DailyStatisticsRange, get_daily_statistics};
pub use streak::{CurrentStreak, get_current_streak};

#[derive(Debug, thiserror::Error)]
pub enum ActivityError {
    #[error("Invalid statistics range or scope")]
    Validation,
    #[error("Book is no longer available")]
    NotFound,
    #[error("Stored activity is invalid")]
    InvalidStoredData,
    #[error("Statistics exceed the supported numeric range")]
    LimitReached,
    #[error("Could not read activity: {0}")]
    Database(#[from] rusqlite::Error),
}

#[cfg(test)]
mod tests;
