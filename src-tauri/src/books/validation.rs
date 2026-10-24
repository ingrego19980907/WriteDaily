use chrono::{DateTime, Datelike, Duration, NaiveDate, SecondsFormat, Timelike, Utc};
use unicode_normalization::UnicodeNormalization;
use uuid::{Uuid, Variant};

use super::{Book, BookDetails, BookError, ValidationIssue};

const MAX_SAFE_COUNT: i64 = 9_007_199_254_740_991;

// Match ECMAScript trim, including BOM but excluding control character NEL.
fn is_title_edge_space(c: char) -> bool {
    matches!(c, '\u{0009}'..='\u{000d}' | '\u{0020}' | '\u{00a0}' | '\u{1680}'
        | '\u{2000}'..='\u{200a}' | '\u{2028}' | '\u{2029}' | '\u{202f}'
        | '\u{205f}' | '\u{3000}' | '\u{feff}')
}

pub(super) fn normalize_details(mut details: BookDetails) -> Result<BookDetails, BookError> {
    details.title = details
        .title
        .trim_matches(is_title_edge_space)
        .nfc()
        .collect();
    let mut issues = Vec::new();
    let title_code = if details.title.is_empty() {
        Some("required")
    } else if details.title.chars().any(char::is_control) {
        Some("invalid_title")
    } else if details.title.chars().count() > 200 {
        Some("too_long")
    } else {
        None
    };
    if let Some(code) = title_code {
        issues.push(ValidationIssue {
            field: "title",
            code,
        });
    }
    for (field, value) in [
        ("targetWordCount", details.target_word_count),
        ("dailyWordGoal", details.daily_word_goal),
    ] {
        if value.is_some_and(|count| !(1..=MAX_SAFE_COUNT).contains(&count)) {
            issues.push(ValidationIssue {
                field,
                code: "invalid_count",
            });
        }
    }
    if details
        .deadline
        .as_deref()
        .is_some_and(|date| !valid_date(date))
    {
        issues.push(ValidationIssue {
            field: "deadline",
            code: "invalid_date",
        });
    }
    if issues.is_empty() {
        Ok(details)
    } else {
        Err(BookError::Validation(issues))
    }
}

fn valid_date(value: &str) -> bool {
    NaiveDate::parse_from_str(value, "%Y-%m-%d").is_ok_and(|date| {
        (1..=9999).contains(&date.year()) && date.format("%Y-%m-%d").to_string() == value
    })
}

pub(super) fn valid_id(value: &str) -> bool {
    Uuid::parse_str(value).is_ok_and(|id| {
        id.get_version_num() == 4
            && id.get_variant() == Variant::RFC4122
            && id.hyphenated().to_string() == value
    })
}

pub(super) fn validate_id(value: &str) -> Result<(), BookError> {
    if valid_id(value) {
        Ok(())
    } else {
        Err(BookError::Validation(vec![ValidationIssue {
            field: "id",
            code: "invalid_id",
        }]))
    }
}

pub(super) fn parse_timestamp(value: &str) -> Option<DateTime<Utc>> {
    let time = DateTime::parse_from_rfc3339(value)
        .ok()?
        .with_timezone(&Utc);
    ((1..=9999).contains(&time.year())
        && time.nanosecond() < 1_000_000_000
        && time.to_rfc3339_opts(SecondsFormat::Millis, true) == value)
        .then_some(time)
}

pub(super) fn validate_expected(value: &str) -> Result<(), BookError> {
    if parse_timestamp(value).is_some() {
        Ok(())
    } else {
        Err(BookError::Validation(vec![ValidationIssue {
            field: "expectedUpdatedAt",
            code: "invalid_timestamp",
        }]))
    }
}

pub(crate) fn timestamp(after: Option<&str>) -> Result<String, BookError> {
    let mut time = Utc::now();
    if let Some(previous) = after {
        let previous =
            parse_timestamp(previous).ok_or(BookError::InvalidStoredData("updatedAt"))?;
        let next = previous
            .checked_add_signed(Duration::milliseconds(1))
            .ok_or(BookError::ClockOutOfRange)?;
        time = time.max(next);
    }
    if !(1..=9999).contains(&time.year()) {
        return Err(BookError::ClockOutOfRange);
    }
    Ok(time.to_rfc3339_opts(SecondsFormat::Millis, true))
}

pub(crate) fn valid_cover(value: &str) -> bool {
    value
        .strip_prefix("covers/")
        .and_then(|file| file.rsplit_once('.'))
        .is_some_and(|(stem, extension)| {
            valid_id(stem) && matches!(extension, "png" | "jpg" | "jpeg" | "webp")
        })
}

pub(super) fn validate_stored(book: Book) -> Result<Book, BookError> {
    if !valid_id(&book.id) {
        return Err(BookError::InvalidStoredData("id"));
    }
    let details = BookDetails {
        title: book.title.clone(),
        target_word_count: book.target_word_count,
        daily_word_goal: book.daily_word_goal,
        deadline: book.deadline.clone(),
    };
    let normalized =
        normalize_details(details.clone()).map_err(|_| BookError::InvalidStoredData("metadata"))?;
    if normalized != details {
        return Err(BookError::InvalidStoredData("noncanonical title"));
    }
    if book
        .cover_path
        .as_deref()
        .is_some_and(|path| !valid_cover(path))
    {
        return Err(BookError::InvalidStoredData("coverPath"));
    }
    let created =
        parse_timestamp(&book.created_at).ok_or(BookError::InvalidStoredData("createdAt"))?;
    let updated =
        parse_timestamp(&book.updated_at).ok_or(BookError::InvalidStoredData("updatedAt"))?;
    if updated < created {
        return Err(BookError::InvalidStoredData("timestamp order"));
    }
    if let Some(completed) = &book.completed_at {
        let completed =
            parse_timestamp(completed).ok_or(BookError::InvalidStoredData("completedAt"))?;
        if completed < created || completed > updated {
            return Err(BookError::InvalidStoredData("completion order"));
        }
    }
    Ok(book)
}
