use crate::{
    covers::CoverStore,
    database::Database,
    exports::{ExportDialogLabels, ExportGate},
    restores::{PreparedRestore, RestoreError, RestoreSelection, RestoreState, RestoreStatus},
};
use serde::Serialize;
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

#[derive(Debug, Serialize)]
pub struct RestoreCommandError {
    code: &'static str,
}
impl From<RestoreError> for RestoreCommandError {
    fn from(error: RestoreError) -> Self {
        Self {
            code: match error {
                RestoreError::InvalidBackup | RestoreError::Json(_) | RestoreError::Zip(_) => {
                    "invalid_backup"
                }
                RestoreError::Unsupported => "unsupported_backup",
                RestoreError::TooLarge => "too_large",
                RestoreError::Busy => "busy",
                RestoreError::Conflict => "conflict",
                RestoreError::Confirmation => "confirmation_required",
                RestoreError::RecoveryRequired => "close_required",
                RestoreError::Backup(_) => "safety_backup_failed",
                _ => "restore_failed",
            },
        }
    }
}

#[tauri::command]
pub async fn prepare_library_restore(
    window: tauri::Window,
    labels: ExportDialogLabels,
) -> Result<RestoreSelection, RestoreCommandError> {
    if !labels.valid() {
        return Err(RestoreError::InvalidBackup.into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        let app = window.app_handle();
        let gate = app.state::<ExportGate>();
        let _gate = gate.0.try_lock().map_err(|_| RestoreError::Busy)?;
        let database = app.state::<Database>();
        if database.blocked() {
            return Err(RestoreError::RecoveryRequired.into());
        }
        app.state::<RestoreState>()
            .0
            .lock()
            .map_err(|_| RestoreError::Busy)?
            .take();
        let selected = app
            .dialog()
            .file()
            .set_parent(&window)
            .set_title(&labels.title)
            .add_filter(&labels.file_type, &["zip"])
            .blocking_pick_file();
        let Some(selected) = selected else {
            return Ok(RestoreSelection::Cancelled);
        };
        let path = selected
            .into_path()
            .map_err(|_| RestoreError::InvalidBackup)?;
        let prepared = PreparedRestore::prepare(&database.root, &path)?;
        let preview = prepared.preview.clone();
        *app.state::<RestoreState>()
            .0
            .lock()
            .map_err(|_| RestoreError::Busy)? = Some(prepared);
        Ok(RestoreSelection::Prepared { preview })
    })
    .await
    .map_err(|_| RestoreCommandError::from(RestoreError::Busy))?
}

#[tauri::command]
pub async fn cancel_library_restore(
    app: tauri::AppHandle,
    token: String,
) -> Result<(), RestoreCommandError> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<RestoreState>();
        let mut pending = state.0.lock().map_err(|_| RestoreError::Busy)?;
        if pending
            .as_ref()
            .is_some_and(|plan| plan.preview.token == token)
        {
            pending.take();
        }
        Ok(())
    })
    .await
    .map_err(|_| RestoreCommandError::from(RestoreError::Busy))?
}

#[tauri::command]
pub async fn apply_library_restore(
    app: tauri::AppHandle,
    token: String,
    confirmed: bool,
) -> Result<RestoreStatus, RestoreCommandError> {
    if !confirmed {
        return Err(RestoreError::Confirmation.into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        let gate = app.state::<ExportGate>();
        let _gate = gate.0.try_lock().map_err(|_| RestoreError::Busy)?;
        let prepared = app.state::<RestoreState>().take(&token)?;
        let database = app.state::<Database>();
        prepared.apply(&database, &app.state::<CoverStore>())?;
        Ok(RestoreStatus::Restored)
    })
    .await
    .map_err(|_| RestoreCommandError::from(RestoreError::RecoveryRequired))?
}

#[tauri::command]
pub fn get_library_restore_status(app: tauri::AppHandle) -> RestoreStatus {
    let database = app.state::<Database>();
    if database.restored() {
        RestoreStatus::Restored
    } else if database.blocked() {
        RestoreStatus::CloseRequired
    } else {
        RestoreStatus::Ready
    }
}
#[tauri::command]
pub fn close_after_library_restore(app: tauri::AppHandle) -> Result<(), RestoreCommandError> {
    if !app.state::<Database>().blocked() {
        return Err(RestoreError::Conflict.into());
    }
    app.exit(0);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn errors_hide_paths_and_statuses_distinguish_confirmation_from_completion() {
        for (error, code) in [
            (
                RestoreError::Io(std::io::Error::other("C:\\private\\backup.zip")),
                "restore_failed",
            ),
            (RestoreError::Confirmation, "confirmation_required"),
            (RestoreError::Unsupported, "unsupported_backup"),
            (RestoreError::Conflict, "conflict"),
            (RestoreError::RecoveryRequired, "close_required"),
        ] {
            assert_eq!(
                serde_json::to_value(RestoreCommandError::from(error)).unwrap(),
                serde_json::json!({"code":code})
            );
        }
        assert_eq!(
            serde_json::to_value(RestoreStatus::Restored).unwrap(),
            serde_json::json!({"status":"restored"})
        );
        assert_eq!(
            serde_json::to_value(RestoreStatus::CloseRequired).unwrap(),
            serde_json::json!({"status":"close_required"})
        );
    }
}
