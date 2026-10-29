use crate::{
    activity::{
        ActivityError,
        statistics::{date, read_daily_statistics},
    },
    books::{
        self, BookError,
        validation::{parse_timestamp, timestamp},
    },
};
use rusqlite::{Connection, Transaction, TransactionBehavior, params};
use serde::Serialize;

mod notifications;
pub use notifications::claim_notifications;

#[derive(Clone, Copy, Debug, Serialize)]
#[serde(rename_all = "snake_case")]
enum Metric {
    CreditedWords,
    CompletedScheduledDays,
    CompletedDailyGoals,
    ExplicitlyCompletedBooks,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Rule {
    id: &'static str,
    metric: Metric,
    threshold: i64,
    policy_version: i64,
}

const RULES: [Rule; 8] = [
    Rule {
        id: "first_words",
        metric: Metric::CreditedWords,
        threshold: 100,
        policy_version: 1,
    },
    Rule {
        id: "getting_started",
        metric: Metric::CreditedWords,
        threshold: 1_000,
        policy_version: 1,
    },
    Rule {
        id: "storyteller",
        metric: Metric::CreditedWords,
        threshold: 10_000,
        policy_version: 1,
    },
    Rule {
        id: "novelist",
        metric: Metric::CreditedWords,
        threshold: 50_000,
        policy_version: 1,
    },
    Rule {
        id: "consistency",
        metric: Metric::CompletedScheduledDays,
        threshold: 7,
        policy_version: 1,
    },
    Rule {
        id: "dedicated_writer",
        metric: Metric::CompletedScheduledDays,
        threshold: 30,
        policy_version: 1,
    },
    Rule {
        id: "goal_keeper",
        metric: Metric::CompletedDailyGoals,
        threshold: 10,
        policy_version: 1,
    },
    Rule {
        id: "the_end",
        metric: Metric::ExplicitlyCompletedBooks,
        threshold: 1,
        policy_version: 1,
    },
];

#[derive(Default)]
struct Counts {
    words: i64,
    days: i64,
    goals: i64,
    books: i64,
}
impl Counts {
    fn value(&self, metric: Metric) -> i64 {
        match metric {
            Metric::CreditedWords => self.words,
            Metric::CompletedScheduledDays => self.days,
            Metric::CompletedDailyGoals => self.goals,
            Metric::ExplicitlyCompletedBooks => self.books,
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum AchievementError {
    #[error("Stored achievement data is invalid")]
    InvalidStoredData,
    #[error("Could not read achievement activity: {0}")]
    Activity(#[from] ActivityError),
    #[error("Could not read achievement book evidence: {0}")]
    Book(#[from] BookError),
    #[error("Achievement persistence failed: {0}")]
    Database(#[from] rusqlite::Error),
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AchievementUnlock {
    pub achievement_id: String,
    pub rule_policy_version: i64,
    pub unlocked_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AchievementRefresh {
    pub unlocks: Vec<AchievementUnlock>,
    pub newly_unlocked: Vec<AchievementUnlock>,
}

/// Read-only. A failed/corrupt read is never an empty successful collection.
pub fn list(c: &Connection) -> Result<Vec<AchievementUnlock>, AchievementError> {
    let mut statement = c.prepare("SELECT achievement_id, rule_policy_version, unlocked_at FROM achievement_unlocks ORDER BY achievement_id")?;
    let mut result = Vec::new();
    for row in statement.query_map([], |row| {
        Ok(AchievementUnlock {
            achievement_id: row.get(0)?,
            rule_policy_version: row.get(1)?,
            unlocked_at: row.get(2)?,
        })
    })? {
        let unlock = row?;
        if !RULES.iter().any(|rule| {
            rule.id == unlock.achievement_id && rule.policy_version == unlock.rule_policy_version
        }) || parse_timestamp(&unlock.unlocked_at).is_none()
        {
            return Err(AchievementError::InvalidStoredData);
        }
        result.push(unlock);
    }
    Ok(result)
}

/// Distinct activity dates suffice: a positive daily goal cannot be reached on
/// an empty date. Reuse authoritative activity validation, without scanning years
/// of empty calendar days or summing counters in SQLite.
fn counts(c: &Connection, today: &str) -> Result<Counts, AchievementError> {
    if date(today).is_none() {
        return Err(AchievementError::InvalidStoredData);
    }
    let mut result = Counts::default();
    let mut statement = c.prepare("SELECT DISTINCT local_date FROM writing_activity WHERE local_date <= ?1 ORDER BY local_date")?;
    for row in statement.query_map([today], |row| row.get::<_, String>(0))? {
        let day = row?;
        let statistics = read_daily_statistics(c, &day, &day, None)?;
        let day = &statistics.days[0];
        result.words += day.credited_words.min(50_000 - result.words);
        let reached = day
            .book_goals
            .iter()
            .filter(|goal| goal.state == "reached")
            .count() as i64;
        result.goals += reached.min(10 - result.goals);
        if reached > 0 {
            result.days = (result.days + 1).min(30);
        }
    }
    // Read full native-validated snapshots rather than trusting UI completion flags.
    let mut statement = c.prepare("SELECT id FROM books ORDER BY id")?;
    for id in statement.query_map([], |row| row.get::<_, String>(0))? {
        if books::load(c, &id?)?.completed_at.is_some() {
            result.books = 1;
        }
    }
    Ok(result)
}

fn reconcile(tx: &Transaction<'_>, today: &str) -> Result<AchievementRefresh, AchievementError> {
    // Validate existing unlocks before ON CONFLICT can conceal a corrupt old row.
    let existing = list(tx)?;
    let evidence = counts(tx, today)?;
    let mut newly_unlocked = Vec::new();
    for rule in &RULES {
        if evidence.value(rule.metric) < rule.threshold
            || existing
                .iter()
                .any(|unlock| unlock.achievement_id == rule.id)
        {
            continue;
        }
        let now = timestamp(None)?;
        let changed = tx.execute("INSERT INTO achievement_unlocks(achievement_id, rule_policy_version, unlocked_at) VALUES (?1, ?2, ?3) ON CONFLICT(achievement_id) DO NOTHING", params![rule.id, rule.policy_version, now])?;
        if changed == 1 {
            newly_unlocked.push(AchievementUnlock {
                achievement_id: rule.id.into(),
                rule_policy_version: rule.policy_version,
                unlocked_at: now,
            });
        }
    }
    Ok(AchievementRefresh {
        unlocks: list(tx)?,
        newly_unlocked,
    })
}

/// Caller owns the chapter-save/book-delete IMMEDIATE transaction and its commit.
pub(crate) fn refresh_in_transaction(tx: &Transaction<'_>) -> Result<(), AchievementError> {
    let today = crate::schedule::local_today().map_err(|_| AchievementError::InvalidStoredData)?;
    reconcile(tx, &today)?;
    Ok(())
}

/// Native date only: clients cannot submit eligibility IDs, counts or backdated days.
pub fn refresh(c: &mut Connection) -> Result<AchievementRefresh, AchievementError> {
    let tx = c.transaction_with_behavior(TransactionBehavior::Immediate)?;
    let today = crate::schedule::local_today().map_err(|_| AchievementError::InvalidStoredData)?;
    let result = reconcile(&tx, &today)?;
    tx.commit()?;
    Ok(result)
}

#[cfg(test)]
mod tests;
