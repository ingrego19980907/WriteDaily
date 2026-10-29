use crate::{
    chapters::{
        Chapter, ChapterDetails, ChapterError, ChapterOrderEntry, ChapterRepository, ChapterSummary,
    },
    database::Database,
};
use serde::Serialize;
use tauri::Manager;

#[derive(Debug, Serialize)]
pub struct ChapterCommandError {
    code: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    reason: Option<&'static str>,
}
impl ChapterCommandError {
    fn code(code: &'static str) -> Self {
        Self { code, reason: None }
    }
}
impl From<ChapterError> for ChapterCommandError {
    fn from(error: ChapterError) -> Self {
        match error {
            ChapterError::Validation(reason) => Self {
                code: "validation",
                reason: Some(reason),
            },
            ChapterError::NotFound => Self::code("not_found"),
            ChapterError::Conflict => Self::code("conflict"),
            ChapterError::InvalidStoredData => Self::code("invalid_stored_data"),
            ChapterError::LimitReached => Self::code("limit_reached"),
            ChapterError::Database(_) => Self::code("persistence"),
        }
    }
}

fn run<T>(
    database: &Database,
    action: impl FnOnce(&mut rusqlite::Connection) -> Result<T, ChapterError>,
) -> Result<T, ChapterCommandError> {
    let mut connection = database
        .lock()
        .map_err(|_| ChapterCommandError::code("persistence"))?;
    action(&mut connection).map_err(Into::into)
}
async fn execute<T: Send + 'static>(
    app: tauri::AppHandle,
    action: impl FnOnce(&mut rusqlite::Connection) -> Result<T, ChapterError> + Send + 'static,
) -> Result<T, ChapterCommandError> {
    tauri::async_runtime::spawn_blocking(move || run(&app.state::<Database>(), action))
        .await
        .map_err(|_| ChapterCommandError::code("persistence"))?
}

#[tauri::command]
pub async fn list_chapters(
    app: tauri::AppHandle,
    book_id: String,
) -> Result<Vec<ChapterSummary>, ChapterCommandError> {
    execute(app, move |connection| {
        ChapterRepository::new(connection).list(&book_id)
    })
    .await
}
#[tauri::command]
pub async fn get_chapter(
    app: tauri::AppHandle,
    book_id: String,
    id: String,
) -> Result<Chapter, ChapterCommandError> {
    execute(app, move |connection| {
        ChapterRepository::new(connection).get(&book_id, &id)
    })
    .await
}
#[tauri::command]
pub async fn create_chapter(
    app: tauri::AppHandle,
    book_id: String,
    details: ChapterDetails,
) -> Result<Chapter, ChapterCommandError> {
    execute(app, move |connection| {
        ChapterRepository::new(connection).create(&book_id, details)
    })
    .await
}
#[tauri::command]
pub async fn rename_chapter(
    app: tauri::AppHandle,
    book_id: String,
    id: String,
    expected_revision: i64,
    details: ChapterDetails,
) -> Result<Chapter, ChapterCommandError> {
    execute(app, move |connection| {
        ChapterRepository::new(connection).rename(&book_id, &id, expected_revision, details)
    })
    .await
}
#[tauri::command]
pub async fn save_chapter_content(
    app: tauri::AppHandle,
    book_id: String,
    id: String,
    expected_revision: i64,
    content_json: String,
    activity_json: String,
) -> Result<Chapter, ChapterCommandError> {
    let notifier = app.clone();
    let result = execute(app, move |connection| {
        ChapterRepository::new(connection).save_content_with_activity(
            &book_id,
            &id,
            expected_revision,
            &content_json,
            &activity_json,
        )
    })
    .await;
    if result.is_ok() {
        crate::achievement_commands::signal_committed(&notifier);
    }
    result
}
fn confirmed_delete(
    connection: &mut rusqlite::Connection,
    book_id: &str,
    id: &str,
    revision: i64,
    confirmed: bool,
) -> Result<Vec<ChapterSummary>, ChapterCommandError> {
    if !confirmed {
        return Err(ChapterCommandError::code("confirmation_required"));
    }
    ChapterRepository::new(connection)
        .delete(book_id, id, revision)
        .map_err(Into::into)
}
#[tauri::command]
pub async fn delete_chapter(
    app: tauri::AppHandle,
    book_id: String,
    id: String,
    expected_revision: i64,
    confirmed: bool,
) -> Result<Vec<ChapterSummary>, ChapterCommandError> {
    tauri::async_runtime::spawn_blocking(move || {
        let database = app.state::<Database>();
        let mut connection = database
            .lock()
            .map_err(|_| ChapterCommandError::code("persistence"))?;
        confirmed_delete(&mut connection, &book_id, &id, expected_revision, confirmed)
    })
    .await
    .map_err(|_| ChapterCommandError::code("persistence"))?
}
#[tauri::command]
pub async fn reorder_chapters(
    app: tauri::AppHandle,
    book_id: String,
    expected: Vec<ChapterOrderEntry>,
    chapter_ids: Vec<String>,
) -> Result<Vec<ChapterSummary>, ChapterCommandError> {
    execute(app, move |connection| {
        ChapterRepository::new(connection).reorder(&book_id, &expected, &chapter_ids)
    })
    .await
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn confirmation_and_error_codes_do_not_expose_database_details() {
        let directory = tempfile::tempdir().unwrap();
        let database = crate::database::open(directory.path()).unwrap();
        assert_eq!(
            confirmed_delete(
                &mut database.lock().unwrap(),
                "invalid",
                "invalid",
                1,
                false
            )
            .unwrap_err()
            .code,
            "confirmation_required"
        );
        let error = run(&database, |connection| {
            ChapterRepository::new(connection).list("invalid")
        })
        .unwrap_err();
        assert_eq!(
            serde_json::to_value(error).unwrap(),
            serde_json::json!({"code":"validation", "reason":"invalid_id"})
        );
        let error =
            ChapterCommandError::from(ChapterError::Database(rusqlite::Error::InvalidQuery));
        assert_eq!(
            serde_json::to_value(error).unwrap(),
            serde_json::json!({"code":"persistence"})
        );
    }
}
