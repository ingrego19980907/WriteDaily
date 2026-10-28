use crate::activity::{ActivityError, statistics::date};
use crate::books::validation::valid_id;
use crate::chapters::MAX_SAFE_INTEGER;
use chrono::{Datelike, Local};
use rusqlite::{Connection, OptionalExtension, TransactionBehavior, params};
use serde::Serialize;

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ScheduleEntry {
    pub effective_from: String,
    pub weekdays: Vec<u8>,
}
#[derive(Debug, Serialize, PartialEq, Eq)]
pub struct WritingSchedule {
    pub revision: i64,
    pub history: Vec<ScheduleEntry>,
}

#[derive(Debug, thiserror::Error)]
pub enum ScheduleError {
    #[error("Invalid schedule")]
    Validation,
    #[error("Schedule changed; reload before saving")]
    Conflict,
    #[error("Invalid stored schedule")]
    InvalidStoredData,
    #[error("Schedule persistence failed: {0}")]
    Database(#[from] rusqlite::Error),
}
pub fn local_today() -> Result<String, ScheduleError> {
    let today = Local::now().date_naive().format("%Y-%m-%d").to_string();
    date(&today).ok_or(ScheduleError::Validation)?;
    Ok(today)
}
pub fn read(c: &Connection) -> Result<WritingSchedule, ScheduleError> {
    let revision: i64 = c.query_row(
        "SELECT revision FROM writing_schedule_state WHERE id=1",
        [],
        |r| r.get(0),
    )?;
    if !(0..=MAX_SAFE_INTEGER).contains(&revision) {
        return Err(ScheduleError::InvalidStoredData);
    }
    let mut stmt = c.prepare(
        "SELECT effective_from,weekdays_mask FROM writing_schedule_history ORDER BY effective_from",
    )?;
    let mut history = Vec::new();
    for row in stmt.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?)))? {
        let (effective_from, mask) = row?;
        if date(&effective_from).is_none() || !(0..=127).contains(&mask) {
            return Err(ScheduleError::InvalidStoredData);
        }
        history.push(ScheduleEntry {
            effective_from,
            weekdays: (0..7).filter(|day| mask & (1 << day) != 0).collect(),
        });
    }
    if (revision == 0) != history.is_empty() {
        return Err(ScheduleError::InvalidStoredData);
    }
    Ok(WritingSchedule { revision, history })
}
pub fn save(
    c: &mut Connection,
    expected: i64,
    weekdays: &[u8],
    today: &str,
) -> Result<WritingSchedule, ScheduleError> {
    // Production rejects stale local dates (e.g. a settings form left open across midnight).
    if today != local_today()? {
        return Err(ScheduleError::Validation);
    }
    save_on(c, expected, weekdays, today)
}
fn save_on(
    c: &mut Connection,
    expected: i64,
    weekdays: &[u8],
    today: &str,
) -> Result<WritingSchedule, ScheduleError> {
    let day = date(today).ok_or(ScheduleError::Validation)?;
    let next = day
        .succ_opt()
        .filter(|d| d.year() <= 9999)
        .ok_or(ScheduleError::Validation)?
        .format("%Y-%m-%d")
        .to_string();
    let mut mask = 0i64;
    if weekdays.len() > 7 {
        return Err(ScheduleError::Validation);
    }
    for day in weekdays {
        if *day > 6 || mask & (1 << day) != 0 {
            return Err(ScheduleError::Validation);
        }
        mask |= 1 << day;
    }
    let tx = c.transaction_with_behavior(TransactionBehavior::Immediate)?;
    let current = read(&tx)?;
    if expected != current.revision {
        return Err(ScheduleError::Conflict);
    }
    if current.revision == MAX_SAFE_INTEGER
        || current
            .history
            .last()
            .is_some_and(|h| h.effective_from > next)
    {
        return Err(ScheduleError::Validation);
    }
    if current.history.is_empty() {
        tx.execute(
            "INSERT INTO writing_schedule_history VALUES (?1,127)",
            [today],
        )?;
        tx.execute(
            "INSERT INTO activity_goal_history SELECT id,id,?1,daily_word_goal,0 FROM books",
            [today],
        )?;
    }
    tx.execute("INSERT INTO writing_schedule_history VALUES (?1,?2) ON CONFLICT(effective_from) DO UPDATE SET weekdays_mask=excluded.weekdays_mask",params![next,mask])?;
    tx.execute(
        "UPDATE writing_schedule_state SET revision=revision+1 WHERE id=1",
        [],
    )?;
    let result = read(&tx)?;
    tx.commit()?;
    Ok(result)
}

