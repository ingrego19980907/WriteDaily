use super::*;
use crate::{
    activity,
    books::{BookDetails, BookRepository},
    database,
};
fn book(c: &mut Connection, goal: Option<i64>) -> crate::books::Book {
    BookRepository::new(c)
        .create(BookDetails {
            title: "Schedule".into(),
            target_word_count: None,
            daily_word_goal: goal,
            deadline: None,
        })
        .unwrap()
}

#[test]
fn tomorrow_uses_civil_boundaries_and_backward_dates_preserve_history() {
    for (today, tomorrow) in [
        ("2024-03-31", "2024-04-01"),
        ("2024-10-27", "2024-10-28"),
        ("2024-02-29", "2024-03-01"),
        ("2024-12-31", "2025-01-01"),
    ] {
        let dir = tempfile::tempdir().unwrap();
        let db = database::open(dir.path()).unwrap();
        let mut c = db.lock().unwrap();
        let b = book(&mut c, Some(1));
        let saved = save_on(&mut c, 0, &[], today).unwrap();
        assert_eq!(saved.history[0].effective_from, today);
        assert_eq!(saved.history[1].effective_from, tomorrow);
        assert_eq!(scheduled(&c, today).unwrap(), Some(true));
        assert_eq!(scheduled(&c, tomorrow).unwrap(), Some(false));
        let yesterday = date(today)
            .unwrap()
            .pred_opt()
            .unwrap()
            .format("%Y-%m-%d")
            .to_string();
        assert!(matches!(
            save_on(&mut c, saved.revision, &[1], &yesterday),
            Err(ScheduleError::Validation)
        ));
        assert_eq!(read(&c).unwrap(), saved);
        let range = activity::get_daily_statistics(&mut c, today, tomorrow, Some(&b.id)).unwrap();
        assert_eq!(range.days[0].book_goals[0].state, "pending");
        assert_eq!(range.days[1].book_goals[0].state, "unscheduled");
        assert!(
            range
                .days
                .iter()
                .all(|day| day.credited_words == 0 && day.save_count == 0)
        );
    }
}

