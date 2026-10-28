use super::ActivityError;
use crate::books::{
    BookError,
    validation::{parse_timestamp, valid_id},
};
use crate::chapters::MAX_SAFE_INTEGER;
use chrono::{Datelike, Duration, NaiveDate};
use rusqlite::{Connection, params};
use serde::Serialize;
use std::collections::BTreeMap;

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct BookDailyGoal {
    pub source_book_id: String,
    pub book_id: Option<String>,
    pub daily_word_goal: Option<i64>,
    pub scheduled: bool,
    pub credited_words: i64,
    pub state: &'static str,
    pub remaining_words: Option<i64>,
}
#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DailyStatistics {
    pub date: String,
    pub added_words: i64,
    pub deleted_words: i64,
    pub credited_words: i64,
    pub save_count: i64,
    pub active: bool,
    pub book_goals: Vec<BookDailyGoal>,
}
#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DailyStatisticsRange {
    pub start_date: String,
    pub end_date: String,
    pub book_id: Option<String>,
    pub days: Vec<DailyStatistics>,
}
#[derive(Default)]
struct Day {
    added: i64,
    deleted: i64,
    credited: i64,
    last_operation: Option<String>,
    save_count: i64,
    goals: BTreeMap<String, BookDailyGoal>,
}
pub(super) fn date(value: &str) -> Option<NaiveDate> {
    let parsed = NaiveDate::parse_from_str(value, "%Y-%m-%d").ok()?;
    ((1..=9999).contains(&parsed.year()) && parsed.format("%Y-%m-%d").to_string() == value)
        .then_some(parsed)
}
fn count(value: i64) -> bool {
    (0..=MAX_SAFE_INTEGER).contains(&value)
}
fn goal(value: Option<i64>) -> bool {
    value.is_none_or(|value| (1..=MAX_SAFE_INTEGER).contains(&value))
}
fn add(total: &mut i64, value: i64) -> Result<(), ActivityError> {
    *total = total
        .checked_add(value)
        .filter(|value| count(*value))
        .ok_or(ActivityError::LimitReached)?;
    Ok(())
}

/** Read one committed snapshot. Local dates are stored labels, never rebucketed UTC instants. */
pub fn get_daily_statistics(
    connection: &mut Connection,
    start_date: &str,
    end_date: &str,
    book_id: Option<&str>,
) -> Result<DailyStatisticsRange, ActivityError> {
    let transaction = connection.transaction()?;
    let result = read_daily_statistics(&transaction, start_date, end_date, book_id)?;
    transaction.commit()?;
    Ok(result)
}

