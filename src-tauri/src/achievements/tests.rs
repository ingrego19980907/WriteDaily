use super::*;
use crate::{
    books::{BookDetails, BookRepository},
    chapters::{Chapter, ChapterDetails, ChapterRepository},
    database,
};
use rusqlite::Connection;
use serde_json::{Value, json};

#[test]
fn notifications_claim_once_and_keep_unlocks_and_receipts_after_reopen() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let chapter = seed(&mut c);
    save(&mut c, &chapter, 100, &submission(100)).unwrap();
    let original = list(&c).unwrap();
    assert_eq!(claim_notifications(&mut c).unwrap(), original);
    assert!(claim_notifications(&mut c).unwrap().is_empty());
    let receipt = c
        .query_row(
            "SELECT disposition,claimed_at FROM achievement_notification_receipts",
            [],
            |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)),
        )
        .unwrap();
    assert_eq!(receipt.0, "claimed");
    assert!(parse_timestamp(&receipt.1).is_some());
    drop(c);
    drop(db);
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    assert!(claim_notifications(&mut c).unwrap().is_empty());
    assert_eq!(list(&c).unwrap(), original);
    assert_eq!(
        c.query_row(
            "SELECT disposition,claimed_at FROM achievement_notification_receipts",
            [],
            |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))
        )
        .unwrap(),
        receipt
    );
}

#[test]
fn failed_notification_insert_or_commit_keeps_writing_and_pending_unlocks_retryable() {
    for deferred in [false, true] {
        let dir = tempfile::tempdir().unwrap();
        let db = database::open(dir.path()).unwrap();
        let mut c = db.lock().unwrap();
        let chapter = seed(&mut c);
        let saved = save(&mut c, &chapter, 100, &submission(100)).unwrap();
        let original = list(&c).unwrap();
        if deferred {
            c.execute_batch("CREATE TABLE notification_commit_probe (book_id TEXT REFERENCES books(id) DEFERRABLE INITIALLY DEFERRED); CREATE TRIGGER fail_notification AFTER INSERT ON achievement_notification_receipts BEGIN INSERT INTO notification_commit_probe VALUES ('missing'); END;").unwrap();
        } else {
            c.execute_batch("CREATE TRIGGER fail_notification BEFORE INSERT ON achievement_notification_receipts BEGIN SELECT RAISE(ABORT,'injected failure'); END;").unwrap();
        }
        assert!(claim_notifications(&mut c).is_err());
        assert_eq!(list(&c).unwrap(), original);
        assert_eq!(
            ChapterRepository::new(&mut c)
                .get(&chapter.summary.book_id, &chapter.summary.id)
                .unwrap(),
            saved
        );
        assert_eq!(
            c.query_row(
                "SELECT count(*) FROM achievement_notification_receipts",
                [],
                |r| r.get::<_, i64>(0)
            )
            .unwrap(),
            0
        );
        c.execute_batch("DROP TRIGGER fail_notification").unwrap();
        assert_eq!(claim_notifications(&mut c).unwrap(), original);
    }
}

#[test]
fn concurrent_notification_consumers_claim_a_committed_id_only_once() {
    let dir = tempfile::tempdir().unwrap();
    let first = database::open(dir.path()).unwrap();
    let second = database::open(dir.path()).unwrap();
    {
        let mut c = first.lock().unwrap();
        let chapter = seed(&mut c);
        save(&mut c, &chapter, 100, &submission(100)).unwrap();
    }
    let barrier = std::sync::Arc::new(std::sync::Barrier::new(2));
    let handles = [first, second]
        .into_iter()
        .map(|db| {
            let barrier = barrier.clone();
            std::thread::spawn(move || {
                let mut c = db.lock().unwrap();
                barrier.wait();
                claim_notifications(&mut c).unwrap().len()
            })
        })
        .collect::<Vec<_>>();
    assert_eq!(
        handles
            .into_iter()
            .map(|handle| handle.join().unwrap())
            .sum::<usize>(),
        1
    );
}

