use super::*;
use crate::{
    books::{BookDetails, BookRepository},
    chapters::{Chapter, ChapterDetails, ChapterRepository},
    database,
};
use rusqlite::{Connection, params};
use serde_json::{Value, json};

fn seed(connection: &mut Connection, goal: Option<i64>) -> Chapter {
    let book = BookRepository::new(connection)
        .create(BookDetails {
            title: "Daily statistics".into(),
            target_word_count: None,
            daily_word_goal: goal,
            deadline: None,
        })
        .unwrap();
    ChapterRepository::new(connection)
        .create(
            &book.id,
            ChapterDetails {
                title: "Chapter".into(),
            },
        )
        .unwrap()
}
fn activity(day: &str, before: i64, after: i64, target: Option<i64>, origin: &str) -> Value {
    json!({"policyVersion":1,"operationId":uuid::Uuid::new_v4().to_string(),"origin":origin,"segments":[{"context":{"localDate":day,"timeZone":"Etc/UTC","utcOffsetMinutes":0,"dailyWordGoal":target,"scheduled":true},"firstEditedAt":format!("{day}T12:00:00.000Z"),"lastEditedAt":format!("{day}T12:00:00.000Z"),"beforeWords":before,"afterWords":after}]})
}
fn save(
    connection: &mut Connection,
    chapter: &Chapter,
    text: &str,
    day: &str,
    target: Option<i64>,
    origin: &str,
) -> Chapter {
    let nodes = if text.is_empty() {
        vec![]
    } else {
        vec![json!({"type":"text","text":text})]
    };
    let content=json!({"schemaVersion":1,"document":{"type":"doc","content":[{"type":"paragraph","content":nodes}]}}).to_string();
    let before = chapter.summary.word_count.unwrap_or(0);
    let after = text.split_whitespace().count() as i64;
    ChapterRepository::new(connection)
        .save_content_with_activity(
            &chapter.summary.book_id,
            &chapter.summary.id,
            chapter.summary.revision,
            &content,
            &activity(day, before, after, target, origin).to_string(),
        )
        .unwrap()
}

#[test]
fn empty_dates_are_filled_inclusive_without_guessing_goals_from_books() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let chapter = seed(&mut c, Some(500));
    let result = get_daily_statistics(
        &mut c,
        "2024-02-28",
        "2024-03-01",
        Some(&chapter.summary.book_id),
    )
    .unwrap();
    assert_eq!(result.days.len(), 3);
    assert_eq!(result.days[1].date, "2024-02-29");
    for day in result.days {
        assert_eq!(day.credited_words, 0);
        assert_eq!(day.save_count, 0);
        assert!(!day.active);
        assert!(day.book_goals.is_empty());
    }
    assert_eq!(
        get_daily_statistics(&mut c, "2024-01-01", "2024-12-31", None)
            .unwrap()
            .days
            .len(),
        366
    );
    for date in ["0001-01-01", "9999-12-31"] {
        assert_eq!(
            get_daily_statistics(&mut c, date, date, None).unwrap().days[0].date,
            date
        );
    }
}

#[test]
fn sums_committed_batches_separates_deletions_and_uses_each_books_sealed_goal() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let first = seed(&mut c, Some(5));
    let second = seed(&mut c, None);
    let one = save(
        &mut c,
        &first,
        "one two three",
        "2026-10-28",
        Some(5),
        "editor",
    );
    let two = save(&mut c, &one, "one", "2026-10-28", Some(5), "editor");
    let three = save(
        &mut c,
        &two,
        "one two three four",
        "2026-10-28",
        Some(1000),
        "editor",
    );
    save(
        &mut c,
        &three,
        "four same length words",
        "2026-10-28",
        Some(1000),
        "editor",
    );
    save(&mut c, &second, "other book", "2026-10-28", None, "editor");
    c.execute(
        "UPDATE books SET daily_word_goal=1000 WHERE id=?1",
        [&first.summary.book_id],
    )
    .unwrap();
    let stats = get_daily_statistics(&mut c, "2026-10-28", "2026-10-28", None).unwrap();
    let day = &stats.days[0];
    assert_eq!(
        (
            day.added_words,
            day.deleted_words,
            day.credited_words,
            day.save_count,
            day.active
        ),
        (8, 2, 8, 5, true)
    );
    assert_eq!(day.book_goals.len(), 2);
    let first_goal = day
        .book_goals
        .iter()
        .find(|goal| goal.source_book_id == first.summary.book_id)
        .unwrap();
    assert_eq!(
        (
            first_goal.daily_word_goal,
            first_goal.credited_words,
            first_goal.state,
            first_goal.remaining_words
        ),
        (Some(5), 6, "reached", Some(0))
    );
    let no_goal = day
        .book_goals
        .iter()
        .find(|goal| goal.source_book_id == second.summary.book_id)
        .unwrap();
    assert_eq!(no_goal.state, "unconfigured");
    assert_eq!(no_goal.remaining_words, None);
    let scoped = get_daily_statistics(
        &mut c,
        "2026-10-28",
        "2026-10-28",
        Some(&first.summary.book_id),
    )
    .unwrap();
    assert_eq!(scoped.days[0].credited_words, 6);
    assert_eq!(scoped.days[0].save_count, 4);
    drop(c);
    drop(db);
    let reopened = database::open(dir.path()).unwrap();
    let mut c = reopened.lock().unwrap();
    assert_eq!(
        get_daily_statistics(&mut c, "2026-10-28", "2026-10-28", None).unwrap(),
        stats
    );
}

