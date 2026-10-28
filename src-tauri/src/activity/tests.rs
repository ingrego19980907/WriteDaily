use super::*;
use crate::{
    books::{BookDetails, BookRepository},
    chapters::{Chapter, ChapterDetails, ChapterRepository},
    database,
};
use rusqlite::{Connection, params};
use serde_json::{Value, json};

#[test]
fn longest_record_survives_later_misses_keeps_earliest_tie_and_extends_on_completion() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let mut chapter = seed(&mut c, Some(1));
    let mut words = 0;
    for (day, reached) in [
        (20, true),
        (21, true),
        (22, false),
        (23, true),
        (24, true),
        (25, false),
    ] {
        words += i32::from(reached);
        chapter = save(
            &mut c,
            &chapter,
            &vec!["word"; words as usize].join(" "),
            &format!("2026-10-{day}"),
            Some(1),
            "editor",
        );
    }
    let result = get_longest_streak(&mut c, "2026-10-25", None).unwrap();
    assert_eq!((result.days, result.exact), (2, true));
    assert_eq!(result.start_date.as_deref(), Some("2026-10-20"));
    assert_eq!(result.end_date.as_deref(), Some("2026-10-21"));
    save(
        &mut c,
        &chapter,
        "one two three four five",
        "2026-10-25",
        Some(1),
        "editor",
    );
    let extended = get_longest_streak(&mut c, "2026-10-25", None).unwrap();
    assert_eq!(extended.days, 3);
    assert_eq!(extended.start_date.as_deref(), Some("2026-10-23"));
    assert_eq!(extended.end_date.as_deref(), Some("2026-10-25"));
    assert_eq!(
        get_longest_streak(&mut c, "2026-10-27", None).unwrap().days,
        3
    );
    assert!(
        !get_longest_streak(&mut c, "2026-10-27", None)
            .unwrap()
            .exact
    );
}

#[test]
fn longest_unknown_days_split_runs_but_confirmed_scoped_rest_is_neutral() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let chapter = seed(&mut c, Some(1));
    let one = save(&mut c, &chapter, "one", "2024-02-28", Some(1), "editor");
    let rest = save(&mut c, &one, "one", "2024-02-29", Some(1), "editor");
    save(&mut c, &rest, "one two", "2024-03-01", Some(1), "editor");
    c.execute(
        "UPDATE activity_day_plans SET scheduled=0 WHERE local_date='2024-02-29'",
        [],
    )
    .unwrap();
    let scoped = get_longest_streak(&mut c, "2024-03-01", Some(&chapter.summary.book_id)).unwrap();
    assert_eq!((scoped.days, scoped.exact), (2, true));
    let global = get_longest_streak(&mut c, "2024-03-01", None).unwrap();
    assert_eq!((global.days, global.exact), (1, false));
    // Absent plans are unknown, never inferred from today's book configuration.
    c.execute(
        "DELETE FROM writing_activity WHERE local_date='2024-02-29'",
        [],
    )
    .unwrap();
    let missing = get_longest_streak(&mut c, "2024-03-01", Some(&chapter.summary.book_id)).unwrap();
    assert_eq!((missing.days, missing.exact), (1, false));
    c.execute(
        "DELETE FROM activity_day_plans WHERE local_date='2024-03-01'",
        [],
    )
    .unwrap();
    assert!(matches!(
        get_longest_streak(&mut c, "2024-03-01", None),
        Err(ActivityError::InvalidStoredData)
    ));
}

#[test]
fn longest_global_counts_any_book_once_and_retains_deleted_book_history() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let first = seed(&mut c, Some(1));
    let second = seed(&mut c, Some(1));
    save(&mut c, &first, "one", "2026-10-27", Some(1), "editor");
    let one = save(&mut c, &second, "one", "2026-10-27", Some(1), "editor");
    save(&mut c, &one, "one two", "2026-10-28", Some(1), "editor");
    let result = get_longest_streak(&mut c, "2026-10-28", None).unwrap();
    assert_eq!((result.days, result.exact), (2, true));
    c.execute("DELETE FROM books WHERE id=?1", [&first.summary.book_id])
        .unwrap();
    assert_eq!(
        get_longest_streak(&mut c, "2026-10-28", None).unwrap(),
        result
    );
    assert!(matches!(
        get_longest_streak(&mut c, "2026-10-28", Some(&first.summary.book_id)),
        Err(ActivityError::NotFound)
    ));
}