#[test]
fn uncommitted_unlocks_are_never_claimed() {
    let dir = tempfile::tempdir().unwrap();
    let first = database::open(dir.path()).unwrap();
    let second = database::open(dir.path()).unwrap();
    let mut c = first.lock().unwrap();
    let mut other = second.lock().unwrap();
    other
        .busy_timeout(std::time::Duration::from_millis(10))
        .unwrap();
    let tx = c
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .unwrap();
    tx.execute(
        "INSERT INTO achievement_unlocks VALUES ('first_words',1,'2026-10-29T10:00:00.000Z')",
        [],
    )
    .unwrap();
    assert!(claim_notifications(&mut other).is_err());
    tx.rollback().unwrap();
    assert!(claim_notifications(&mut other).unwrap().is_empty());
}

#[test]
fn malformed_notification_receipts_fail_without_repairing_or_replaying_unlocks() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let chapter = seed(&mut c);
    save(&mut c, &chapter, 100, &submission(100)).unwrap();
    let original = list(&c).unwrap();
    c.execute("INSERT INTO achievement_notification_receipts VALUES ('first_words','claimed','2026-02-30T10:00:00.000Z')",[]).unwrap();
    assert!(matches!(
        claim_notifications(&mut c),
        Err(AchievementError::InvalidStoredData)
    ));
    assert_eq!(list(&c).unwrap(), original);
    assert_eq!(
        c.query_row(
            "SELECT claimed_at FROM achievement_notification_receipts",
            [],
            |r| r.get::<_, String>(0)
        )
        .unwrap(),
        "2026-02-30T10:00:00.000Z"
    );
}

fn seed(c: &mut Connection) -> Chapter {
    let book = BookRepository::new(c)
        .create(BookDetails {
            title: "Досягнення".into(),
            target_word_count: Some(100),
            daily_word_goal: Some(100),
            deadline: None,
        })
        .unwrap();
    ChapterRepository::new(c)
        .create(
            &book.id,
            ChapterDetails {
                title: "Розділ".into(),
            },
        )
        .unwrap()
}
fn body(words: usize) -> String {
    let content = if words == 0 {
        vec![]
    } else {
        vec![json!({"type":"text","text":vec!["word"; words].join(" ")})]
    };
    json!({"schemaVersion":1,"document":{"type":"doc","content":[{"type":"paragraph","content":content}]}}).to_string()
}
fn submission(words: usize) -> String {
    json!({"policyVersion":1,"operationId":uuid::Uuid::new_v4().to_string(),"origin":"editor","segments":[{
        "context":{"localDate":"2024-02-29","timeZone":"Etc/UTC","utcOffsetMinutes":0,"dailyWordGoal":100,"scheduled":true},
        "firstEditedAt":"2024-02-29T12:00:00.000Z","lastEditedAt":"2024-02-29T12:00:00.000Z","beforeWords":0,"afterWords":words
    }]}).to_string()
}
fn save(
    c: &mut Connection,
    chapter: &Chapter,
    words: usize,
    packet: &str,
) -> Result<Chapter, crate::chapters::ChapterError> {
    ChapterRepository::new(c).save_content_with_activity(
        &chapter.summary.book_id,
        &chapter.summary.id,
        chapter.summary.revision,
        &body(words),
        packet,
    )
}

/// Disposable DB fixture for counts beyond document limits and historical upgrade
/// cases. Real saves/retries/rollbacks are exercised through ChapterRepository.
fn event(
    c: &Connection,
    chapter: &Chapter,
    day: &str,
    words: i64,
    target: Option<i64>,
    scheduled: bool,
    origin: &str,
) {
    let operation = uuid::Uuid::new_v4().to_string();
    c.execute(
        "INSERT INTO activity_operations VALUES (?1,1,?2,?3,?4,1,2,?5,?6)",
        params![
            operation,
            origin,
            chapter.summary.book_id,
            chapter.summary.id,
            "a".repeat(64),
            format!("{day}T12:00:00.000Z")
        ],
    )
    .unwrap();
    c.execute(
        "INSERT INTO writing_activity VALUES (?1,0,?2,?3,?4,'Etc/UTC',0,?5,?5,0,?6,?6,0,?7,?8,?9)",
        params![
            operation,
            chapter.summary.book_id,
            chapter.summary.id,
            day,
            format!("{day}T12:00:00.000Z"),
            words,
            if origin == "editor" { words } else { 0 },
            target,
            scheduled
        ],
    )
    .unwrap();
    if origin == "editor" {
        c.execute("INSERT INTO activity_day_plans VALUES (?1,?2,?1,?3,?4,1) ON CONFLICT(source_book_id,local_date) DO NOTHING", params![chapter.summary.book_id,day,target,scheduled]).unwrap();
    }
}
fn on(c: &mut Connection, today: &str) -> Result<AchievementRefresh, AchievementError> {
    let tx = c.transaction_with_behavior(TransactionBehavior::Immediate)?;
    let result = reconcile(&tx, today)?;
    tx.commit()?;
    Ok(result)
}
fn ids(c: &Connection) -> Vec<String> {
    list(c)
        .unwrap()
        .into_iter()
        .map(|item| item.achievement_id)
        .collect()
}

