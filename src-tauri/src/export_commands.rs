use crate::{
    database::Database,
    exports::{
        BookExportResult, ChapterExportResult, ExportDialogLabels, ExportError, ExportGate,
        SavedBookExport, SavedChapterExport,
    },
};
use serde::Serialize;
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

#[derive(Debug, Serialize)]
pub struct ExportCommandError {
    code: &'static str,
}
impl From<ExportError> for ExportCommandError {
    fn from(error: ExportError) -> Self {
        use crate::chapters::ChapterError;
        Self {
            code: match error {
                ExportError::Chapter(ChapterError::Conflict) => "conflict",
                ExportError::Chapter(ChapterError::NotFound) => "not_found",
                ExportError::Chapter(ChapterError::InvalidStoredData) => "invalid_stored_data",
                ExportError::Chapter(ChapterError::LimitReached) => "limit_reached",
                ExportError::Chapter(ChapterError::Validation(_)) => "validation",
                ExportError::Chapter(ChapterError::Database(_)) => "persistence",
                ExportError::InvalidDestination => "invalid_destination",
                ExportError::AlreadyExists => "already_exists",
                ExportError::EmptyBook => "empty_book",
                ExportError::TooLarge => "too_large",
                ExportError::Io(_) => "export_failed",
            },
        }
    }
}

fn select_file(
    window: &tauri::Window,
    labels: &ExportDialogLabels,
    file_name: &str,
) -> Result<Option<std::path::PathBuf>, ExportCommandError> {
    let selected = window
        .app_handle()
        .dialog()
        .file()
        .set_parent(window)
        .set_title(&labels.title)
        .add_filter(&labels.file_type, &["txt"])
        .set_file_name(file_name)
        .blocking_save_file();
    selected
        .map(|path| {
            path.into_path().map_err(|_| ExportCommandError {
                code: "invalid_destination",
            })
        })
        .transpose()
}

#[tauri::command]
pub async fn export_chapter(
    window: tauri::Window,
    book_id: String,
    id: String,
    expected_revision: i64,
    labels: ExportDialogLabels,
) -> Result<ChapterExportResult, ExportCommandError> {
    if !labels.valid() {
        return Err(ExportCommandError { code: "validation" });
    }
    tauri::async_runtime::spawn_blocking(move || {
        let app = window.app_handle();
        let gate = app.state::<ExportGate>();
        let _guard = gate
            .0
            .try_lock()
            .map_err(|_| ExportCommandError { code: "busy" })?;
        // Release SQLite before the user chooses a file; no database transaction
        // or writing lock spans the operating system dialog or external IO.
        let snapshot = {
            let database = app.state::<Database>();
            let mut connection = database.lock().map_err(|_| ExportCommandError {
                code: "persistence",
            })?;
            SavedChapterExport::load(&mut connection, &book_id, &id, expected_revision)?
        };
        let Some(path) = select_file(&window, &labels, &snapshot.file_name)? else {
            return Ok(ChapterExportResult::Cancelled);
        };
        snapshot.write_new(&path).map_err(Into::into)
    })
    .await
    .map_err(|_| ExportCommandError {
        code: "export_failed",
    })?
}

#[tauri::command]
pub async fn export_book(
    window: tauri::Window,
    book_id: String,
    expected_book_updated_at: String,
    expected_chapters: Vec<crate::chapters::ChapterOrderEntry>,
    labels: ExportDialogLabels,
) -> Result<BookExportResult, ExportCommandError> {
    if !labels.valid() {
        return Err(ExportCommandError { code: "validation" });
    }
    tauri::async_runtime::spawn_blocking(move || {
        let app = window.app_handle();
        let gate = app.state::<ExportGate>();
        let _guard = gate
            .0
            .try_lock()
            .map_err(|_| ExportCommandError { code: "busy" })?;
        let snapshot = {
            let database = app.state::<Database>();
            let mut connection = database.lock().map_err(|_| ExportCommandError {
                code: "persistence",
            })?;
            SavedBookExport::load(
                &mut connection,
                &book_id,
                &expected_book_updated_at,
                &expected_chapters,
            )?
        };
        let Some(path) = select_file(&window, &labels, &snapshot.file_name)? else {
            return Ok(BookExportResult::Cancelled);
        };
        snapshot.write_new(&path).map_err(Into::into)
    })
    .await
    .map_err(|_| ExportCommandError {
        code: "export_failed",
    })?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dialog_labels_and_errors_do_not_expose_paths_or_invent_success() {
        let valid = ExportDialogLabels {
            title: "Export chapter".into(),
            file_type: "Plain text".into(),
        };
        assert!(valid.valid());
        for title in ["".into(), "a".repeat(161), "bad\nlabel".into()] {
            assert!(
                !ExportDialogLabels {
                    title,
                    file_type: "Text".into()
                }
                .valid()
            );
        }
        for (error, code) in [
            (
                ExportError::Chapter(crate::chapters::ChapterError::Conflict),
                "conflict",
            ),
            (
                ExportError::Chapter(crate::chapters::ChapterError::InvalidStoredData),
                "invalid_stored_data",
            ),
            (ExportError::AlreadyExists, "already_exists"),
            (ExportError::InvalidDestination, "invalid_destination"),
            (ExportError::EmptyBook, "empty_book"),
            (ExportError::TooLarge, "too_large"),
            (
                ExportError::Io(std::io::Error::other("C:\\private\\library.sqlite3")),
                "export_failed",
            ),
        ] {
            assert_eq!(
                serde_json::to_value(ExportCommandError::from(error)).unwrap(),
                serde_json::json!({"code":code})
            );
        }
        assert_eq!(
            serde_json::to_value(ChapterExportResult::Cancelled).unwrap(),
            serde_json::json!({"status":"cancelled"})
        );
    }
}
