use super::*;
use crate::{
    backups::{DATABASE_NAME, LibraryBackup},
    covers::{CoverStore, ordinary},
};
use rusqlite::Connection;
use std::{
    fs::{self, File},
    io::{Read, Write},
};

const JOURNAL: &str = "restore-journal.json";
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "snake_case", deny_unknown_fields)]
struct Journal {
    version: u32,
    transaction: String,
    committed: bool,
}

pub(crate) fn journal_exists(root: &Path) -> bool {
    root.join(JOURNAL).exists()
}

fn marker(root: &Path, journal: &Journal, first: bool) -> Result<(), RestoreError> {
    let mut file = tempfile::Builder::new()
        .prefix(".restore-marker-")
        .tempfile_in(root)?;
    file.write_all(&serde_json::to_vec(journal)?)?;
    file.as_file().sync_all()?;
    if first {
        file.persist_noclobber(root.join(JOURNAL))
            .map_err(|e| e.error)?;
    } else {
        file.persist(root.join(JOURNAL)).map_err(|e| e.error)?;
    }
    Ok(())
}
fn move_owned(root: &Path, from: &Path, to: &Path) -> Result<(), RestoreError> {
    if !from.starts_with(root)
        || !to.starts_with(root)
        || !fs::canonicalize(from.parent().ok_or(RestoreError::InvalidBackup)?)?.starts_with(root)
        || !fs::canonicalize(to.parent().ok_or(RestoreError::InvalidBackup)?)?.starts_with(root)
        || !ordinary(&fs::symlink_metadata(from)?)
        || to.exists()
    {
        return Err(RestoreError::InvalidBackup);
    }
    fs::rename(from, to)?;
    Ok(())
}
fn live_present(root: &Path) -> Result<(), RestoreError> {
    for (path, directory) in [
        (root.join(DATABASE_NAME), false),
        (root.join("covers"), true),
    ] {
        let metadata = fs::symlink_metadata(&path)?;
        if !ordinary(&metadata) || metadata.is_dir() != directory {
            return Err(RestoreError::InvalidBackup);
        }
    }
    Ok(())
}

/// Called before any startup connection/cleanup. Prepared restores roll back;
/// committed restores retain the new pair. Old files and safety ZIP are kept.
pub(crate) fn recover_pending(root: &Path) -> Result<bool, RestoreError> {
    if !journal_exists(root) {
        return Ok(false);
    }
    let path = root.join(JOURNAL);
    if !ordinary(&fs::symlink_metadata(&path)?) {
        return Err(RestoreError::InvalidBackup);
    }
    let mut data = Vec::new();
    File::open(path)?.take(4097).read_to_end(&mut data)?;
    if data.len() > 4096 {
        return Err(RestoreError::InvalidBackup);
    }
    let journal: Journal = serde_json::from_slice(&data)?;
    if journal.version != 1 || !crate::books::validation::valid_id(&journal.transaction) {
        return Err(RestoreError::InvalidBackup);
    }
    let history = root.join("restore-history").join(&journal.transaction);
    super::archive::safe_directory(root, &history)?;
    if !history.join("safety.zip").is_file() {
        return Err(RestoreError::InvalidBackup);
    }
    if !journal.committed {
        let previous = history.join("previous");
        let failed = history.join("failed");
        if !failed.exists() {
            fs::create_dir(&failed)?;
        }
        super::archive::safe_directory(root, &previous)?;
        super::archive::safe_directory(root, &failed)?;
        for name in [DATABASE_NAME, "covers"] {
            let old = previous.join(name);
            let live = root.join(name);
            if old.exists() {
                if live.exists() {
                    move_owned(root, &live, &failed.join(name))?;
                }
                move_owned(root, &old, &live)?;
            }
        }
    }
    live_present(root)?;
    fs::remove_file(root.join(JOURNAL))?;
    Ok(journal.committed)
}

pub(super) fn apply(
    prepared: PreparedRestore,
    database: &Database,
    covers: &CoverStore,
) -> Result<(), RestoreError> {
    if prepared.root != database.root {
        return Err(RestoreError::Conflict);
    }
    super::archive::validate_payload(
        &prepared.directory.path().join("incoming"),
        &prepared.manifest,
    )?;
    let mut guard = database.begin_restore().map_err(|_| RestoreError::Busy)?;
    let history_root = database.root.join("restore-history");
    if !history_root.exists() {
        fs::create_dir(&history_root)?;
    }
    super::archive::safe_directory(&database.root, &history_root)?;
    let history = history_root.join(&prepared.preview.token);
    let staging = prepared.directory.keep(); // Never auto-delete parked user files.
    move_owned(&database.root, &staging, &history)?;
    let incoming = history.join("incoming");
    fs::create_dir(history.join("previous"))?;
    let mut journal = Journal {
        version: 1,
        transaction: prepared.preview.token,
        committed: false,
    };
    let result = (|| -> Result<(), RestoreError> {
        // Exercise the same startup reconciliation on staged data only, then
        // baseline imported unlocks so restoration never replays writing notices.
        let mut staged = crate::database::connect(&incoming)?;
        crate::achievements::refresh(&mut staged).map_err(|_| RestoreError::InvalidBackup)?;
        crate::achievements::baseline_restored(&mut staged)
            .map_err(|_| RestoreError::InvalidBackup)?;
        staged.pragma_update(None, "journal_mode", "DELETE")?;
        staged.close().map_err(|(_, error)| error)?;
        let safety = LibraryBackup::capture(
            guard
                .connection
                .as_mut()
                .ok_or(RestoreError::RecoveryRequired)?,
            covers,
        )?;
        safety.write_new(&history.join("safety.zip"))?;
        guard.close()?;
        for suffix in ["-wal", "-shm", "-journal"] {
            if database
                .root
                .join(format!("{DATABASE_NAME}{suffix}"))
                .exists()
            {
                return Err(RestoreError::Busy);
            }
        }
        marker(&database.root, &journal, true)?;
        for name in [DATABASE_NAME, "covers"] {
            move_owned(
                &database.root,
                &database.root.join(name),
                &history.join("previous").join(name),
            )?;
        }
        for name in [DATABASE_NAME, "covers"] {
            move_owned(
                &database.root,
                &incoming.join(name),
                &database.root.join(name),
            )?;
        }
        live_present(&database.root)?;
        // Nothing has opened the installed DB writable before the durable commit marker.
        let check = Connection::open_with_flags(
            database.root.join(DATABASE_NAME),
            rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY,
        )?;
        crate::backups::validate_database(&check).map_err(|_| RestoreError::InvalidBackup)?;
        drop(check);
        journal.committed = true;
        marker(&database.root, &journal, false)?;
        Ok(())
    })();
    match result {
        Ok(()) => {
            guard.finish(true);
            Ok(())
        }
        Err(error) => {
            if journal_exists(&database.root) {
                match recover_pending(&database.root) {
                    Ok(true) => {
                        guard.finish(true);
                        return Ok(());
                    }
                    Ok(false) => (),
                    Err(_) => {
                        guard.finish(false);
                        return Err(RestoreError::RecoveryRequired);
                    }
                }
            }
            if guard.reopen().is_err() {
                guard.finish(false);
                return Err(RestoreError::RecoveryRequired);
            }
            Err(error)
        }
    }
}