#[test]
fn native_catalog_matches_frontend_fixture() {
    let expected: Value = serde_json::from_str(include_str!(
        "../../../tests/fixtures/achievement-rules.json"
    ))
    .unwrap();
    assert_eq!(serde_json::to_value(&RULES).unwrap(), expected);
}

#[test]
fn real_save_retry_and_reopen_keep_one_unlock_and_original_insertion_time() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let chapter = seed(&mut c);
    let packet = submission(100);
    let saved = save(&mut c, &chapter, 100, &packet).unwrap();
    assert_eq!(ids(&c), ["first_words"]);
    assert!(refresh(&mut c).unwrap().newly_unlocked.is_empty());
    c.execute(
        "UPDATE achievement_unlocks SET unlocked_at='2000-01-01T00:00:00.000Z'",
        [],
    )
    .unwrap();
    let original = list(&c).unwrap();
    assert_eq!(save(&mut c, &chapter, 100, &packet).unwrap(), saved);
    assert_eq!(list(&c).unwrap(), original);
    drop(c);
    drop(db);
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    assert_eq!(list(&c).unwrap(), original);
    assert_eq!(save(&mut c, &chapter, 100, &packet).unwrap(), saved);
    assert!(refresh(&mut c).unwrap().newly_unlocked.is_empty());
    assert_eq!(
        c.query_row("SELECT count(*) FROM activity_operations", [], |r| r
            .get::<_, i64>(0))
            .unwrap(),
        1
    );
}

#[test]
fn achievement_statement_or_commit_failure_rolls_back_text_receipt_and_unlocks() {
    for deferred in [false, true] {
        let dir = tempfile::tempdir().unwrap();
        let db = database::open(dir.path()).unwrap();
        let mut c = db.lock().unwrap();
        let chapter = seed(&mut c);
        let packet = submission(100);
        if deferred {
            c.execute_batch("CREATE TABLE commit_probe (book_id TEXT REFERENCES books(id) DEFERRABLE INITIALLY DEFERRED); CREATE TRIGGER achievement_failure AFTER INSERT ON achievement_unlocks BEGIN INSERT INTO commit_probe VALUES ('missing'); END;").unwrap();
        } else {
            c.execute_batch("CREATE TRIGGER achievement_failure BEFORE INSERT ON achievement_unlocks BEGIN SELECT RAISE(ABORT,'injected unlock failure'); END;").unwrap();
        }
        assert!(save(&mut c, &chapter, 100, &packet).is_err());
        assert_eq!(
            ChapterRepository::new(&mut c)
                .get(&chapter.summary.book_id, &chapter.summary.id)
                .unwrap(),
            chapter
        );
        for table in [
            "achievement_unlocks",
            "writing_activity",
            "activity_operations",
            "activity_day_plans",
        ] {
            assert_eq!(
                c.query_row(&format!("SELECT count(*) FROM {table}"), [], |r| r
                    .get::<_, i64>(0))
                    .unwrap(),
                0
            );
        }
        c.execute_batch("DROP TRIGGER achievement_failure").unwrap();
        save(&mut c, &chapter, 100, &packet).unwrap();
        assert_eq!(ids(&c), ["first_words"]);
    }
}

