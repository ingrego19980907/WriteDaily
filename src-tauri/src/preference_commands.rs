use crate::{
    database::Database,
    editor_preferences::{self, EditorPreferences, PreferenceChange, PreferenceError},
};
use serde::Serialize;
use tauri::Manager;

#[derive(Debug, Serialize)]
pub struct PreferenceCommandError {
    code: &'static str,
}
impl From<PreferenceError> for PreferenceCommandError {
    fn from(error: PreferenceError) -> Self {
        Self {
            code: match error {
                PreferenceError::Validation => "validation",
                PreferenceError::Conflict => "conflict",
                PreferenceError::InvalidStoredData => "invalid_stored_data",
                PreferenceError::LimitReached => "limit_reached",
                PreferenceError::Database(_) => "persistence",
            },
        }
    }
}
async fn execute(
    app: tauri::AppHandle,
    change: Option<PreferenceChange>,
) -> Result<EditorPreferences, PreferenceCommandError> {
    tauri::async_runtime::spawn_blocking(move || {
        let database = app.state::<Database>();
        let mut connection = database.lock().map_err(|_| PreferenceCommandError {
            code: "persistence",
        })?;
        match change {
            Some(change) => editor_preferences::save(&mut connection, change),
            None => editor_preferences::get(&mut connection),
        }
        .map_err(Into::into)
    })
    .await
    .map_err(|_| PreferenceCommandError {
        code: "persistence",
    })?
}
#[tauri::command]
pub async fn get_editor_preferences(
    app: tauri::AppHandle,
) -> Result<EditorPreferences, PreferenceCommandError> {
    execute(app, None).await
}
#[tauri::command]
pub async fn save_editor_preferences(
    app: tauri::AppHandle,
    change: PreferenceChange,
) -> Result<EditorPreferences, PreferenceCommandError> {
    execute(app, Some(change)).await
}
