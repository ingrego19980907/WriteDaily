use super::{ChapterContent, ChapterError, MAX_SAFE_INTEGER};
use crate::books::validation::{parse_timestamp, valid_id};
use chrono::{Datelike, Duration, NaiveDate};
use rusqlite::{Connection, OptionalExtension, params};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

const MAX_BYTES: usize = 128 * 1024;
pub(super) const MAX_SEGMENTS: usize = 128;

#[derive(Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct Context {
    local_date: String,
    time_zone: Option<String>,
    utc_offset_minutes: i64,
    daily_word_goal: Option<i64>,
    scheduled: bool,
}
#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct Segment {
    context: Context,
    first_edited_at: String,
    last_edited_at: String,
    before_words: i64,
    after_words: i64,
}
#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct Submission {
    policy_version: i64,
    pub operation_id: String,
    origin: String,
    segments: Vec<Segment>,
}

fn invalid() -> ChapterError {
    ChapterError::Validation("invalid_activity")
}

impl Submission {
    pub fn parse(raw: &str) -> Result<Self, ChapterError> {
        if raw.len() > MAX_BYTES {
            return Err(ChapterError::LimitReached);
        }
        let value: Self = serde_json::from_str(raw).map_err(|_| invalid())?;
        if value.policy_version != 1
            || !valid_id(&value.operation_id)
            || !["editor", "import", "restore"].contains(&value.origin.as_str())
            || value.segments.is_empty()
            || value.segments.len() > MAX_SEGMENTS
        {
            return Err(invalid());
        }
        for segment in &value.segments {
            let context = &segment.context;
            let day = NaiveDate::parse_from_str(&context.local_date, "%Y-%m-%d")
                .map_err(|_| invalid())?;
            if !(1..=9999).contains(&day.year())
                || day.format("%Y-%m-%d").to_string() != context.local_date
                || !(-840..=840).contains(&context.utc_offset_minutes)
                || context
                    .daily_word_goal
                    .is_some_and(|goal| !(1..=MAX_SAFE_INTEGER).contains(&goal))
                || context.time_zone.as_ref().is_some_and(|zone| {
                    zone.is_empty()
                        || zone.len() > 128
                        || !zone
                            .bytes()
                            .all(|c| c.is_ascii_alphanumeric() || b"/_+-".contains(&c))
                })
                || !(0..=MAX_SAFE_INTEGER).contains(&segment.before_words)
                || !(0..=MAX_SAFE_INTEGER).contains(&segment.after_words)
            {
                return Err(invalid());
            }
            for instant in [&segment.first_edited_at, &segment.last_edited_at] {
                let utc = parse_timestamp(instant).ok_or_else(invalid)?;
                let local = utc
                    .checked_add_signed(Duration::minutes(context.utc_offset_minutes))
                    .ok_or_else(invalid)?;
                if local.date_naive() != day {
                    return Err(invalid());
                }
            }
        }
        if value.segments.windows(2).any(|pair| {
            pair[0].after_words != pair[1].before_words || pair[0].context == pair[1].context
        }) {
            return Err(invalid());
        }
        Ok(value)
    }

    pub fn digest(
        &self,
        book: &str,
        chapter: &str,
        revision: i64,
        content: &ChapterContent,
    ) -> Result<String, ChapterError> {
        // Typed fields fix key order; serde_json's content object maps are sorted.
        let semantic_content = serde_json::to_value(content).map_err(|_| invalid())?;
        let bytes = serde_json::to_vec(&(
            "WriteDaily/activity/v1",
            book,
            chapter,
            revision,
            semantic_content,
            self,
        ))
        .map_err(|_| invalid())?;
        Ok(format!("{:x}", Sha256::digest(bytes)))
    }

    pub fn check_endpoints(&self, before: i64, after: i64) -> Result<(), ChapterError> {
        if self.segments[0].before_words != before
            || self.segments.last().ok_or_else(invalid)?.after_words != after
        {
            return Err(invalid());
        }
        Ok(())
    }

    pub fn receipt(
        &self,
        connection: &Connection,
        digest: &str,
    ) -> Result<Option<i64>, ChapterError> {
        let receipt = connection.query_row("SELECT payload_digest, committed_revision FROM activity_operations WHERE operation_id=?1", [&self.operation_id], |row| Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))).optional()?;
        if let Some((stored, revision)) = receipt {
            if stored.len() != 64
                || !stored.bytes().all(|c| c.is_ascii_hexdigit())
                || !(2..=MAX_SAFE_INTEGER).contains(&revision)
            {
                return Err(ChapterError::InvalidStoredData);
            }
            if stored != digest {
                return Err(ChapterError::Conflict);
            }
            return Ok(Some(revision));
        }
        Ok(None)
    }

    pub fn persist(
        &self,
        connection: &Connection,
        book: &str,
        chapter: &str,
        expected_revision: i64,
        digest: &str,
        committed_at: &str,
    ) -> Result<(), ChapterError> {
        connection.execute("INSERT INTO activity_operations(operation_id,policy_version,origin,source_book_id,source_chapter_id,expected_revision,committed_revision,payload_digest,committed_at) VALUES (?1,1,?2,?3,?4,?5,?6,?7,?8)", params![self.operation_id,self.origin,book,chapter,expected_revision,expected_revision+1,digest,committed_at])?;
        for (index, segment) in self.segments.iter().enumerate() {
            let context = &segment.context;
            let scheduled = crate::schedule::scheduled(connection, &context.local_date)
                .map_err(|_| ChapterError::InvalidStoredData)?
                .unwrap_or(true);
            let planned_goal = crate::schedule::goals(connection, &context.local_date, Some(book))
                .map_err(|_| ChapterError::InvalidStoredData)?
                .into_iter()
                .next()
                .map_or(context.daily_word_goal, |(_, _, goal)| goal);
            let added = (segment.after_words - segment.before_words).max(0);
            let deleted = (segment.before_words - segment.after_words).max(0);
            let credited = if self.origin == "editor" { added } else { 0 };
            connection.execute("INSERT INTO writing_activity(operation_id,segment_index,book_id,chapter_id,local_date,time_zone,utc_offset_minutes,first_edited_at,last_edited_at,before_words,after_words,added_words,deleted_words,credited_words,daily_word_goal,scheduled) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16)",params![self.operation_id,index as i64,book,chapter,context.local_date,context.time_zone,context.utc_offset_minutes,segment.first_edited_at,segment.last_edited_at,segment.before_words,segment.after_words,added,deleted,credited,context.daily_word_goal,scheduled])?;
            if self.origin == "editor" {
                connection.execute("INSERT INTO activity_day_plans(source_book_id,local_date,book_id,daily_word_goal,scheduled,policy_version) VALUES (?1,?2,?1,?3,?4,1) ON CONFLICT(source_book_id,local_date) DO NOTHING", params![book,context.local_date,planned_goal,scheduled])?;
            }
        }
        Ok(())
    }
}
