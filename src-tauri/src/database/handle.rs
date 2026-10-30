use super::{DatabaseError, connect};
use rusqlite::Connection;
use std::{
    fs::{File, OpenOptions},
    ops::{Deref, DerefMut},
    path::{Path, PathBuf},
    sync::{
        Mutex, MutexGuard,
        atomic::{AtomicBool, Ordering},
    },
};

#[derive(Debug)]
pub struct Database {
    connection: Mutex<Option<Connection>>,
    pub(crate) root: PathBuf,
    lease: File,
    blocked: AtomicBool,
    restored: AtomicBool,
}

#[derive(Debug, thiserror::Error)]
#[error("Library unavailable during restore; close and reopen WriteDaily")]
pub struct DatabaseLockError;

pub struct ConnectionGuard<'a>(MutexGuard<'a, Option<Connection>>);
impl Deref for ConnectionGuard<'_> {
    type Target = Connection;
    fn deref(&self) -> &Connection {
        self.0.as_ref().expect("checked live connection")
    }
}
impl DerefMut for ConnectionGuard<'_> {
    fn deref_mut(&mut self) -> &mut Connection {
        self.0.as_mut().expect("checked live connection")
    }
}

impl Database {
    #[cfg(test)]
    pub fn into_inner(self) -> Result<Connection, DatabaseLockError> {
        self.connection
            .into_inner()
            .map_err(|_| DatabaseLockError)?
            .ok_or(DatabaseLockError)
    }
    pub(super) fn open(root: &Path) -> Result<Self, DatabaseError> {
        if !crate::covers::ordinary(&std::fs::symlink_metadata(root)?) {
            return Err(DatabaseError::InvalidSchema(
                "Unsafe library directory".into(),
            ));
        }
        let root = std::fs::canonicalize(root)?;
        if let Ok(meta) = std::fs::symlink_metadata(root.join("write-daily.lock"))
            && (!crate::covers::ordinary(&meta) || !meta.is_file())
        {
            return Err(DatabaseError::InvalidSchema("Unsafe library lock".into()));
        }
        let lease = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .open(root.join("write-daily.lock"))?;
        lease.try_lock_shared().map_err(|_| {
            DatabaseError::InvalidSchema("Library is being restored by another instance".into())
        })?;
        let exclusive = crate::restores::journal_exists(&root);
        if exclusive {
            lease.unlock()?;
            lease.try_lock().map_err(|_| {
                DatabaseError::InvalidSchema(
                    "Restore recovery requires other instances to close".into(),
                )
            })?;
            crate::restores::recover_pending(&root).map_err(|_| {
                DatabaseError::InvalidSchema(
                    "Restore recovery did not complete; original files were retained".into(),
                )
            })?;
        }
        if root.join("restore-history").exists()
            && (!root.join("write-daily.sqlite3").is_file() || !root.join("covers").is_dir())
        {
            return Err(DatabaseError::InvalidSchema(
                "Incomplete restore files; refusing to create an empty library".into(),
            ));
        }
        let mut connection = connect(&root)?;
        crate::achievements::refresh(&mut connection)?;
        if exclusive {
            lease.unlock()?;
            lease.try_lock_shared().map_err(|_| {
                DatabaseError::InvalidSchema("Library restore started during initialization".into())
            })?;
        }
        Ok(Self {
            connection: Mutex::new(Some(connection)),
            root,
            lease,
            blocked: AtomicBool::new(false),
            restored: AtomicBool::new(false),
        })
    }

    pub fn lock(&self) -> Result<ConnectionGuard<'_>, DatabaseLockError> {
        if self.blocked.load(Ordering::SeqCst) {
            return Err(DatabaseLockError);
        }
        let connection = self.connection.lock().map_err(|_| DatabaseLockError)?;
        // Queued old requests must also fail after the maintenance fence is raised.
        if self.blocked.load(Ordering::SeqCst) || connection.is_none() {
            return Err(DatabaseLockError);
        }
        Ok(ConnectionGuard(connection))
    }
    pub(crate) fn blocked(&self) -> bool {
        self.blocked.load(Ordering::SeqCst)
    }
    pub(crate) fn restored(&self) -> bool {
        self.restored.load(Ordering::SeqCst)
    }
    pub(crate) fn begin_restore(&self) -> Result<RestoreGuard<'_>, DatabaseLockError> {
        self.blocked
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .map_err(|_| DatabaseLockError)?;
        let connection = self.connection.lock().map_err(|_| DatabaseLockError)?;
        self.lease.unlock().map_err(|_| DatabaseLockError)?;
        if self.lease.try_lock().is_err() {
            if self.lease.try_lock_shared().is_ok() {
                self.blocked.store(false, Ordering::SeqCst);
            }
            return Err(DatabaseLockError);
        }
        Ok(RestoreGuard {
            database: self,
            connection,
            keep_blocked: false,
        })
    }
}

pub(crate) struct RestoreGuard<'a> {
    database: &'a Database,
    pub(crate) connection: MutexGuard<'a, Option<Connection>>,
    keep_blocked: bool,
}
impl RestoreGuard<'_> {
    pub(crate) fn close(&mut self) -> Result<(), rusqlite::Error> {
        let busy: i64 = self
            .connection
            .as_ref()
            .ok_or(rusqlite::Error::InvalidQuery)?
            .query_row("PRAGMA wal_checkpoint(TRUNCATE)", [], |row| row.get(0))?;
        if busy != 0 {
            return Err(rusqlite::Error::InvalidQuery);
        }
        if let Some(connection) = self.connection.take()
            && let Err((connection, error)) = connection.close()
        {
            *self.connection = Some(connection);
            return Err(error);
        }
        Ok(())
    }
    pub(crate) fn reopen(&mut self) -> Result<(), DatabaseError> {
        if self.connection.is_none() {
            *self.connection = Some(connect(&self.database.root)?);
        }
        Ok(())
    }
    pub(crate) fn finish(&mut self, restored: bool) {
        self.keep_blocked = true;
        self.database.restored.store(restored, Ordering::SeqCst);
    }
}
impl Drop for RestoreGuard<'_> {
    fn drop(&mut self) {
        if !self.keep_blocked
            && self.connection.is_some()
            && self.database.lease.unlock().is_ok()
            && self.database.lease.try_lock_shared().is_ok()
        {
            self.database.blocked.store(false, Ordering::SeqCst);
        }
    }
}
