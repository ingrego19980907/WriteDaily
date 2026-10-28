use crate::{
    activity::{self, ActivityError, DailyStatisticsRange},
    database::Database,
};
use serde::Serialize;
use tauri::Manager;

#[derive(Debug, Serialize)]
pub struct ActivityCommandError {
    code: &'static str,
}
impl From<ActivityError> for ActivityCommandError {
    fn from(error: ActivityError) -> Self {
        Self {
            code: match error {
                ActivityError::Validation => "validation",
                ActivityError::NotFound => "not_found",
                ActivityError::InvalidStoredData => "invalid_stored_data",
                ActivityError::LimitReached => "limit_reached",
                ActivityError::Database(_) => "persistence",
            },
        }
    }
}
#[tauri::command]
pub async fn get_daily_statistics(
    app: tauri::AppHandle,
    start_date: String,
    end_date: String,
    book_id: Option<String>,
) -> Result<DailyStatisticsRange, ActivityCommandError> {
    tauri::async_runtime::spawn_blocking(move || {
        let db = app.state::<Database>();
        let mut connection = db.lock().map_err(|_| ActivityCommandError {
            code: "persistence",
        })?;
        activity::get_daily_statistics(&mut connection, &start_date, &end_date, book_id.as_deref())
            .map_err(Into::into)
    })
    .await
    .map_err(|_| ActivityCommandError {
        code: "persistence",
    })?
}

#[tauri::command]
pub async fn get_current_streak(
    app: tauri::AppHandle,
    today: String,
    book_id: Option<String>,
) -> Result<activity::CurrentStreak, ActivityCommandError> {
    tauri::async_runtime::spawn_blocking(move || {
        let db = app.state::<Database>();
        let mut connection = db.lock().map_err(|_| ActivityCommandError {
            code: "persistence",
        })?;
        activity::get_current_streak(&mut connection, &today, book_id.as_deref())
            .map_err(Into::into)
    })
    .await
    .map_err(|_| ActivityCommandError {
        code: "persistence",
    })?
}

#[tauri::command]
pub async fn get_longest_streak(
    app: tauri::AppHandle,
    today: String,
    book_id: Option<String>,
) -> Result<activity::LongestStreak, ActivityCommandError> {
    tauri::async_runtime::spawn_blocking(move || {
        let db = app.state::<Database>();
        let mut connection = db.lock().map_err(|_| ActivityCommandError {
            code: "persistence",
        })?;
        activity::get_longest_streak(&mut connection, &today, book_id.as_deref())
            .map_err(Into::into)
    })
    .await
    .map_err(|_| ActivityCommandError {
        code: "persistence",
    })?
}