#[test]
fn zero_credit_and_imports_never_create_active_days_or_invent_achievements() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let chapter = seed(&mut c, Some(2));
    let imported = save(
        &mut c,
        &chapter,
        "old words",
        "2026-10-27",
        Some(2),
        "import",
    );
    let restored = save(
        &mut c,
        &imported,
        "restored old words",
        "2026-10-27",
        Some(2),
        "restore",
    );
    let replacement = save(
        &mut c,
        &restored,
        "same length words",
        "2026-10-28",
        Some(2),
        "editor",
    );
    save(&mut c, &replacement, "one", "2026-10-28", Some(2), "editor");
    let days = get_daily_statistics(&mut c, "2026-10-27", "2026-10-28", None)
        .unwrap()
        .days;
    assert_eq!(
        (
            days[0].added_words,
            days[0].credited_words,
            days[0].save_count
        ),
        (0, 0, 0)
    );
    assert!(days[0].book_goals.is_empty());
    assert_eq!(
        (
            days[1].added_words,
            days[1].deleted_words,
            days[1].credited_words,
            days[1].save_count
        ),
        (0, 2, 0, 2)
    );
    assert!(!days[1].active);
    assert_eq!(days[1].book_goals[0].state, "pending");
    assert_eq!(days[1].book_goals[0].remaining_words, Some(2));
}

#[test]
fn multiple_segments_count_a_save_once_and_keep_local_date_labels_on_both_sides_of_utc() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let chapter = seed(&mut c, Some(2));
    let mut request = activity("2026-10-27", 0, 1, Some(2), "editor");
    let first = &mut request["segments"][0];
    first["context"]["timeZone"] = json!("America/Los_Angeles");
    first["context"]["utcOffsetMinutes"] = json!(-420);
    first["firstEditedAt"] = json!("2026-10-28T06:59:00.000Z");
    first["lastEditedAt"] = json!("2026-10-28T06:59:00.000Z");
    let mut second = activity("2026-10-27", 1, 2, Some(2), "editor")["segments"][0].clone();
    second["context"]["timeZone"] = json!("Etc/UTC");
    second["firstEditedAt"] = json!("2026-10-27T23:59:00.000Z");
    second["lastEditedAt"] = json!("2026-10-27T23:59:00.000Z");
    let mut third = activity("2026-10-28", 2, 1, Some(2), "editor")["segments"][0].clone();
    third["context"]["timeZone"] = json!("Asia/Tokyo");
    third["context"]["utcOffsetMinutes"] = json!(540);
    third["firstEditedAt"] = json!("2026-10-27T15:01:00.000Z");
    third["lastEditedAt"] = json!("2026-10-27T15:01:00.000Z");
    request["segments"]
        .as_array_mut()
        .unwrap()
        .extend([second, third]);
    let raw=json!({"schemaVersion":1,"document":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"one"}]}]}}).to_string();
    ChapterRepository::new(&mut c)
        .save_content_with_activity(
            &chapter.summary.book_id,
            &chapter.summary.id,
            1,
            &raw,
            &request.to_string(),
        )
        .unwrap();
    let stats = get_daily_statistics(&mut c, "2026-10-27", "2026-10-28", None).unwrap();
    assert_eq!(
        (stats.days[0].credited_words, stats.days[0].save_count),
        (2, 1)
    );
    assert_eq!(stats.days[0].book_goals[0].state, "reached");
    assert_eq!(
        (
            stats.days[1].credited_words,
            stats.days[1].deleted_words,
            stats.days[1].save_count
        ),
        (0, 1, 1)
    );
    assert!(!stats.days[1].active);
}