#[test]
fn version_six_history_discovers_unlocks_once_on_upgrade_without_rewriting_writing() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let chapter = seed(&mut c);
    let saved = save(&mut c, &chapter, 100, &submission(100)).unwrap();
    // Construct the exact previous schema in this disposable fixture only.
    c.execute_batch("DROP TABLE achievement_notification_receipts; DROP TABLE achievement_unlocks; PRAGMA user_version=6;")
        .unwrap();
    let history = c
        .query_row(
            "SELECT operation_id,credited_words FROM writing_activity",
            [],
            |r| Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?)),
        )
        .unwrap();
    drop(c);
    drop(db);
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    assert_eq!(ids(&c), ["first_words"]);
    assert_eq!(
        ChapterRepository::new(&mut c)
            .get(&chapter.summary.book_id, &chapter.summary.id)
            .unwrap(),
        saved
    );
    assert_eq!(
        c.query_row(
            "SELECT operation_id,credited_words FROM writing_activity",
            [],
            |r| Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?))
        )
        .unwrap(),
        history
    );
    assert!(refresh(&mut c).unwrap().newly_unlocked.is_empty());
}

#[test]
fn upgrade_discovery_and_native_word_aggregation_obey_every_boundary() {
    for (index, threshold) in [100, 1_000, 10_000, 50_000].iter().enumerate() {
        for offset in [-1, 0, 1] {
            let dir = tempfile::tempdir().unwrap();
            let db = database::open(dir.path()).unwrap();
            let mut c = db.lock().unwrap();
            let chapter = seed(&mut c);
            event(
                &c,
                &chapter,
                "2024-02-29",
                threshold + offset,
                None,
                true,
                "editor",
            );
            on(&mut c, "2024-02-29").unwrap();
            assert_eq!(ids(&c).contains(&RULES[index].id.to_string()), offset >= 0);
            assert!(on(&mut c, "2024-02-29").unwrap().newly_unlocked.is_empty());
        }
    }
}

#[test]
fn cumulative_distinct_days_and_book_goals_span_years_and_deleted_sources() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let first = seed(&mut c);
    let second = seed(&mut c);
    for index in 0..30 {
        let day = chrono::NaiveDate::from_ymd_opt(2022, 1, 1).unwrap()
            + chrono::Duration::days(index * 20);
        let day = day.to_string();
        event(&c, &first, &day, 1, Some(1), true, "editor");
        if index < 5 {
            event(&c, &second, &day, 1, Some(1), true, "editor");
        }
    }
    // Multiple segments on one date cannot multiply its book goal or day.
    event(&c, &first, "2022-01-01", 1, Some(1), true, "editor");
    let before = on(&mut c, "2022-03-22").unwrap(); // five dates, ten book goals
    assert_eq!(
        before
            .unlocks
            .iter()
            .map(|x| x.achievement_id.as_str())
            .collect::<Vec<_>>(),
        ["goal_keeper"]
    );
    for (index, expected) in [(5, false), (6, true)] {
        let day = (chrono::NaiveDate::from_ymd_opt(2022, 1, 1).unwrap()
            + chrono::Duration::days(index * 20))
        .to_string();
        on(&mut c, &day).unwrap();
        assert_eq!(ids(&c).contains(&"consistency".to_string()), expected);
    }
    let twenty_nine = (chrono::NaiveDate::from_ymd_opt(2022, 1, 1).unwrap()
        + chrono::Duration::days(28 * 20))
    .to_string();
    on(&mut c, &twenty_nine).unwrap();
    assert!(!ids(&c).contains(&"dedicated_writer".to_string()));
    on(&mut c, "2024-02-29").unwrap();
    assert_eq!(ids(&c), ["consistency", "dedicated_writer", "goal_keeper"]);
    let original = list(&c).unwrap();
    let book = books::load(&c, &first.summary.book_id).unwrap();
    BookRepository::new(&mut c)
        .delete(&book.id, &book.updated_at)
        .unwrap();
    assert_eq!(list(&c).unwrap(), original);
    assert!(on(&mut c, "2021-12-31").unwrap().newly_unlocked.is_empty());
    assert_eq!(list(&c).unwrap(), original);
}

