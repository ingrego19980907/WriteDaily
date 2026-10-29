use crate::{
    achievements::{self, AchievementError, AchievementRefresh, AchievementUnlock},
    database::Database,
};
use serde::Serialize;
use tauri::{Emitter, Manager};

/// Best-effort wakeup only; never turn an already committed save into an error.
pub(crate) fn signal_committed(app: &tauri::AppHandle) {
    let _ = app.emit("achievement-unlocks-changed", ());
}

#[derive(Debug, Serialize)]
pub struct AchievementCommandError {
    code: &'static str,
}
impl From<AchievementError> for AchievementCommandError {
    fn from(error: AchievementError) -> Self {
        Self {
            code: match error {
                AchievementError::Database(_) => "persistence",
                AchievementError::Activity(crate::activity::ActivityError::Database(_)) => {
                    "persistence"
                }
                AchievementError::Book(crate::books::BookError::Database(_)) => "persistence",
                AchievementError::Activity(crate::activity::ActivityError::LimitReached) => {
                    "limit_reached"
                }
                _ => "invalid_stored_data",
            },
        }
    }
}

async fn execute<T: Send + 'static>(
    app: tauri::AppHandle,
    action: impl FnOnce(&mut rusqlite::Connection) -> Result<T, AchievementError> + Send + 'static,
) -> Result<T, AchievementCommandError> {
    tauri::async_runtime::spawn_blocking(move || {
        let database = app.state::<Database>();
        let mut c = database.lock().map_err(|_| AchievementCommandError {
            code: "persistence",
        })?;
        action(&mut c).map_err(Into::into)
    })
    .await
    .map_err(|_| AchievementCommandError {
        code: "persistence",
    })?
}

#[tauri::command]
pub async fn get_achievement_unlocks(
    app: tauri::AppHandle,
) -> Result<Vec<AchievementUnlock>, AchievementCommandError> {
    execute(app, |c| achievements::list(c)).await
}

#[tauri::command]
pub async fn refresh_achievements(
    app: tauri::AppHandle,
) -> Result<AchievementRefresh, AchievementCommandError> {
    let notifier = app.clone();
    let result = execute(app, achievements::refresh).await?;
    if !result.newly_unlocked.is_empty() {
        signal_committed(&notifier);
    }
    Ok(result)
}

#[tauri::command]
pub async fn claim_achievement_notifications(
    app: tauri::AppHandle,
) -> Result<Vec<AchievementUnlock>, AchievementCommandError> {
    execute(app, achievements::claim_notifications).await
}
