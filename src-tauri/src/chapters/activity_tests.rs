use super::*;
use crate::{
    books::{BookDetails, BookRepository},
    database,
};
use rusqlite::{Connection, params};
use serde_json::{Value, json};

fn seed(connection: &mut Connection) -> Chapter {
    let book = BookRepository::new(connection)
        .create(BookDetails {
            title: "Activity test".into(),
            target_word_count: None,
            daily_word_goal: Some(500),
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
fn body(text: &str) -> String {
    json!({"schemaVersion":1,"document":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":text}]}]}}).to_string()
}
fn submission(before: i64, after: i64) -> Value {
    json!({"policyVersion":1,"operationId":uuid::Uuid::new_v4().to_string(),"origin":"editor","segments":[{
        "context":{"localDate":"2026-10-28","timeZone":"Europe/Kyiv","utcOffsetMinutes":120,"dailyWordGoal":500,"scheduled":true},
        "firstEditedAt":"2026-10-28T10:00:00.000Z","lastEditedAt":"2026-10-28T10:01:00.000Z","beforeWords":before,"afterWords":after
    }]})
}
fn save(
    connection: &mut Connection,
    chapter: &Chapter,
    text: &str,
    activity: &Value,
) -> Result<Chapter, ChapterError> {
    ChapterRepository::new(connection).save_content_with_activity(
        &chapter.summary.book_id,
        &chapter.summary.id,
        chapter.summary.revision,
        &body(text),
        &activity.to_string(),
    )
}
fn counts(connection: &Connection) -> (i64, i64, i64, i64) {
    connection.query_row("SELECT (SELECT count(*) FROM activity_operations),(SELECT count(*) FROM writing_activity),(SELECT count(*) FROM activity_day_plans),coalesce((SELECT sum(credited_words) FROM writing_activity),0)",[],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?))).unwrap()
}

#[test]
fn calendar_context_matrix_retains_days_streaks_and_receipts_after_reopen() {
    let cases: Vec<Value> =
        serde_json::from_str(include_str!("../../../tests/fixtures/date-time-cases.json")).unwrap();
    for case in cases {
        let dir = tempfile::tempdir().unwrap();
        let db = database::open(dir.path()).unwrap();
        let mut connection = db.lock().unwrap();
        let chapter = seed(&mut connection);
        let points = case["points"].as_array().unwrap();
        let mut segments: Vec<Value> = Vec::new();
        for (index, point) in points.iter().enumerate() {
            let context = json!({"localDate":point["localDate"],"timeZone":point["timeZone"],"utcOffsetMinutes":point["offset"],"dailyWordGoal":1,"scheduled":true});
            if let Some(last) = segments
                .last_mut()
                .filter(|last| last["context"] == context)
            {
                last["afterWords"] = json!(index + 1);
                last["lastEditedAt"] = point["instant"].clone();
            } else {
                segments.push(json!({"context":context,"firstEditedAt":point["instant"],"lastEditedAt":point["instant"],"beforeWords":index,"afterWords":index+1}));
            }
        }
        let payload = json!({"policyVersion":1,"operationId":uuid::Uuid::new_v4().to_string(),"origin":"editor","segments":segments});
        let text = vec!["word"; points.len()].join(" ");
        let saved = save(&mut connection, &chapter, &text, &payload).unwrap();
        let expected = case["expectedDayCredits"].as_array().unwrap();
        let first_day = expected.first().unwrap()[0].as_str().unwrap();
        let last_day = expected.last().unwrap()[0].as_str().unwrap();
        let range = crate::activity::get_daily_statistics(
            &mut connection,
            first_day,
            last_day,
            Some(&chapter.summary.book_id),
        )
        .unwrap();
        assert_eq!(range.days.len(), expected.len(), "{}", case["name"]);
        for (day, expected_day) in range.days.iter().zip(expected) {
            assert_eq!(day.date, expected_day[0].as_str().unwrap());
            assert_eq!(day.credited_words, expected_day[1].as_i64().unwrap());
            assert_eq!(day.save_count, 1);
            assert_eq!(day.book_goals[0].daily_word_goal, Some(1));
            assert_eq!(day.book_goals[0].state, "reached");
        }
        for scope in [None, Some(chapter.summary.book_id.as_str())] {
            assert_eq!(
                crate::activity::get_current_streak(&mut connection, last_day, scope)
                    .unwrap()
                    .days,
                expected.len() as i64
            );
            let longest =
                crate::activity::get_longest_streak(&mut connection, last_day, scope).unwrap();
            assert_eq!(longest.days, expected.len() as i64);
            assert_eq!(longest.start_date.as_deref(), Some(first_day));
            assert_eq!(longest.end_date.as_deref(), Some(last_day));
            // Moving the current date backward excludes future labels, without rewriting them.
            assert_eq!(
                crate::activity::get_current_streak(&mut connection, first_day, scope)
                    .unwrap()
                    .days,
                1
            );
            assert_eq!(
                crate::activity::get_longest_streak(&mut connection, first_day, scope)
                    .unwrap()
                    .days,
                1
            );
        }
        let expected_counts = (
            1,
            case["expectedSegments"].as_i64().unwrap(),
            expected.len() as i64,
            points.len() as i64,
        );
        assert_eq!(counts(&connection), expected_counts);
        drop(connection);
        drop(db);
        let db = database::open(dir.path()).unwrap();
        let mut connection = db.lock().unwrap();
        assert_eq!(
            save(&mut connection, &chapter, &text, &payload).unwrap(),
            saved
        );
        assert_eq!(counts(&connection), expected_counts);
        assert_eq!(
            crate::activity::get_daily_statistics(
                &mut connection,
                first_day,
                last_day,
                Some(&chapter.summary.book_id)
            )
            .unwrap(),
            range
        );
    }
}

#[test]
fn wrong_quarter_hour_offset_sign_cannot_commit_content_or_activity() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut connection = db.lock().unwrap();
    let chapter = seed(&mut connection);
    let mut payload = submission(0, 1);
    let segment = &mut payload["segments"][0];
    segment["context"] = json!({"localDate":"2024-02-29","timeZone":"Asia/Kathmandu","utcOffsetMinutes":-345,"dailyWordGoal":1,"scheduled":true});
    segment["firstEditedAt"] = json!("2024-02-28T18:15:00.000Z");
    segment["lastEditedAt"] = segment["firstEditedAt"].clone();
    assert!(matches!(
        save(&mut connection, &chapter, "word", &payload),
        Err(ChapterError::Validation("invalid_activity"))
    ));
    assert_eq!(counts(&connection), (0, 0, 0, 0));
    assert_eq!(
        ChapterRepository::new(&mut connection)
            .get(&chapter.summary.book_id, &chapter.summary.id)
            .unwrap(),
        chapter
    );
    payload["segments"][0]["context"]["utcOffsetMinutes"] = json!(345);
    save(&mut connection, &chapter, "word", &payload).unwrap();
    assert_eq!(counts(&connection), (1, 1, 1, 1));
}

#[test]
fn content_activity_and_receipt_reopen_and_retry_without_double_credit() {
    let directory = tempfile::tempdir().unwrap();
    let db = database::open(directory.path()).unwrap();
    let mut connection = db.lock().unwrap();
    let chapter = seed(&mut connection);
    let activity = submission(0, 2);
    let saved = save(&mut connection, &chapter, "one two", &activity).unwrap();
    assert_eq!(saved.summary.word_count, Some(2));
    assert_eq!(counts(&connection), (1, 1, 1, 2));
    assert_eq!(
        save(&mut connection, &chapter, "one two", &activity).unwrap(),
        saved
    );
    assert_eq!(counts(&connection), (1, 1, 1, 2));
    drop(connection);
    drop(db);
    let db = database::open(directory.path()).unwrap();
    let mut connection = db.lock().unwrap();
    assert_eq!(
        save(&mut connection, &chapter, "one two", &activity).unwrap(),
        saved
    );
    assert_eq!(counts(&connection), (1, 1, 1, 2));
    assert!(matches!(
        save(&mut connection, &chapter, "different words", &activity),
        Err(ChapterError::Conflict)
    ));
    assert!(matches!(
        save(&mut connection, &chapter, "one two", &submission(0, 2)),
        Err(ChapterError::Conflict)
    ));
    let second = save(&mut connection, &saved, "new text", &submission(2, 2)).unwrap();
    assert!(matches!(
        save(&mut connection, &chapter, "one two", &activity),
        Err(ChapterError::Conflict)
    ));
    assert_eq!(
        ChapterRepository::new(&mut connection)
            .get(&second.summary.book_id, &second.summary.id)
            .unwrap(),
        second
    );
    assert_eq!(counts(&connection), (2, 2, 1, 2));
}

#[test]
fn edit_time_segments_split_midnight_and_preserve_deletion_and_sealed_plans() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut connection = db.lock().unwrap();
    let chapter = seed(&mut connection);
    let mut activity = submission(0, 2);
    activity["segments"][0]["context"] = json!({"localDate":"2026-10-27","timeZone":"Etc/UTC","utcOffsetMinutes":0,"dailyWordGoal":500,"scheduled":true});
    activity["segments"][0]["firstEditedAt"] = json!("2026-10-27T23:59:00.000Z");
    activity["segments"][0]["lastEditedAt"] = json!("2026-10-27T23:59:59.000Z");
    let mut second = submission(2, 1)["segments"][0].clone();
    second["context"]["dailyWordGoal"] = json!(600);
    activity["segments"].as_array_mut().unwrap().push(second);
    let saved = save(&mut connection, &chapter, "one", &activity).unwrap();
    assert_eq!(counts(&connection), (1, 2, 2, 2));
    let deleted: i64 = connection
        .query_row(
            "SELECT deleted_words FROM writing_activity WHERE segment_index=1",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(deleted, 1);
    let mut changed_goal = submission(1, 1);
    changed_goal["segments"][0]["context"]["dailyWordGoal"] = json!(1000);
    save(&mut connection, &saved, "new", &changed_goal).unwrap();
    let goal: i64 = connection
        .query_row(
            "SELECT daily_word_goal FROM activity_day_plans WHERE local_date='2026-10-28'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(goal, 600);
    assert_eq!(counts(&connection), (2, 3, 2, 2));
}

#[test]
fn failed_activity_or_deferred_commit_rolls_back_text_receipt_events_and_plans() {
    for deferred in [false, true] {
        let dir = tempfile::tempdir().unwrap();
        let db = database::open(dir.path()).unwrap();
        let mut connection = db.lock().unwrap();
        let chapter = seed(&mut connection);
        let activity = submission(0, 2);
        if deferred {
            connection.execute_batch("CREATE TABLE activity_failure_probe(id TEXT REFERENCES books(id) DEFERRABLE INITIALLY DEFERRED); CREATE TRIGGER fail_activity AFTER INSERT ON activity_day_plans BEGIN INSERT INTO activity_failure_probe VALUES ('missing'); END;").unwrap();
        } else {
            connection.execute_batch("CREATE TRIGGER fail_activity BEFORE INSERT ON activity_day_plans BEGIN SELECT RAISE(ABORT,'injected'); END;").unwrap();
        }
        assert!(matches!(
            save(&mut connection, &chapter, "one two", &activity),
            Err(ChapterError::Database(_))
        ));
        assert_eq!(counts(&connection), (0, 0, 0, 0));
        assert_eq!(
            ChapterRepository::new(&mut connection)
                .get(&chapter.summary.book_id, &chapter.summary.id)
                .unwrap(),
            chapter
        );
        connection
            .execute_batch("DROP TRIGGER fail_activity;")
            .unwrap();
        save(&mut connection, &chapter, "one two", &activity).unwrap();
        assert_eq!(counts(&connection), (1, 1, 1, 2));
    }
}

#[test]
fn deleting_sources_detaches_live_links_but_retains_history_and_retry_receipts() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut connection = db.lock().unwrap();
    let chapter = seed(&mut connection);
    let activity = submission(0, 2);
    let saved = save(&mut connection, &chapter, "one two", &activity).unwrap();
    ChapterRepository::new(&mut connection)
        .delete(
            &saved.summary.book_id,
            &saved.summary.id,
            saved.summary.revision,
        )
        .unwrap();
    let links: (Option<String>, Option<String>) = connection
        .query_row("SELECT book_id,chapter_id FROM writing_activity", [], |r| {
            Ok((r.get(0)?, r.get(1)?))
        })
        .unwrap();
    assert_eq!(links, (Some(chapter.summary.book_id.clone()), None));
    assert!(matches!(
        save(&mut connection, &chapter, "one two", &activity),
        Err(ChapterError::NotFound)
    ));
    connection
        .execute("DELETE FROM books WHERE id=?1", [&chapter.summary.book_id])
        .unwrap();
    let live:i64=connection.query_row("SELECT count(*) FROM writing_activity WHERE book_id IS NOT NULL OR chapter_id IS NOT NULL",[],|r|r.get(0)).unwrap();
    assert_eq!(live, 0);
    let plans: i64 = connection
        .query_row(
            "SELECT count(*) FROM activity_day_plans WHERE book_id IS NOT NULL",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(plans, 0);
    assert_eq!(counts(&connection), (1, 1, 1, 2));
}

#[test]
fn legacy_unknown_count_is_recomputed_without_crediting_existing_words() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut connection = db.lock().unwrap();
    let chapter = seed(&mut connection);
    let existing = ChapterRepository::new(&mut connection)
        .save_content(
            &chapter.summary.book_id,
            &chapter.summary.id,
            1,
            &body("old words"),
        )
        .unwrap();
    connection
        .execute(
            "UPDATE chapters SET word_count=NULL WHERE id=?1",
            [&chapter.summary.id],
        )
        .unwrap();
    save(
        &mut connection,
        &existing,
        "old words plus",
        &submission(2, 3),
    )
    .unwrap();
    assert_eq!(counts(&connection), (1, 1, 1, 1));
}

#[test]
fn imports_and_restores_have_no_credit_or_day_plan() {
    for origin in ["import", "restore"] {
        let dir = tempfile::tempdir().unwrap();
        let db = database::open(dir.path()).unwrap();
        let mut connection = db.lock().unwrap();
        let chapter = seed(&mut connection);
        let mut activity = submission(0, 2);
        activity["origin"] = json!(origin);
        save(&mut connection, &chapter, "one two", &activity).unwrap();
        assert_eq!(counts(&connection), (1, 1, 0, 0));
    }
}

#[test]
fn malformed_context_chain_limits_and_unknown_fields_never_write() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut connection = db.lock().unwrap();
    let chapter = seed(&mut connection);
    let valid = submission(0, 2);
    let mutations = [
        ("/policyVersion", json!(2)),
        ("/origin", json!("unknown")),
        ("/operationId", json!("invalid")),
        ("/segments/0/beforeWords", json!(1)),
        ("/segments/0/afterWords", json!(3)),
        ("/segments/0/context/localDate", json!("2026-10-27")),
        ("/segments/0/context/utcOffsetMinutes", json!(841)),
        ("/segments/0/context/dailyWordGoal", json!(0)),
        ("/segments/0/firstEditedAt", json!("2026-10-28T10:00:00Z")),
        ("/segments/0/context/timeZone", json!("bad zone")),
    ];
    for (path, value) in mutations {
        let mut activity = valid.clone();
        *activity.pointer_mut(path).unwrap() = value;
        assert!(
            save(&mut connection, &chapter, "one two", &activity).is_err(),
            "{path}"
        );
        assert_eq!(counts(&connection), (0, 0, 0, 0));
    }
    let mut extra = valid.clone();
    extra["forged"] = json!(1);
    assert!(save(&mut connection, &chapter, "one two", &extra).is_err());
    for length in [0, 129] {
        let mut activity = valid.clone();
        activity["segments"] = json!(vec![valid["segments"][0].clone(); length]);
        assert!(save(&mut connection, &chapter, "one two", &activity).is_err());
    }
    let mut chain = valid.clone();
    chain["segments"]
        .as_array_mut()
        .unwrap()
        .push(valid["segments"][0].clone());
    assert!(save(&mut connection, &chapter, "one two", &chain).is_err());
    let mut same_context = valid.clone();
    let mut repeated = valid["segments"][0].clone();
    repeated["beforeWords"] = json!(2);
    same_context["segments"]
        .as_array_mut()
        .unwrap()
        .push(repeated);
    assert!(save(&mut connection, &chapter, "one two", &same_context).is_err());
    let result = ChapterRepository::new(&mut connection).save_content_with_activity(
        &chapter.summary.book_id,
        &chapter.summary.id,
        1,
        &body("one two"),
        &" ".repeat(131073),
    );
    assert!(matches!(result, Err(ChapterError::LimitReached)));
    assert_eq!(counts(&connection), (0, 0, 0, 0));
    let unchanged = ChapterRepository::new(&mut connection)
        .get(&chapter.summary.book_id, &chapter.summary.id)
        .unwrap();
    assert_eq!(unchanged, chapter);
}

#[test]
fn concurrent_connections_recognize_the_same_receipt_but_reject_new_stale_operations() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let other = database::open(dir.path()).unwrap();
    let mut first = db.lock().unwrap();
    let mut second = other.lock().unwrap();
    let chapter = seed(&mut first);
    let activity = submission(0, 2);
    let saved = save(&mut first, &chapter, "one two", &activity).unwrap();
    assert_eq!(
        save(&mut second, &chapter, "one two", &activity).unwrap(),
        saved
    );
    assert!(matches!(
        save(&mut second, &chapter, "one two", &submission(0, 2)),
        Err(ChapterError::Conflict)
    ));
    assert_eq!(counts(&second), (1, 1, 1, 2));
    let raw = body("one two");
    let spaced =
        serde_json::to_string_pretty(&serde_json::from_str::<Value>(&raw).unwrap()).unwrap();
    assert_eq!(
        ChapterRepository::new(&mut second)
            .save_content_with_activity(
                &chapter.summary.book_id,
                &chapter.summary.id,
                1,
                &spaced,
                &activity.to_string()
            )
            .unwrap(),
        saved
    );
    let digest: String = second
        .query_row("SELECT payload_digest FROM activity_operations", [], |r| {
            r.get(0)
        })
        .unwrap();
    assert_eq!(digest.len(), 64);
    second
        .execute(
            "UPDATE activity_operations SET payload_digest=?1",
            params!["x".repeat(64)],
        )
        .unwrap();
    assert!(matches!(
        save(&mut second, &chapter, "one two", &activity),
        Err(ChapterError::InvalidStoredData)
    ));
}
