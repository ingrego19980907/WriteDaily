use crate::{backups::BackupManifest, database::Database};
use serde::{Deserialize, Serialize};
use std::{
    path::{Path, PathBuf},
    sync::Mutex,
};

mod archive;
mod swap;
pub(crate) use swap::{journal_exists, recover_pending};

#[derive(Debug, thiserror::Error)]
pub enum RestoreError {
    #[error("Invalid or inconsistent backup")]
    InvalidBackup,
    #[error("Unsupported backup format or schema")]
    Unsupported,
    #[error("Backup exceeds supported bounds")]
    TooLarge,
    #[error("Close other WriteDaily instances before restoring")]
    Busy,
    #[error("Restore selection changed; choose the backup again")]
    Conflict,
    #[error("Restore confirmation is required")]
    Confirmation,
    #[error("Close and reopen WriteDaily to finish recovery")]
    RecoveryRequired,
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Sql(#[from] rusqlite::Error),
    #[error(transparent)]
    Zip(#[from] zip::result::ZipError),
    #[error(transparent)]
    Json(#[from] serde_json::Error),
    #[error(transparent)]
    Backup(#[from] crate::backups::BackupError),
    #[error(transparent)]
    Database(#[from] crate::database::DatabaseError),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RestorePreview {
    pub token: String,
    pub file_name: String,
    pub created_at: String,
    pub book_count: u64,
    pub chapter_count: u64,
    pub cover_count: u64,
}

pub struct PreparedRestore {
    directory: tempfile::TempDir,
    root: PathBuf,
    manifest: BackupManifest,
    pub preview: RestorePreview,
}

#[derive(Default)]
pub struct RestoreState(pub Mutex<Option<PreparedRestore>>);

#[derive(Debug, Serialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum RestoreSelection {
    Cancelled,
    Prepared { preview: RestorePreview },
}

#[derive(Debug, Serialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum RestoreStatus {
    Ready,
    CloseRequired,
    Restored,
}

impl RestoreState {
    pub fn take(&self, token: &str) -> Result<PreparedRestore, RestoreError> {
        let mut pending = self.0.lock().map_err(|_| RestoreError::Busy)?;
        if !pending.as_ref().is_some_and(|p| p.preview.token == token) {
            return Err(RestoreError::Conflict);
        }
        pending.take().ok_or(RestoreError::Conflict)
    }
}
impl PreparedRestore {
    pub fn prepare(root: &Path, selected: &Path) -> Result<Self, RestoreError> {
        archive::prepare(root, selected)
    }
    pub fn apply(
        self,
        database: &Database,
        covers: &crate::covers::CoverStore,
    ) -> Result<(), RestoreError> {
        swap::apply(self, database, covers)
    }
}

#[cfg(test)]
mod tests;