#[test]
fn production_schedule_boundary_rejects_a_client_date_that_disagrees_with_the_os() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    book(&mut c, Some(1));
    let current = date(&local_today().unwrap()).unwrap();
    // More than one day away keeps this check stable if the test crosses midnight.
    for offset in [-7, 7] {
        let stale = current
            .checked_add_signed(chrono::Duration::days(offset))
            .unwrap()
            .format("%Y-%m-%d")
            .to_string();
        assert!(matches!(
            save(&mut c, 0, &[1], &stale),
            Err(ScheduleError::Validation)
        ));
        assert_eq!(read(&c).unwrap().revision, 0);
        let goals: i64 = c
            .query_row("SELECT count(*) FROM activity_goal_history", [], |r| {
                r.get(0)
            })
            .unwrap();
        assert_eq!(goals, 0);
    }
}
#[test]
fn defaults_are_not_backfilled_and_changes_start_tomorrow_with_conflicts_and_reopen() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let b = book(&mut c, Some(10));
    assert_eq!(
        read(&c).unwrap(),
        WritingSchedule {
            revision: 0,
            history: vec![]
        }
    );
    let result = save_on(&mut c, 0, &[1, 3, 5], "2026-10-28").unwrap();
    assert_eq!(result.revision, 1);
    assert_eq!(scheduled(&c, "2026-10-27").unwrap(), None);
    assert_eq!(scheduled(&c, "2026-10-28").unwrap(), Some(true));
    assert_eq!(scheduled(&c, "2026-10-29").unwrap(), Some(false));
    assert_eq!(scheduled(&c, "2026-10-30").unwrap(), Some(true));
    let range =
        activity::get_daily_statistics(&mut c, "2026-10-27", "2026-10-30", Some(&b.id)).unwrap();
    assert!(range.days[0].book_goals.is_empty());
    assert_eq!(range.days[1].book_goals[0].state, "pending");
    assert_eq!(range.days[2].book_goals[0].state, "unscheduled");
    assert_eq!(range.days[3].book_goals[0].remaining_words, Some(10));
    assert!(matches!(
        save_on(&mut c, 0, &[], "2026-10-28"),
        Err(ScheduleError::Conflict)
    ));
    assert_eq!(read(&c).unwrap(), result);
    drop(c);
    drop(db);
    let db = database::open(dir.path()).unwrap();
    let c = db.lock().unwrap();
    assert_eq!(read(&c).unwrap(), result);
}
#[test]
fn changes_and_goal_edits_preserve_past_empty_dates_and_delete_retires_future_goals() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let b = book(&mut c, Some(10));
    let today = local_today().unwrap();
    let day = date(&today).unwrap();
    let earlier = (day - chrono::Duration::days(2))
        .format("%Y-%m-%d")
        .to_string();
    let later = (day + chrono::Duration::days(2))
        .format("%Y-%m-%d")
        .to_string();
    save_on(&mut c, 0, &[1, 2, 3, 4, 5], &earlier).unwrap();
    save_on(&mut c, 1, &[0, 6], &today).unwrap();
    let before = activity::get_daily_statistics(&mut c, &earlier, &today, None).unwrap();
    let changed = BookRepository::new(&mut c)
        .update(
            &b.id,
            &b.updated_at,
            BookDetails {
                title: b.title.clone(),
                target_word_count: None,
                daily_word_goal: Some(100),
                deadline: None,
            },
        )
        .unwrap();
    assert_eq!(
        activity::get_daily_statistics(&mut c, &earlier, &today, None).unwrap(),
        before
    );
    BookRepository::new(&mut c)
        .delete(&b.id, &changed.updated_at)
        .unwrap();
    let dates = activity::get_daily_statistics(&mut c, &today, &later, None).unwrap();
    assert_eq!(dates.days[0].book_goals[0].book_id, None);
    assert!(dates.days[1].book_goals.is_empty());
    assert!(dates.days[2].book_goals.is_empty());
}
#[test]
fn invalid_or_failed_schedule_writes_rollback_without_altering_history() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    book(&mut c, Some(1));
    for days in [vec![7], vec![1, 1], vec![0, 1, 2, 3, 4, 5, 6, 6]] {
        assert!(matches!(
            save_on(&mut c, 0, &days, "2026-10-28"),
            Err(ScheduleError::Validation)
        ));
    }
    assert!(matches!(
        save_on(&mut c, 0, &[], "9999-12-31"),
        Err(ScheduleError::Validation)
    ));
    c.execute_batch("CREATE TRIGGER reject_schedule BEFORE UPDATE ON writing_schedule_state BEGIN SELECT RAISE(ABORT,'test'); END;").unwrap();
    assert!(save_on(&mut c, 0, &[], "2026-10-28").is_err());
    assert!(read(&c).unwrap().history.is_empty());
    assert_eq!(
        c.query_row("SELECT count(*) FROM activity_goal_history", [], |r| r
            .get::<_, i64>(0))
            .unwrap(),
        0
    );
    c.execute_batch("DROP TRIGGER reject_schedule;").unwrap();
    let pause = save_on(&mut c, 0, &[], "2026-10-28").unwrap();
    assert!(pause.history.last().unwrap().weekdays.is_empty());
    assert!(matches!(
        save_on(&mut c, 1, &[1], "2026-10-27"),
        Err(ScheduleError::Validation)
    ));
}
#[test]
fn known_empty_misses_break_streaks_and_global_rest_is_neutral() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    book(&mut c, Some(1));
    save_on(&mut c, 0, &[1, 2, 3, 4, 5], "2026-10-23").unwrap();
    // Weekend dates are known rest even without an activity event.
    let rest = activity::get_current_streak(&mut c, "2026-10-26", None).unwrap();
    assert_eq!(
        (rest.days, rest.exact, rest.boundary),
        (0, true, "missed_day")
    );
    let range = activity::get_daily_statistics(&mut c, "2026-10-24", "2026-10-26", None).unwrap();
    assert_eq!(range.days[0].writing_day, Some(false));
    assert_eq!(range.days[1].book_goals[0].state, "unscheduled");
    assert_eq!(range.days[2].book_goals[0].state, "pending");
    assert_eq!(range.days[2].save_count, 0);
}