/// Called inside book metadata transactions, only once tracking has been enabled.
pub fn record_goal(
    c: &Connection,
    book: &str,
    goal: Option<i64>,
    created: bool,
    retired: bool,
) -> Result<(), rusqlite::Error> {
    let enabled: bool = c.query_row(
        "SELECT EXISTS(SELECT 1 FROM writing_schedule_history)",
        [],
        |r| r.get(0),
    )?;
    if !enabled {
        return Ok(());
    }
    let today = local_today().map_err(|_| rusqlite::Error::InvalidQuery)?;
    let day = date(&today).ok_or(rusqlite::Error::InvalidQuery)?;
    let effective = if created {
        day
    } else {
        day.succ_opt()
            .filter(|d| d.year() <= 9999)
            .ok_or(rusqlite::Error::InvalidQuery)?
    }
    .format("%Y-%m-%d")
    .to_string();
    let latest: Option<String> = c.query_row(
        "SELECT max(effective_from) FROM activity_goal_history WHERE source_book_id=?1",
        [book],
        |r| r.get(0),
    )?;
    if latest.is_some_and(|last| last > effective) {
        return Err(rusqlite::Error::InvalidQuery);
    }
    c.execute("INSERT INTO activity_goal_history VALUES (?1,?1,?2,?3,?4) ON CONFLICT(source_book_id,effective_from) DO UPDATE SET daily_word_goal=excluded.daily_word_goal, retired=excluded.retired",params![book,effective,goal,retired])?;
    Ok(())
}

pub fn scheduled(c: &Connection, day: &str) -> Result<Option<bool>, ActivityError> {
    let civil = date(day).ok_or(ActivityError::InvalidStoredData)?;
    let entry: Option<(String,i64)>=c.query_row("SELECT effective_from,weekdays_mask FROM writing_schedule_history WHERE effective_from<=?1 ORDER BY effective_from DESC LIMIT 1",[day],|r|Ok((r.get(0)?,r.get(1)?))).optional()?;
    match entry {
        None => Ok(None),
        Some((from, mask)) => {
            if date(&from).is_none() || !(0..=127).contains(&mask) {
                return Err(ActivityError::InvalidStoredData);
            }
            Ok(Some(
                mask & (1 << civil.weekday().num_days_from_sunday()) != 0,
            ))
        }
    }
}

pub type HistoricalGoal = (String, Option<String>, Option<i64>);
pub fn goals(
    c: &Connection,
    day: &str,
    book: Option<&str>,
) -> Result<Vec<HistoricalGoal>, ActivityError> {
    let mut stmt=c.prepare("SELECT h.source_book_id,h.book_id,h.daily_word_goal,h.effective_from,h.retired FROM activity_goal_history h WHERE h.effective_from=(SELECT max(p.effective_from) FROM activity_goal_history p WHERE p.source_book_id=h.source_book_id AND p.effective_from<=?1) AND (?2 IS NULL OR h.book_id=?2)")?;
    let mut result = Vec::new();
    for row in stmt.query_map(params![day, book], |r| {
        Ok((
            r.get::<_, String>(0)?,
            r.get::<_, Option<String>>(1)?,
            r.get::<_, Option<i64>>(2)?,
            r.get::<_, String>(3)?,
            r.get::<_, i64>(4)?,
        ))
    })? {
        let (source, live, target, from, retired) = row?;
        if !valid_id(&source)
            || live.as_ref().is_some_and(|id| id != &source)
            || date(&from).is_none()
            || target.is_some_and(|g| !(1..=MAX_SAFE_INTEGER).contains(&g))
            || ![0, 1].contains(&retired)
        {
            return Err(ActivityError::InvalidStoredData);
        }
        if retired == 0 {
            result.push((source, live, target));
        }
    }
    Ok(result)
}

pub fn first_history(
    c: &Connection,
    today: &str,
    book: Option<&str>,
) -> Result<Option<String>, ActivityError> {
    let first=c.query_row("SELECT min(day) FROM (SELECT local_date AS day FROM writing_activity WHERE (?2 IS NULL OR book_id=?2) UNION ALL SELECT effective_from AS day FROM activity_goal_history WHERE (?2 IS NULL OR book_id=?2) UNION ALL SELECT effective_from AS day FROM writing_schedule_history WHERE ?2 IS NULL) WHERE day<=?1",params![today,book],|r|r.get(0))?;
    Ok(first)
}

#[cfg(test)]
mod tests;