#[test]
fn future_dates_imports_unconfigured_goals_and_rest_never_fabricate_unlocks() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let chapter = seed(&mut c);
    event(&c, &chapter, "2024-02-28", 50_000, None, true, "import");
    event(&c, &chapter, "2024-02-28", 50_000, None, true, "restore");
    event(&c, &chapter, "2024-02-28", 99, None, false, "editor");
    event(&c, &chapter, "2024-02-29", 50_000, Some(1), true, "editor");
    assert!(on(&mut c, "2024-02-28").unwrap().unlocks.is_empty());
    let reached = on(&mut c, "2024-02-29").unwrap();
    assert_eq!(reached.unlocks.len(), 4);
    assert_eq!(reached.newly_unlocked.len(), 4);
    let original = list(&c).unwrap();
    on(&mut c, "2024-02-28").unwrap();
    assert_eq!(list(&c).unwrap(), original);
}

#[test]
fn safe_individual_counts_can_prove_thresholds_without_an_unsafe_lifetime_sum() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let chapter = seed(&mut c);
    event(
        &c,
        &chapter,
        "2024-02-28",
        crate::chapters::MAX_SAFE_INTEGER,
        None,
        true,
        "editor",
    );
    event(
        &c,
        &chapter,
        "2024-02-29",
        crate::chapters::MAX_SAFE_INTEGER,
        None,
        true,
        "editor",
    );
    assert_eq!(on(&mut c, "2024-02-29").unwrap().unlocks.len(), 4);
    // Later invalid evidence must not be hidden by saturated earlier thresholds.
    c.execute("UPDATE activity_operations SET payload_digest=?1 WHERE operation_id=(SELECT operation_id FROM writing_activity WHERE local_date='2024-02-29')", ["z".repeat(64)]).unwrap();
    assert!(on(&mut c, "2024-02-29").is_err());
    assert_eq!(list(&c).unwrap().len(), 4);
}

#[test]
fn explicit_completion_is_preserved_before_delete_but_target_alone_never_counts() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let chapter = seed(&mut c);
    save(&mut c, &chapter, 100, &submission(100)).unwrap();
    assert!(!ids(&c).contains(&"the_end".to_string()));
    c.execute(
        "UPDATE books SET completed_at=created_at WHERE id=?1",
        [&chapter.summary.book_id],
    )
    .unwrap();
    let book = books::load(&c, &chapter.summary.book_id).unwrap();
    c.execute_batch("CREATE TRIGGER block_completion_unlock BEFORE INSERT ON achievement_unlocks WHEN NEW.achievement_id='the_end' BEGIN SELECT RAISE(ABORT,'injected failure'); END;").unwrap();
    assert!(
        BookRepository::new(&mut c)
            .delete(&book.id, &book.updated_at)
            .is_err()
    );
    assert!(books::load(&c, &book.id).is_ok());
    assert_eq!(ids(&c), ["first_words"]);
    c.execute_batch("DROP TRIGGER block_completion_unlock")
        .unwrap();
    BookRepository::new(&mut c)
        .delete(&book.id, &book.updated_at)
        .unwrap();
    assert_eq!(ids(&c), ["first_words", "the_end"]);
    assert!(
        c.query_row("SELECT book_id IS NULL FROM writing_activity", [], |r| r
            .get::<_, bool>(
            0
        ))
        .unwrap()
    );
    let original = list(&c).unwrap();
    drop(c);
    drop(db);
    let db = database::open(dir.path()).unwrap();
    assert_eq!(list(&db.lock().unwrap()).unwrap(), original);
}

#[test]
fn concurrent_connections_insert_each_identity_once() {
    let dir = tempfile::tempdir().unwrap();
    let first = database::open(dir.path()).unwrap();
    let second = database::open(dir.path()).unwrap();
    {
        let mut c = first.lock().unwrap();
        let chapter = seed(&mut c);
        event(&c, &chapter, "2024-02-29", 100, None, true, "editor");
    }
    let barrier = std::sync::Arc::new(std::sync::Barrier::new(2));
    let handles = [first, second]
        .into_iter()
        .map(|db| {
            let barrier = barrier.clone();
            std::thread::spawn(move || {
                let mut c = db.lock().unwrap();
                barrier.wait();
                refresh(&mut c).unwrap().newly_unlocked.len()
            })
        })
        .collect::<Vec<_>>();
    assert_eq!(
        handles
            .into_iter()
            .map(|handle| handle.join().unwrap())
            .sum::<usize>(),
        1
    );
    let db = database::open(dir.path()).unwrap();
    assert_eq!(ids(&db.lock().unwrap()), ["first_words"]);
}