#[test]
fn longest_empty_future_import_unconfigured_and_invalid_requests_do_not_invent_success() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let chapter = seed(&mut c, None);
    let empty = get_longest_streak(&mut c, "2026-10-28", None).unwrap();
    assert_eq!(
        (empty.days, empty.exact, empty.history_start_date),
        (0, true, None)
    );
    let imported = save(&mut c, &chapter, "one two", "2026-10-26", None, "import");
    let unconfigured = save(
        &mut c,
        &imported,
        "one two three",
        "2026-10-27",
        None,
        "editor",
    );
    save(
        &mut c,
        &unconfigured,
        "one two three four",
        "2026-10-29",
        Some(1),
        "editor",
    );
    let unknown = get_longest_streak(&mut c, "2026-10-28", None).unwrap();
    assert_eq!(
        (unknown.days, unknown.exact, unknown.start_date),
        (0, false, None)
    );
    for day in ["bad", "2026-02-29", "0000-01-01"] {
        assert!(matches!(
            get_longest_streak(&mut c, day, None),
            Err(ActivityError::Validation)
        ));
    }
    assert!(matches!(
        get_longest_streak(&mut c, "2026-10-28", Some("bad")),
        Err(ActivityError::Validation)
    ));
}

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

#[test]
fn current_streak_today_grace_only_counts_reached_goals_and_a_known_miss_ends_it() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let chapter = seed(&mut c, Some(1));
    let missed = save(&mut c, &chapter, "", "2026-10-24", Some(1), "editor");
    let one = save(&mut c, &missed, "one", "2026-10-25", Some(1), "editor");
    let two = save(&mut c, &one, "one two", "2026-10-26", Some(1), "editor");
    let pending = save(&mut c, &two, "same count", "2026-10-27", Some(1), "editor");
    let streak = get_current_streak(&mut c, "2026-10-27", None).unwrap();
    assert_eq!(
        (
            streak.days,
            streak.exact,
            streak.today_state,
            streak.boundary
        ),
        (2, true, "pending", "missed_day")
    );
    assert_eq!(streak.start_date.as_deref(), Some("2026-10-25"));
    assert_eq!(streak.last_completed_date.as_deref(), Some("2026-10-26"));
    let reached = save(
        &mut c,
        &pending,
        "one two three",
        "2026-10-27",
        Some(1),
        "editor",
    );
    assert_eq!(
        get_current_streak(&mut c, "2026-10-27", None).unwrap().days,
        3
    );
    let grace = get_current_streak(&mut c, "2026-10-28", None).unwrap();
    assert_eq!(
        (grace.days, grace.exact, grace.today_state),
        (3, true, "unknown")
    );
    save(
        &mut c,
        &reached,
        "one two three",
        "2026-10-28",
        Some(1),
        "editor",
    );
    let ended = get_current_streak(&mut c, "2026-10-29", None).unwrap();
    assert_eq!(
        (ended.days, ended.exact, ended.boundary),
        (0, true, "missed_day")
    );
}

#[test]
fn current_streak_unknown_history_and_unconfigured_goals_are_not_invented_breaks_or_successes() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let chapter = seed(&mut c, Some(1));
    let prior = save(&mut c, &chapter, "one", "2026-10-25", Some(1), "editor");
    save(&mut c, &prior, "one two", "2026-10-27", Some(1), "editor");
    let suffix = get_current_streak(&mut c, "2026-10-27", None).unwrap();
    assert_eq!(
        (suffix.days, suffix.exact, suffix.boundary),
        (1, false, "unknown_day")
    );
    let unknown = get_current_streak(&mut c, "2026-10-29", None).unwrap();
    assert_eq!((unknown.days, unknown.exact), (0, false));
    let unconfigured = seed(&mut c, None);
    save(
        &mut c,
        &unconfigured,
        "many credited words",
        "2026-10-27",
        None,
        "editor",
    );
    let result =
        get_current_streak(&mut c, "2026-10-28", Some(&unconfigured.summary.book_id)).unwrap();
    assert_eq!(result.days, 0);
    assert!(!result.exact);
    assert_eq!(result.boundary, "unknown_day");
}

#[test]
fn current_streak_confirmed_book_days_off_are_neutral_but_do_not_prove_global_rest() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let chapter = seed(&mut c, Some(1));
    let miss = save(&mut c, &chapter, "", "2026-10-23", Some(1), "editor");
    let one = save(&mut c, &miss, "one", "2026-10-24", Some(1), "editor");
    let rest = save(&mut c, &one, "one", "2026-10-25", Some(1), "editor");
    let two = save(&mut c, &rest, "one two", "2026-10-26", Some(1), "editor");
    save(&mut c, &two, "one two", "2026-10-27", Some(1), "editor");
    // Simulate sealed rest history for future 5.7; no preferred-day write UI is added here.
    c.execute(
        "UPDATE activity_day_plans SET scheduled=0 WHERE local_date='2026-10-25'",
        [],
    )
    .unwrap();
    let scoped = get_current_streak(&mut c, "2026-10-27", Some(&chapter.summary.book_id)).unwrap();
    assert_eq!((scoped.days, scoped.exact), (2, true));
    let global = get_current_streak(&mut c, "2026-10-27", None).unwrap();
    assert_eq!(
        (global.days, global.exact, global.boundary),
        (1, false, "unknown_day")
    );
}

