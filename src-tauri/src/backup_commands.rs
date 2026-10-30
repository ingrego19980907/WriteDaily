use crate::{
    backups::{BackupError, BackupResult, LibraryBackup},
    covers::CoverStore,
    database::Database,
    exports::{ExportDialogLabels, ExportGate},
};
use serde::Serialize;
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

#[derive(Debug, Serialize)]
pub struct BackupCommandError {
    code: &'static str,
}
impl From<BackupError> for BackupCommandError {
    fn from(error: BackupError) -> Self {
        Self {
            code: match error {
                BackupError::InvalidSource | BackupError::Cover(_) => "invalid_source",
                BackupError::TooLarge => "too_large",
                BackupError::Busy => "busy",
                BackupError::Sql(ref error)
                    if matches!(
                        error.sqlite_error_code(),
                        Some(
                            rusqlite::ErrorCode::DatabaseBusy | rusqlite::ErrorCode::DatabaseLocked
                        )
                    ) =>
                {
                    "busy"
                }
                BackupError::AlreadyExists => "already_exists",
                BackupError::InvalidDestination => "invalid_destination",
                _ => "backup_failed",
            },
        }
    }
}

#[tauri::command]
pub async fn create_library_backup(
    window: tauri::Window,
    labels: ExportDialogLabels,
) -> Result<BackupResult, BackupCommandError> {
    if !labels.valid() {
        return Err(BackupCommandError { code: "validation" });
    }
    tauri::async_runtime::spawn_blocking(move || {
        let app = window.app_handle();
        let gate = app.state::<ExportGate>();
        let _guard = gate
            .0
            .try_lock()
            .map_err(|_| BackupCommandError { code: "busy" })?;
        let snapshot = {
            let database = app.state::<Database>();
            let mut connection = database.lock().map_err(|_| BackupCommandError {
                code: "backup_failed",
            })?;
            LibraryBackup::capture(&mut connection, &app.state::<CoverStore>())?
        };
        let path = app
            .dialog()
            .file()
            .set_parent(&window)
            .set_title(&labels.title)
            .add_filter(&labels.file_type, &["zip"])
            .set_file_name(&snapshot.file_name)
            .blocking_save_file();
        let Some(path) = path else {
            return Ok(BackupResult::Cancelled);
        };
        let path = path.into_path().map_err(|_| BackupCommandError {
            code: "invalid_destination",
        })?;
        snapshot.write_new(&path).map_err(Into::into)
    })
    .await
    .map_err(|_| BackupCommandError {
        code: "backup_failed",
    })?
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn command_errors_hide_paths_and_cancellation_is_not_success() {
        for (error, code) in [
            (
                BackupError::Io(std::io::Error::other("C:\\private\\library")),
                "backup_failed",
            ),
            (BackupError::InvalidSource, "invalid_source"),
            (BackupError::Busy, "busy"),
            (BackupError::TooLarge, "too_large"),
            (BackupError::AlreadyExists, "already_exists"),
            (BackupError::InvalidDestination, "invalid_destination"),
        ] {
            assert_eq!(
                serde_json::to_value(BackupCommandError::from(error)).unwrap(),
                serde_json::json!({"code":code})
            );
        }
        assert_eq!(
            serde_json::to_value(BackupResult::Cancelled).unwrap(),
            serde_json::json!({"status":"cancelled"})
        );
    }
}