#[test]
fn sqlite_identity_constraints_and_corrupt_rows_never_masquerade_as_success() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    for (id, version, time) in [
        ("bad", 1, "2024-01-01T00:00:00.000Z"),
        ("first_words", 2, "2024-01-01T00:00:00.000Z"),
        ("first_words", 1, "invalid"),
    ] {
        assert!(
            c.execute(
                "INSERT INTO achievement_unlocks VALUES (?1,?2,?3)",
                params![id, version, time]
            )
            .is_err()
        );
    }
    c.execute_batch("PRAGMA ignore_check_constraints=ON; INSERT INTO achievement_unlocks VALUES ('first_words',1,'2024-02-30T00:00:00.000Z'); PRAGMA ignore_check_constraints=OFF;").unwrap();
    assert!(matches!(list(&c), Err(AchievementError::InvalidStoredData)));
    assert!(refresh(&mut c).is_err());
    assert_eq!(
        c.query_row("SELECT unlocked_at FROM achievement_unlocks", [], |r| {
            r.get::<_, String>(0)
        })
        .unwrap(),
        "2024-02-30T00:00:00.000Z"
    );
}

#[test]
fn native_scheduled_day_thresholds_cover_below_exact_and_above_with_gaps() {
    for (id, threshold) in [("consistency", 7), ("dedicated_writer", 30)] {
        for offset in [-1, 0, 1] {
            let dir = tempfile::tempdir().unwrap();
            let db = database::open(dir.path()).unwrap();
            let mut c = db.lock().unwrap();
            let chapter = seed(&mut c);
            for index in 0..threshold + offset {
                let day = (chrono::NaiveDate::from_ymd_opt(2024, 1, 1).unwrap()
                    + chrono::Duration::days(index * 2))
                .to_string();
                event(&c, &chapter, &day, 1, Some(1), true, "editor");
            }
            let result = on(&mut c, "2024-12-31").unwrap();
            assert_eq!(
                result.unlocks.iter().any(|row| row.achievement_id == id),
                offset >= 0,
                "{id} at {threshold} plus {offset}"
            );
            assert!(on(&mut c, "2024-12-31").unwrap().newly_unlocked.is_empty());
        }
    }
}

#[test]
fn native_goal_keeper_counts_nine_ten_eleven_book_goals_on_one_date() {
    for count in [9, 10, 11] {
        let dir = tempfile::tempdir().unwrap();
        let db = database::open(dir.path()).unwrap();
        let mut c = db.lock().unwrap();
        for _ in 0..count {
            let chapter = seed(&mut c);
            event(&c, &chapter, "2024-02-29", 1, Some(1), true, "editor");
        }
        on(&mut c, "2024-02-29").unwrap();
        // Eleven goals on one local date still cannot earn seven completed days.
        assert_eq!(
            ids(&c),
            if count < 10 {
                vec![]
            } else {
                vec!["goal_keeper"]
            },
            "{count} distinct book/date goals"
        );
    }
}

#[test]
fn native_the_end_requires_explicit_completion_for_zero_one_or_many_books() {
    for completed in [0, 1, 2] {
        let dir = tempfile::tempdir().unwrap();
        let db = database::open(dir.path()).unwrap();
        let mut c = db.lock().unwrap();
        for index in 0..2 {
            let chapter = seed(&mut c);
            if index < completed {
                // Fixture-only: ACH.1 has no production completion command yet.
                c.execute(
                    "UPDATE books SET completed_at=created_at WHERE id=?1",
                    [&chapter.summary.book_id],
                )
                .unwrap();
            }
        }
        let result = refresh(&mut c).unwrap();
        assert_eq!(
            ids(&c),
            if completed == 0 {
                vec![]
            } else {
                vec!["the_end"]
            }
        );
        assert_eq!(result.newly_unlocked.len(), usize::from(completed > 0));
        assert!(refresh(&mut c).unwrap().newly_unlocked.is_empty());
        assert_eq!(claim_notifications(&mut c).unwrap(), result.unlocks);
        assert!(claim_notifications(&mut c).unwrap().is_empty());
    }
}

