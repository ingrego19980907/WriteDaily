use crate::{
    database::Database,
    schedule::{self, ScheduleError, WritingSchedule},
};
use serde::Serialize;
use tauri::Manager;

#[derive(Debug, Serialize)]
pub struct CommandError {
    code: &'static str,
}
impl From<ScheduleError> for CommandError {
    fn from(error: ScheduleError) -> Self {
        Self {
            code: match error {
                ScheduleError::Validation => "validation",
                ScheduleError::Conflict => "conflict",
                ScheduleError::InvalidStoredData => "invalid_stored_data",
                ScheduleError::Database(_) => "persistence",
            },
        }
    }
}
#[tauri::command]
pub async fn get_writing_schedule(app: tauri::AppHandle) -> Result<WritingSchedule, CommandError> {
    tauri::async_runtime::spawn_blocking(move || {
        let db = app.state::<Database>();
        let mut c = db.lock().map_err(|_| CommandError {
            code: "persistence",
        })?;
        let tx = c.transaction().map_err(ScheduleError::from)?;
        let result = schedule::read(&tx)?;
        tx.commit().map_err(ScheduleError::from)?;
        Ok(result)
    })
    .await
    .map_err(|_| CommandError {
        code: "persistence",
    })?
}
#[tauri::command]
pub async fn save_writing_schedule(
    app: tauri::AppHandle,
    expected_revision: i64,
    weekdays: Vec<u8>,
    today: String,
) -> Result<WritingSchedule, CommandError> {
    tauri::async_runtime::spawn_blocking(move || {
        let db = app.state::<Database>();
        let mut c = db.lock().map_err(|_| CommandError {
            code: "persistence",
        })?;
        schedule::save(&mut c, expected_revision, &weekdays, &today).map_err(Into::into)
    })
    .await
    .map_err(|_| CommandError {
        code: "persistence",
    })?
}
