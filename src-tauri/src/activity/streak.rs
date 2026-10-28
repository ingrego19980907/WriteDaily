use super::{
    ActivityError,
    statistics::{DailyStatistics, date, read_daily_statistics},
};
use crate::books::{BookError, validation::valid_id};
use chrono::{Duration, NaiveDate};
use rusqlite::Connection;
use serde::Serialize;

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CurrentStreak {
    pub today: String,
    pub book_id: Option<String>,
    pub days: i64,
    pub exact: bool,
    pub today_state: &'static str,
    pub today_credited_words: i64,
    pub start_date: Option<String>,
    pub last_completed_date: Option<String>,
    pub boundary: &'static str,
}

pub(super) fn state(day: &DailyStatistics, scoped: bool) -> &'static str {
    // Global completion means at least one scheduled book goal, not all book goals.
    if day.book_goals.iter().any(|goal| goal.state == "reached") {
        return "reached";
    }
    if day.book_goals.iter().any(|goal| goal.state == "pending") {
        return "pending";
    }
    if day.writing_day == Some(false) {
        return "unscheduled";
    }
    // Observed rest in one book cannot prove a rest day across every other book.
    if scoped && !day.book_goals.is_empty() && day.book_goals.iter().all(|goal| !goal.scheduled) {
        return "unscheduled";
    }
    "unknown"
}

/** Derive a suffix across paged history inside one read snapshot; never cap at a month/year. */
pub fn get_current_streak(
    connection: &mut Connection,
    today: &str,
    book_id: Option<&str>,
) -> Result<CurrentStreak, ActivityError> {
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
    let first = crate::schedule::first_history(&tx, today, book_id)?;
    let mut result = CurrentStreak {
        today: today.into(),
        book_id: book_id.map(str::to_owned),
        days: 0,
        exact: true,
        today_state: "unknown",
        today_credited_words: 0,
        start_date: None,
        last_completed_date: None,
        boundary: "empty_history",
    };
    let Some(first) = first else {
        tx.commit()?;
        return Ok(result);
    };
    let first = date(&first).ok_or(ActivityError::InvalidStoredData)?;
    let supported_start =
        NaiveDate::from_ymd_opt(1, 1, 1).ok_or(ActivityError::InvalidStoredData)?;
    let mut end = current;
    'history: loop {
        let start = end
            .checked_sub_signed(Duration::days(365))
            .unwrap_or(supported_start)
            .max(first)
            .max(supported_start);
        let range = read_daily_statistics(
            &tx,
            &start.format("%Y-%m-%d").to_string(),
            &end.format("%Y-%m-%d").to_string(),
            book_id,
        )?;
        for day in range.days.iter().rev() {
            let state = state(day, book_id.is_some());
            let is_today = day.date == today;
            if is_today {
                result.today_state = state;
                result.today_credited_words = day.credited_words;
            }
            if state == "reached" {
                result.days += 1;
                result.start_date = Some(day.date.clone());
                if result.last_completed_date.is_none() {
                    result.last_completed_date = Some(day.date.clone());
                }
            } else if is_today || state == "unscheduled" {
                // Today's incomplete/unknown plan has until local midnight; rest is neutral.
                continue;
            } else if state == "pending" {
                result.boundary = "missed_day";
                break 'history;
            } else {
                result.boundary = "unknown_day";
                result.exact = false;
                break 'history;
            }
        }
        if start == supported_start {
            result.boundary = "date_start";
            break;
        }
        if start == first {
            result.boundary = "history_start";
            result.exact = false;
            break;
        }
        end = start.pred_opt().ok_or(ActivityError::InvalidStoredData)?;
    }
    tx.commit()?;
    Ok(result)
}