#[test]
fn ten_chapters_share_one_book_date_goal_instead_of_unlocking_goal_keeper() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let first = seed(&mut c);
    for index in 0..10 {
        let chapter = if index == 0 {
            first.clone()
        } else {
            ChapterRepository::new(&mut c)
                .create(
                    &first.summary.book_id,
                    ChapterDetails {
                        title: format!("Розділ {index}"),
                    },
                )
                .unwrap()
        };
        save(&mut c, &chapter, 10, &submission(10)).unwrap();
    }
    assert_eq!(ids(&c), ["first_words"]);
    assert_eq!(claim_notifications(&mut c).unwrap(), list(&c).unwrap());
    assert_eq!(
        c.query_row("SELECT count(*) FROM activity_day_plans", [], |r| r
            .get::<_, i64>(0))
            .unwrap(),
        1
    );
}

/// Historical fixture for all eight rules; SQL completion is test evidence only.
/// Save/operation idempotency is separately exercised through real repositories.
fn all_rule_evidence(c: &Connection, chapter: &Chapter) {
    for index in 0..30 {
        let day = (chrono::NaiveDate::from_ymd_opt(2024, 1, 1).unwrap()
            + chrono::Duration::days(index * 2))
        .to_string();
        event(
            c,
            chapter,
            &day,
            if index == 0 { 50_000 } else { 1 },
            Some(1),
            true,
            "editor",
        );
    }
    c.execute(
        "UPDATE books SET completed_at=created_at WHERE id=?1",
        [&chapter.summary.book_id],
    )
    .unwrap();
}

#[test]
fn all_eight_unlocks_and_unclaimed_notices_survive_source_deletion_and_reopen() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let chapter = seed(&mut c);
    all_rule_evidence(&c, &chapter);
    let result = refresh(&mut c).unwrap();
    assert_eq!(result.newly_unlocked.len(), 8);
    assert_eq!(
        ids(&c),
        [
            "consistency",
            "dedicated_writer",
            "first_words",
            "getting_started",
            "goal_keeper",
            "novelist",
            "storyteller",
            "the_end"
        ]
    );
    let book = books::load(&c, &chapter.summary.book_id).unwrap();
    BookRepository::new(&mut c)
        .delete(&book.id, &book.updated_at)
        .unwrap();
    assert_eq!(list(&c).unwrap(), result.unlocks);
    assert_eq!(
        c.query_row(
            "SELECT count(*) FROM writing_activity WHERE book_id IS NULL",
            [],
            |r| r.get::<_, i64>(0)
        )
        .unwrap(),
        30
    );
    drop(c);
    drop(db);

    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    assert_eq!(list(&c).unwrap(), result.unlocks);
    assert_eq!(claim_notifications(&mut c).unwrap(), result.unlocks);
    assert!(refresh(&mut c).unwrap().newly_unlocked.is_empty());
    drop(c);
    drop(db);

    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    assert_eq!(list(&c).unwrap(), result.unlocks);
    assert!(claim_notifications(&mut c).unwrap().is_empty());
    assert_eq!(
        c.query_row(
            "SELECT count(*) FROM achievement_notification_receipts",
            [],
            |r| r.get::<_, i64>(0)
        )
        .unwrap(),
        8
    );
}