#[test]
fn deleting_sources_keeps_global_history_and_chapter_deletion_keeps_book_statistics() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let chapter = seed(&mut c, Some(1));
    let saved = save(&mut c, &chapter, "one", "2026-10-28", Some(1), "editor");
    ChapterRepository::new(&mut c)
        .delete(
            &saved.summary.book_id,
            &saved.summary.id,
            saved.summary.revision,
        )
        .unwrap();
    assert_eq!(
        get_daily_statistics(
            &mut c,
            "2026-10-28",
            "2026-10-28",
            Some(&chapter.summary.book_id)
        )
        .unwrap()
        .days[0]
            .credited_words,
        1
    );
    c.execute("DELETE FROM books WHERE id=?1", [&chapter.summary.book_id])
        .unwrap();
    let all = get_daily_statistics(&mut c, "2026-10-28", "2026-10-28", None).unwrap();
    assert_eq!(all.days[0].credited_words, 1);
    assert_eq!(all.days[0].book_goals[0].book_id, None);
    assert_eq!(
        all.days[0].book_goals[0].source_book_id,
        chapter.summary.book_id
    );
    assert!(matches!(
        get_daily_statistics(
            &mut c,
            "2026-10-28",
            "2026-10-28",
            Some(&chapter.summary.book_id)
        ),
        Err(ActivityError::NotFound)
    ));
}

#[test]
fn malformed_rows_and_missing_plans_fail_instead_of_returning_partial_or_zero_statistics() {
    for statement in [
        "UPDATE writing_activity SET credited_words=1",
        "UPDATE writing_activity SET first_edited_at='invalid'",
        "UPDATE activity_operations SET payload_digest='xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'",
        "DELETE FROM activity_day_plans",
    ] {
        let dir = tempfile::tempdir().unwrap();
        let db = database::open(dir.path()).unwrap();
        let mut c = db.lock().unwrap();
        let chapter = seed(&mut c, Some(2));
        save(&mut c, &chapter, "one two", "2026-10-28", Some(2), "editor");
        c.execute_batch(statement).unwrap();
        assert!(
            matches!(
                get_daily_statistics(&mut c, "2026-10-28", "2026-10-28", None),
                Err(ActivityError::InvalidStoredData)
            ),
            "{statement}"
        );
    }
}

#[test]
fn checks_the_safe_integer_sum_limit_without_sql_or_float_overflow() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let first = seed(&mut c, None);
    let second = seed(&mut c, None);
    save(&mut c, &first, "one", "2026-10-28", None, "editor");
    save(&mut c, &second, "two", "2026-10-28", None, "editor");
    c.execute("UPDATE writing_activity SET after_words=?1,added_words=?1,credited_words=?1 WHERE book_id=?2",params![crate::chapters::MAX_SAFE_INTEGER,first.summary.book_id]).unwrap();
    assert_eq!(
        get_daily_statistics(
            &mut c,
            "2026-10-28",
            "2026-10-28",
            Some(&first.summary.book_id)
        )
        .unwrap()
        .days[0]
            .credited_words,
        crate::chapters::MAX_SAFE_INTEGER
    );
    assert!(matches!(
        get_daily_statistics(&mut c, "2026-10-28", "2026-10-28", None),
        Err(ActivityError::LimitReached)
    ));
}

#[test]
fn invalid_ranges_and_book_scopes_are_rejected() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    for (start, end) in [
        ("2026-02-29", "2026-03-01"),
        ("2026-1-01", "2026-01-02"),
        ("0000-01-01", "0001-01-01"),
        ("2026-10-29", "2026-10-28"),
        ("2024-01-01", "2025-01-01"),
    ] {
        assert!(matches!(
            get_daily_statistics(&mut c, start, end, None),
            Err(ActivityError::Validation)
        ));
    }
    assert!(matches!(
        get_daily_statistics(&mut c, "2026-10-28", "2026-10-28", Some("injected' OR 1=1")),
        Err(ActivityError::Validation)
    ));
    assert!(matches!(
        get_daily_statistics(
            &mut c,
            "2026-10-28",
            "2026-10-28",
            Some(&uuid::Uuid::new_v4().to_string())
        ),
        Err(ActivityError::NotFound)
    ));
}

#[test]
fn another_connections_uncommitted_changes_are_not_counted() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let other = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let mut read = other.lock().unwrap();
    let chapter = seed(&mut c, Some(2));
    save(&mut c, &chapter, "one two", "2026-10-28", Some(2), "editor");
    c.execute_batch("BEGIN IMMEDIATE; UPDATE writing_activity SET after_words=3,added_words=3,credited_words=3;").unwrap();
    assert_eq!(
        get_daily_statistics(&mut read, "2026-10-28", "2026-10-28", None)
            .unwrap()
            .days[0]
            .credited_words,
        2
    );
    c.execute_batch("ROLLBACK;").unwrap();
    assert_eq!(
        get_daily_statistics(&mut read, "2026-10-28", "2026-10-28", None)
            .unwrap()
            .days[0]
            .credited_words,
        2
    );
}
