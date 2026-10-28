use super::{
    ActivityError,
    statistics::{date, read_daily_statistics},
    streak::state,
};
use crate::books::{BookError, validation::valid_id};
use chrono::Duration;
use rusqlite::{Connection, params};
use serde::Serialize;

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LongestStreak {
    pub today: String,
    pub book_id: Option<String>,
    pub days: i64,
    /// Exact within the recorded interval, never a claim about unrecorded life history.
    pub exact: bool,
    pub history_start_date: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

pub fn get_longest_streak(
    connection: &mut Connection,
    today: &str,
    book_id: Option<&str>,
) -> Result<LongestStreak, ActivityError> {
    let current = date(today).ok_or(ActivityError::Validation)?;
    if book_id.is_some_and(|id| !valid_id(id)) {
        return Err(ActivityError::Validation);
    }
    let tx = connection.transaction()?;
    if let Some(id) = book_id {
        crate::books::load(&tx, id).map_err(|error| match error {
            BookError::NotFound => ActivityError::NotFound,
            BookError::Database(error) => ActivityError::Database(error),
            _ => ActivityError::InvalidStoredData,
        })?;
    }
    let first: Option<String> = tx.query_row("SELECT min(local_date) FROM writing_activity WHERE local_date<=?1 AND (?2 IS NULL OR book_id=?2)", params![today,book_id], |row| row.get(0))?;
    let mut result = LongestStreak {
        today: today.into(),
        book_id: book_id.map(str::to_owned),
        days: 0,
        exact: true,
        history_start_date: first.clone(),
        start_date: None,
        end_date: None,
    };
    if let Some(first) = first {
        let mut start = date(&first).ok_or(ActivityError::InvalidStoredData)?;
        let mut run = 0;
        let mut run_start = None;
        loop {
            let end = start
                .checked_add_signed(Duration::days(365))
                .unwrap_or(current)
                .min(current);
            let range = read_daily_statistics(
                &tx,
                &start.format("%Y-%m-%d").to_string(),
                &end.format("%Y-%m-%d").to_string(),
                book_id,
            )?;
            for day in range.days {
                match state(&day, book_id.is_some()) {
                    "reached" => {
                        run += 1;
                        if run_start.is_none() {
                            run_start = Some(day.date.clone());
                        }
                        // Strict improvement keeps the earliest tied record.
                        if run > result.days {
                            result.days = run;
                            result.start_date = run_start.clone();
                            result.end_date = Some(day.date);
                        }
                    }
                    "unscheduled" => {}
                    _ if day.date == today => {} // Open day cannot add a completed day.
                    status => {
                        if status == "unknown" {
                            result.exact = false;
                        }
                        run = 0;
                        run_start = None;
                    }
                }
            }
            if end == current {
                break;
            }
            start = end.succ_opt().ok_or(ActivityError::InvalidStoredData)?;
        }
    }
    tx.commit()?;
    Ok(result)
}