pub(super) fn read_daily_statistics(
    connection: &Connection,
    start_date: &str,
    end_date: &str,
    book_id: Option<&str>,
) -> Result<DailyStatisticsRange, ActivityError> {
    let start = date(start_date).ok_or(ActivityError::Validation)?;
    let end = date(end_date).ok_or(ActivityError::Validation)?;
    let distance = (end - start).num_days();
    if !(0..366).contains(&distance) || book_id.is_some_and(|id| !valid_id(id)) {
        return Err(ActivityError::Validation);
    }
    if let Some(id) = book_id {
        crate::books::load(connection, id).map_err(|error| match error {
            BookError::NotFound => ActivityError::NotFound,
            BookError::Database(error) => ActivityError::Database(error),
            _ => ActivityError::InvalidStoredData,
        })?;
    }
    let mut days = BTreeMap::<String, Day>::new();
    // No SQL SUM: native checked addition fails visibly instead of overflowing or rounding.
    let mut statement = connection.prepare("SELECT w.operation_id,w.segment_index,w.book_id,w.chapter_id,w.local_date,w.before_words,w.after_words,w.added_words,w.deleted_words,w.credited_words,o.policy_version,o.origin,o.source_book_id,o.source_chapter_id,o.expected_revision,o.committed_revision,o.committed_at,o.payload_digest,w.time_zone,w.utc_offset_minutes,w.first_edited_at,w.last_edited_at,w.daily_word_goal,w.scheduled,p.source_book_id,p.book_id,p.daily_word_goal,p.scheduled,p.policy_version FROM writing_activity w LEFT JOIN activity_operations o ON o.operation_id=w.operation_id LEFT JOIN activity_day_plans p ON p.source_book_id=o.source_book_id AND p.local_date=w.local_date WHERE w.local_date>=?1 AND w.local_date<=?2 AND (?3 IS NULL OR w.book_id=?3) ORDER BY w.local_date,w.operation_id,w.segment_index")?;
    let mut rows = statement.query(params![start_date, end_date, book_id])?;
    while let Some(row) = rows.next()? {
        let operation: String = row.get(0)?;
        let index: i64 = row.get(1)?;
        let live_book: Option<String> = row.get(2)?;
        let live_chapter: Option<String> = row.get(3)?;
        let local_date: String = row.get(4)?;
        let before: i64 = row.get(5)?;
        let after: i64 = row.get(6)?;
        let added: i64 = row.get(7)?;
        let deleted: i64 = row.get(8)?;
        let credited: i64 = row.get(9)?;
        let policy: Option<i64> = row.get(10)?;
        let origin: Option<String> = row.get(11)?;
        let source_book: Option<String> = row.get(12)?;
        let source_chapter: Option<String> = row.get(13)?;
        let expected: Option<i64> = row.get(14)?;
        let committed: Option<i64> = row.get(15)?;
        let committed_at: Option<String> = row.get(16)?;
        let digest: Option<String> = row.get(17)?;
        let zone: Option<String> = row.get(18)?;
        let offset: i64 = row.get(19)?;
        let first: String = row.get(20)?;
        let last: String = row.get(21)?;
        let observed_goal: Option<i64> = row.get(22)?;
        let observed_scheduled: i64 = row.get(23)?;
        let source_book = source_book
            .filter(|id| valid_id(id))
            .ok_or(ActivityError::InvalidStoredData)?;
        let source_chapter = source_chapter
            .filter(|id| valid_id(id))
            .ok_or(ActivityError::InvalidStoredData)?;
        let origin = origin
            .filter(|value| ["editor", "import", "restore"].contains(&value.as_str()))
            .ok_or(ActivityError::InvalidStoredData)?;
        let civil_date = date(&local_date).ok_or(ActivityError::InvalidStoredData)?;
        if !valid_id(&operation)
            || !(0..128).contains(&index)
            || policy != Some(1)
            || live_book.as_ref().is_some_and(|id| id != &source_book)
            || live_chapter
                .as_ref()
                .is_some_and(|id| id != &source_chapter)
            || !count(before)
            || !count(after)
            || added != (after - before).max(0)
            || deleted != (before - after).max(0)
            || credited != if origin == "editor" { added } else { 0 }
            || !expected.is_some_and(|value| (1..MAX_SAFE_INTEGER).contains(&value))
            || committed != expected.and_then(|value| value.checked_add(1))
            || !committed_at
                .as_deref()
                .is_some_and(|value| parse_timestamp(value).is_some())
            || !digest.as_ref().is_some_and(|value| {
                value.len() == 64
                    && value
                        .bytes()
                        .all(|c| c.is_ascii_digit() || (b'a'..=b'f').contains(&c))
            })
            || !(-840..=840).contains(&offset)
            || !goal(observed_goal)
            || ![0, 1].contains(&observed_scheduled)
            || zone.as_ref().is_some_and(|zone| {
                zone.is_empty()
                    || zone.len() > 128
                    || !zone
                        .bytes()
                        .all(|c| c.is_ascii_alphanumeric() || b"/_+-".contains(&c))
            })
        {
            return Err(ActivityError::InvalidStoredData);
        }
        for instant in [&first, &last] {
            let local = parse_timestamp(instant)
                .and_then(|utc| utc.checked_add_signed(Duration::minutes(offset)))
                .ok_or(ActivityError::InvalidStoredData)?;
            if local.date_naive() != civil_date {
                return Err(ActivityError::InvalidStoredData);
            }
        }
        if origin != "editor" {
            continue;
        }
        let plan_source: Option<String> = row.get(24)?;
        let plan_book: Option<String> = row.get(25)?;
        let target: Option<i64> = row.get(26)?;
        let scheduled: Option<i64> = row.get(27)?;
        let plan_policy: Option<i64> = row.get(28)?;
        if plan_source.as_deref() != Some(&source_book)
            || plan_book != live_book
            || !goal(target)
            || !scheduled.is_some_and(|value| [0, 1].contains(&value))
            || plan_policy != Some(1)
        {
            return Err(ActivityError::InvalidStoredData);
        }
        let day = days.entry(local_date).or_default();
        add(&mut day.added, added)?;
        add(&mut day.deleted, deleted)?;
        add(&mut day.credited, credited)?;
        // ORDER BY date, operation, segment keeps each day's operation contiguous.
        if day.last_operation.as_deref() != Some(operation.as_str()) {
            add(&mut day.save_count, 1)?;
            day.last_operation = Some(operation);
        }
        let book_goal = day
            .goals
            .entry(source_book.clone())
            .or_insert_with(|| BookDailyGoal {
                source_book_id: source_book,
                book_id: live_book,
                daily_word_goal: target,
                scheduled: scheduled == Some(1),
                credited_words: 0,
                state: "unconfigured",
                remaining_words: None,
            });
        add(&mut book_goal.credited_words, credited)?;
    }
    drop(rows);
    drop(statement);
    let mut result = Vec::with_capacity((distance + 1) as usize);
    for offset in 0..=distance {
        let date = (start + Duration::days(offset))
            .format("%Y-%m-%d")
            .to_string();
        let day = days.remove(&date).unwrap_or_default();
        let mut goals: Vec<_> = day.goals.into_values().collect();
        for goal in &mut goals {
            if !goal.scheduled {
                goal.state = "unscheduled";
            } else if let Some(target) = goal.daily_word_goal {
                goal.remaining_words = Some((target - goal.credited_words).max(0));
                goal.state = if goal.credited_words >= target {
                    "reached"
                } else {
                    "pending"
                };
            }
        }
        result.push(DailyStatistics {
            date,
            added_words: day.added,
            deleted_words: day.deleted,
            credited_words: day.credited,
            save_count: day.save_count,
            active: day.credited > 0,
            book_goals: goals,
        });
    }
    Ok(DailyStatisticsRange {
        start_date: start_date.into(),
        end_date: end_date.into(),
        book_id: book_id.map(str::to_owned),
        days: result,
    })
}
