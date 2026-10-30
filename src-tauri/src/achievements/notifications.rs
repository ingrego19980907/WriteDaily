use super::{AchievementError, AchievementUnlock, list};
use crate::books::validation::{parse_timestamp, timestamp};
use rusqlite::{Connection, TransactionBehavior, params};
use std::collections::HashSet;

/// Claim committed unlocks once. A lost response/crash after commit can miss a
/// transient notice, but never removes the permanent achievement or replays it.
pub fn claim_notifications(c: &mut Connection) -> Result<Vec<AchievementUnlock>, AchievementError> {
    let tx = c.transaction_with_behavior(TransactionBehavior::Immediate)?;
    let unlocks = list(&tx)?;
    let claimed = read_receipts(&tx, &unlocks)?;
    let pending: Vec<_> = unlocks
        .into_iter()
        .filter(|unlock| !claimed.contains(&unlock.achievement_id))
        .collect();
    let mut result = Vec::new();
    if !pending.is_empty() {
        let now = timestamp(None)?;
        for unlock in pending {
            if tx.execute("INSERT INTO achievement_notification_receipts(achievement_id, disposition, claimed_at) VALUES (?1, 'claimed', ?2) ON CONFLICT(achievement_id) DO NOTHING", params![unlock.achievement_id, now])? == 1 {
                result.push(unlock);
            }
        }
    }
    tx.commit()?;
    Ok(result)
}

pub(crate) fn baseline_restored(c: &mut Connection) -> Result<(), AchievementError> {
    let tx = c.transaction_with_behavior(TransactionBehavior::Immediate)?;
    let unlocks = list(&tx)?;
    read_receipts(&tx, &unlocks)?;
    tx.execute("INSERT INTO achievement_notification_receipts(achievement_id, disposition, claimed_at) SELECT achievement_id, 'baseline', NULL FROM achievement_unlocks WHERE achievement_id NOT IN (SELECT achievement_id FROM achievement_notification_receipts)", [])?;
    tx.commit()?;
    Ok(())
}

fn read_receipts(
    tx: &Connection,
    unlocks: &[AchievementUnlock],
) -> Result<HashSet<String>, AchievementError> {
    let mut claimed = HashSet::new();
    {
        let mut statement = tx.prepare(
            "SELECT achievement_id, disposition, claimed_at FROM achievement_notification_receipts",
        )?;
        for row in statement.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<String>>(2)?,
            ))
        })? {
            let (id, disposition, instant) = row?;
            let valid = match disposition.as_str() {
                "baseline" => instant.is_none(),
                "claimed" => instant
                    .as_deref()
                    .is_some_and(|time| parse_timestamp(time).is_some()),
                _ => false,
            };
            if !valid
                || !unlocks.iter().any(|unlock| unlock.achievement_id == id)
                || !claimed.insert(id)
            {
                return Err(AchievementError::InvalidStoredData);
            }
        }
    }
    Ok(claimed)
}