#[test]
fn current_streak_global_day_counts_once_for_any_reached_book_and_retains_removed_sources() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let first = seed(&mut c, Some(1));
    let second = seed(&mut c, Some(10));
    let one = save(&mut c, &first, "one", "2026-10-27", Some(1), "editor");
    save(&mut c, &one, "one two", "2026-10-28", Some(1), "editor");
    save(&mut c, &second, "one", "2026-10-28", Some(10), "editor");
    let result = get_current_streak(&mut c, "2026-10-28", None).unwrap();
    assert_eq!(
        (result.days, result.exact, result.today_credited_words),
        (2, false, 2)
    );
    assert_eq!(result.boundary, "history_start");
    c.execute("DELETE FROM books WHERE id=?1", [&first.summary.book_id])
        .unwrap();
    assert_eq!(
        get_current_streak(&mut c, "2026-10-28", None).unwrap(),
        result
    );
    assert!(matches!(
        get_current_streak(&mut c, "2026-10-28", Some(&first.summary.book_id)),
        Err(ActivityError::NotFound)
    ));
}

#[test]
fn current_streak_history_is_paged_beyond_366_days_and_never_truncated_to_calendar_month() {
    use chrono::{Duration, NaiveDate};
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let mut chapter = seed(&mut c, Some(1));
    let first = NaiveDate::from_ymd_opt(2025, 1, 1).unwrap();
    for index in 0..400 {
        let day = (first + Duration::days(index))
            .format("%Y-%m-%d")
            .to_string();
        let text = vec!["word"; index as usize + 1].join(" ");
        chapter = save(&mut c, &chapter, &text, &day, Some(1), "editor");
    }
    let today = (first + Duration::days(399)).format("%Y-%m-%d").to_string();
    let streak = get_current_streak(&mut c, &today, Some(&chapter.summary.book_id)).unwrap();
    assert_eq!(
        (streak.days, streak.exact, streak.boundary),
        (400, false, "history_start")
    );
    assert_eq!(streak.start_date.as_deref(), Some("2025-01-01"));
    let longest = get_longest_streak(&mut c, &today, Some(&chapter.summary.book_id)).unwrap();
    assert_eq!(longest.days, 400);
    assert!(longest.exact);
    assert_eq!(longest.end_date.as_deref(), Some(today.as_str()));
    drop(c);
    drop(db);
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    assert_eq!(
        get_longest_streak(&mut c, &today, Some(&chapter.summary.book_id)).unwrap(),
        longest
    );
    assert_eq!(
        get_current_streak(&mut c, &today, Some(&chapter.summary.book_id)).unwrap(),
        streak
    );
}

#[test]
fn current_streak_handles_empty_future_invalid_and_supported_first_date_without_utc_bucketing() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let chapter = seed(&mut c, Some(1));
    let empty = get_current_streak(&mut c, "2026-10-28", None).unwrap();
    assert_eq!(
        (empty.days, empty.exact, empty.boundary),
        (0, true, "empty_history")
    );
    save(&mut c, &chapter, "future", "2026-10-29", Some(1), "editor");
    assert_eq!(
        get_current_streak(&mut c, "2026-10-28", None).unwrap(),
        empty
    );
    for value in ["bad", "2026-02-29", "0000-01-01"] {
        assert!(matches!(
            get_current_streak(&mut c, value, None),
            Err(ActivityError::Validation)
        ));
    }
    let earliest = seed(&mut c, Some(1));
    save(&mut c, &earliest, "one", "0001-01-01", Some(1), "editor");
    let streak = get_current_streak(&mut c, "0001-01-01", Some(&earliest.summary.book_id)).unwrap();
    assert_eq!(
        (streak.days, streak.exact, streak.boundary),
        (1, true, "date_start")
    );
}

#[test]
fn current_streak_uses_calendar_leap_and_dst_adjacent_days_and_rejects_corrupt_history() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    for dates in [
        ["2024-02-28", "2024-02-29", "2024-03-01"],
        ["2026-10-24", "2026-10-25", "2026-10-26"],
    ] {
        let chapter = seed(&mut c, Some(1));
        let one = save(&mut c, &chapter, "one", dates[0], Some(1), "editor");
        let two = save(&mut c, &one, "one two", dates[1], Some(1), "editor");
        save(&mut c, &two, "one two three", dates[2], Some(1), "editor");
        assert_eq!(
            get_current_streak(&mut c, dates[2], Some(&chapter.summary.book_id))
                .unwrap()
                .days,
            3
        );
    }
    c.execute(
        "DELETE FROM activity_day_plans WHERE local_date='2026-10-26'",
        [],
    )
    .unwrap();
    assert!(matches!(
        get_current_streak(&mut c, "2026-10-26", None),
        Err(ActivityError::InvalidStoredData)
    ));
}