#[test]
fn late_unlock_batch_failures_preserve_prior_unlock_receipt_and_saved_text() {
    for deferred in [false, true] {
        let dir = tempfile::tempdir().unwrap();
        let db = database::open(dir.path()).unwrap();
        let mut c = db.lock().unwrap();
        let chapter = seed(&mut c);
        let saved = save(&mut c, &chapter, 100, &submission(100)).unwrap();
        let original = claim_notifications(&mut c).unwrap();
        all_rule_evidence(&c, &chapter);
        if deferred {
            c.execute_batch("CREATE TABLE batch_commit_probe (book_id TEXT REFERENCES books(id) DEFERRABLE INITIALLY DEFERRED); CREATE TRIGGER fail_batch AFTER INSERT ON achievement_unlocks WHEN NEW.achievement_id='the_end' BEGIN INSERT INTO batch_commit_probe VALUES ('missing'); END;").unwrap();
        } else {
            c.execute_batch("CREATE TRIGGER fail_batch BEFORE INSERT ON achievement_unlocks WHEN NEW.achievement_id='the_end' BEGIN SELECT RAISE(ABORT,'late batch failure'); END;").unwrap();
        }
        assert!(refresh(&mut c).is_err());
        // Earlier inserts in this batch must roll back; the old claim stays intact.
        assert_eq!(list(&c).unwrap(), original);
        assert!(claim_notifications(&mut c).unwrap().is_empty());
        assert_eq!(
            ChapterRepository::new(&mut c)
                .get(&chapter.summary.book_id, &chapter.summary.id)
                .unwrap(),
            saved
        );
        c.execute_batch("DROP TRIGGER fail_batch").unwrap();
        let recovered = refresh(&mut c).unwrap();
        assert_eq!(recovered.unlocks.len(), 8);
        assert_eq!(recovered.newly_unlocked.len(), 7);
        assert_eq!(
            recovered
                .unlocks
                .iter()
                .find(|row| row.achievement_id == "first_words"),
            original.first()
        );
        let claimed = claim_notifications(&mut c).unwrap();
        assert_eq!(claimed.len(), 7);
        assert!(
            !claimed
                .iter()
                .any(|row| row.achievement_id == "first_words")
        );
        assert!(claim_notifications(&mut c).unwrap().is_empty());
    }
}

#[test]
fn late_notification_batch_failure_rolls_back_every_new_receipt() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let chapter = seed(&mut c);
    all_rule_evidence(&c, &chapter);
    let original = refresh(&mut c).unwrap().unlocks;
    c.execute_batch("CREATE TRIGGER fail_notice_batch BEFORE INSERT ON achievement_notification_receipts WHEN NEW.achievement_id='the_end' BEGIN SELECT RAISE(ABORT,'late receipt failure'); END;").unwrap();
    assert!(claim_notifications(&mut c).is_err());
    assert_eq!(list(&c).unwrap(), original);
    assert_eq!(
        c.query_row(
            "SELECT count(*) FROM achievement_notification_receipts",
            [],
            |r| r.get::<_, i64>(0)
        )
        .unwrap(),
        0
    );
    c.execute_batch("DROP TRIGGER fail_notice_batch").unwrap();
    assert_eq!(claim_notifications(&mut c).unwrap(), original);
    assert!(claim_notifications(&mut c).unwrap().is_empty());
}

#[test]
fn upgrade_suppresses_old_unlock_only_and_later_real_save_notifies_new_threshold() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let first = seed(&mut c);
    save(&mut c, &first, 100, &submission(100)).unwrap();
    let old = list(&c).unwrap();
    // Construct v7 only in this disposable database, preserving real saved history.
    c.execute_batch("DROP TABLE achievement_notification_receipts; PRAGMA user_version=7;")
        .unwrap();
    drop(c);
    drop(db);

    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    assert!(claim_notifications(&mut c).unwrap().is_empty());
    let second = seed(&mut c);
    save(&mut c, &second, 900, &submission(900)).unwrap();
    let fresh = claim_notifications(&mut c).unwrap();
    assert_eq!(fresh.len(), 1);
    assert_eq!(fresh[0].achievement_id, "getting_started");
    assert_eq!(
        list(&c)
            .unwrap()
            .iter()
            .find(|row| row.achievement_id == "first_words"),
        old.first()
    );
    assert_eq!(
        c.query_row("SELECT disposition,claimed_at FROM achievement_notification_receipts WHERE achievement_id='first_words'", [], |r| Ok((r.get::<_, String>(0)?, r.get::<_, Option<String>>(1)?))).unwrap(),
        ("baseline".into(), None)
    );
    assert!(claim_notifications(&mut c).unwrap().is_empty());
}
