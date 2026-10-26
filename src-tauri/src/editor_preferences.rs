use rusqlite::{Connection, OptionalExtension, TransactionBehavior, params};
use serde::{Deserialize, Serialize};

const MAX_REVISION: i64 = 9_007_199_254_740_991;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EditorPreferences {
    pub schema_version: i64,
    pub font_size: i64,
    pub revision: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PreferenceChange {
    pub font_size: i64,
    pub expected_revision: i64,
}

#[derive(Debug, thiserror::Error)]
pub enum PreferenceError {
    #[error("Invalid editor preference")]
    Validation,
    #[error("Editor preferences changed elsewhere")]
    Conflict,
    #[error("Invalid stored editor preferences")]
    InvalidStoredData,
    #[error("Preference revision limit reached")]
    LimitReached,
    #[error("Could not persist editor preferences: {0}")]
    Database(#[from] rusqlite::Error),
}

fn load(connection: &Connection) -> Result<EditorPreferences, PreferenceError> {
    let count: i64 =
        connection.query_row("SELECT count(*) FROM editor_preferences", [], |r| r.get(0))?;
    let result = connection
        .query_row(
            "SELECT schema_version, font_size, revision FROM editor_preferences WHERE id = 1",
            [],
            |row| {
                Ok(EditorPreferences {
                    schema_version: row.get(0)?,
                    font_size: row.get(1)?,
                    revision: row.get(2)?,
                })
            },
        )
        .optional()?
        .ok_or(PreferenceError::InvalidStoredData)?;
    if count != 1
        || result.schema_version != 1
        || !(12..=32).contains(&result.font_size)
        || !(1..=MAX_REVISION).contains(&result.revision)
    {
        return Err(PreferenceError::InvalidStoredData);
    }
    Ok(result)
}

pub fn get(connection: &mut Connection) -> Result<EditorPreferences, PreferenceError> {
    let tx = connection.transaction()?;
    let result = load(&tx)?;
    tx.commit()?;
    Ok(result)
}

pub fn save(
    connection: &mut Connection,
    change: PreferenceChange,
) -> Result<EditorPreferences, PreferenceError> {
    if !(12..=32).contains(&change.font_size)
        || !(1..=MAX_REVISION).contains(&change.expected_revision)
    {
        return Err(PreferenceError::Validation);
    }
    let tx = connection.transaction_with_behavior(TransactionBehavior::Immediate)?;
    let current = load(&tx)?;
    if current.revision != change.expected_revision {
        return Err(PreferenceError::Conflict);
    }
    if current.font_size == change.font_size {
        tx.commit()?;
        return Ok(current);
    }
    if current.revision == MAX_REVISION {
        return Err(PreferenceError::LimitReached);
    }
    let changed = tx.execute("UPDATE editor_preferences SET font_size = ?1, revision = ?2 WHERE id = 1 AND revision = ?3", params![change.font_size, current.revision + 1, current.revision])?;
    if changed != 1 {
        return Err(PreferenceError::Conflict);
    }
    let result = load(&tx)?;
    tx.commit()?;
    Ok(result)
}

#[cfg(test)]
mod tests;