#[test]
fn committed_rest_writing_keeps_credit_and_skips_weekend_for_both_streaks() {
    use crate::chapters::{ChapterDetails, ChapterRepository};
    use serde_json::json;
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let b = book(&mut c, Some(1));
    save_on(&mut c, 0, &[1, 2, 3, 4, 5], "2026-10-22").unwrap();
    let mut chapter = ChapterRepository::new(&mut c)
        .create(
            &b.id,
            ChapterDetails {
                title: "Words".into(),
            },
        )
        .unwrap();
    for (day, text) in [
        ("2026-10-22", ""),
        ("2026-10-23", "one"),
        ("2026-10-24", "one two"),
        ("2026-10-26", "one two three"),
    ] {
        let nodes = if text.is_empty() {
            vec![]
        } else {
            vec![json!({"type":"text","text":text})]
        };
        let content=json!({"schemaVersion":1,"document":{"type":"doc","content":[{"type":"paragraph","content":nodes}]}}).to_string();
        let activity=json!({"policyVersion":1,"operationId":uuid::Uuid::new_v4().to_string(),"origin":"editor","segments":[{"context":{"localDate":day,"timeZone":"Etc/UTC","utcOffsetMinutes":0,"dailyWordGoal":999,"scheduled":true},"firstEditedAt":format!("{day}T12:00:00.000Z"),"lastEditedAt":format!("{day}T12:00:00.000Z"),"beforeWords":chapter.summary.word_count.unwrap(),"afterWords":text.split_whitespace().count()}]}).to_string();
        chapter = ChapterRepository::new(&mut c)
            .save_content_with_activity(
                &b.id,
                &chapter.summary.id,
                chapter.summary.revision,
                &content,
                &activity,
            )
            .unwrap();
    }
    let before = activity::get_daily_statistics(&mut c, "2026-10-22", "2026-10-26", None).unwrap();
    assert_eq!(before.days[2].credited_words, 1);
    assert_eq!(before.days[2].book_goals[0].state, "unscheduled");
    assert_eq!(before.days[1].book_goals[0].daily_word_goal, Some(1));
    let current = activity::get_current_streak(&mut c, "2026-10-27", None).unwrap();
    assert_eq!((current.days, current.exact), (2, true));
    let longest = activity::get_longest_streak(&mut c, "2026-10-27", None).unwrap();
    assert_eq!((longest.days, longest.exact), (2, true));
    save_on(&mut c, 1, &[], "2026-10-27").unwrap();
    assert_eq!(
        activity::get_daily_statistics(&mut c, "2026-10-22", "2026-10-26", None).unwrap(),
        before
    );
    let missed = activity::get_current_streak(&mut c, "2026-10-28", None).unwrap();
    assert_eq!((missed.days, missed.exact), (0, true));
    drop(c);
    drop(db);
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    assert_eq!(
        activity::get_longest_streak(&mut c, "2026-10-27", None).unwrap(),
        longest
    );
}

#[test]
fn new_books_get_goal_history_and_failed_metadata_updates_do_not_commit_either_side() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let today = local_today().unwrap();
    save_on(&mut c, 0, &[], &today).unwrap();
    let b = book(&mut c, Some(10));
    assert_eq!(goals(&c, &today, Some(&b.id)).unwrap()[0].2, Some(10));
    c.execute_batch("CREATE TRIGGER reject_goal BEFORE INSERT ON activity_goal_history BEGIN SELECT RAISE(ABORT,'test'); END;").unwrap();
    assert!(
        BookRepository::new(&mut c)
            .update(
                &b.id,
                &b.updated_at,
                BookDetails {
                    title: "Changed".into(),
                    target_word_count: None,
                    daily_word_goal: Some(50),
                    deadline: None
                }
            )
            .is_err()
    );
    assert_eq!(BookRepository::new(&mut c).get(&b.id).unwrap(), b);
    assert_eq!(
        c.query_row("SELECT count(*) FROM activity_goal_history", [], |r| r
            .get::<_, i64>(0))
            .unwrap(),
        1
    );
    c.execute_batch("DROP TRIGGER reject_goal; PRAGMA ignore_check_constraints=ON; UPDATE writing_schedule_history SET weekdays_mask=128;").unwrap();
    assert!(matches!(read(&c), Err(ScheduleError::InvalidStoredData)));
    assert!(matches!(
        activity::get_daily_statistics(&mut c, &today, &today, None),
        Err(ActivityError::InvalidStoredData)
    ));
}
