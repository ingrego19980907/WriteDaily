use crate::covers::{CoverError, CoverResult, CoverStore, DeleteResult};
use crate::{
    books::{Book, BookDetails, BookError, BookRepository, ValidationIssue},
    database::Database,
};
use serde::Serialize;
use tauri::Manager;

impl From<CoverError> for BookCommandError {
    fn from(error: CoverError) -> Self {
        match error {
            CoverError::Book(error) => error.into(),
            CoverError::InvalidImage => Self {
                code: "invalid_image",
                issues: vec![],
            },
            CoverError::TooLarge => Self {
                code: "image_too_large",
                issues: vec![],
            },
            _ => Self::unavailable(),
        }
    }
}

#[tauri::command]
pub async fn set_cover(
    app: tauri::AppHandle,
    id: String,
    expected_updated_at: String,
    bytes: Option<Vec<u8>>,
) -> Result<CoverResult, BookCommandError> {
    tauri::async_runtime::spawn_blocking(move || {
        let database = app.state::<Database>();
        let mut connection = database
            .lock()
            .map_err(|_| BookCommandError::unavailable())?;
        app.state::<CoverStore>()
            .set(&mut connection, &id, &expected_updated_at, bytes.as_deref())
            .map_err(Into::into)
    })
    .await
    .map_err(|_| BookCommandError::unavailable())?
}

#[tauri::command]
pub async fn read_cover(
    app: tauri::AppHandle,
    id: String,
    expected_path: String,
) -> Result<Vec<u8>, BookCommandError> {
    tauri::async_runtime::spawn_blocking(move || {
        let database = app.state::<Database>();
        let mut connection = database
            .lock()
            .map_err(|_| BookCommandError::unavailable())?;
        app.state::<CoverStore>()
            .read(&mut connection, &id, &expected_path)
            .map_err(Into::into)
    })
    .await
    .map_err(|_| BookCommandError::unavailable())?
}

#[derive(Debug, Serialize)]
pub struct BookCommandError {
    code: &'static str,
    issues: Vec<ValidationIssue>,
}

impl From<BookError> for BookCommandError {
    fn from(error: BookError) -> Self {
        match error {
            BookError::Validation(issues) => Self {
                code: "validation",
                issues,
            },
            BookError::Conflict => Self {
                code: "conflict",
                issues: vec![],
            },
            BookError::NotFound => Self {
                code: "not_found",
                issues: vec![],
            },
            BookError::CoverCleanupRequired => Self {
                code: "cover_cleanup_required",
                issues: vec![],
            },
            _ => Self::unavailable(),
        }
    }
}

impl BookCommandError {
    fn unavailable() -> Self {
        Self {
            code: "persistence",
            issues: vec![],
        }
    }
}

fn create(database: &Database, details: BookDetails) -> Result<Book, BookCommandError> {
    let mut connection = database
        .lock()
        .map_err(|_| BookCommandError::unavailable())?;
    BookRepository::new(&mut connection)
        .create(details)
        .map_err(Into::into)
}

fn list(database: &Database) -> Result<Vec<Book>, BookCommandError> {
    let mut connection = database
        .lock()
        .map_err(|_| BookCommandError::unavailable())?;
    BookRepository::new(&mut connection)
        .list()
        .map_err(Into::into)
}

fn get(database: &Database, id: &str) -> Result<Book, BookCommandError> {
    let mut connection = database
        .lock()
        .map_err(|_| BookCommandError::unavailable())?;
    BookRepository::new(&mut connection)
        .get(id)
        .map_err(Into::into)
}

fn update(
    database: &Database,
    id: &str,
    expected_updated_at: &str,
    details: BookDetails,
) -> Result<Book, BookCommandError> {
    let mut connection = database
        .lock()
        .map_err(|_| BookCommandError::unavailable())?;
    BookRepository::new(&mut connection)
        .update(id, expected_updated_at, details)
        .map_err(Into::into)
}

fn delete(
    database: &Database,
    covers: &CoverStore,
    id: &str,
    expected_updated_at: &str,
    confirmed: bool,
) -> Result<DeleteResult, BookCommandError> {
    if !confirmed {
        return Err(BookCommandError {
            code: "confirmation_required",
            issues: vec![],
        });
    }
    let mut connection = database
        .lock()
        .map_err(|_| BookCommandError::unavailable())?;
    covers
        .delete(&mut connection, id, expected_updated_at)
        .map_err(Into::into)
}

#[tauri::command]
pub async fn delete_book(
    app: tauri::AppHandle,
    id: String,
    expected_updated_at: String,
    confirmed: bool,
) -> Result<DeleteResult, BookCommandError> {
    let notifier = app.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        delete(
            &app.state::<Database>(),
            &app.state::<CoverStore>(),
            &id,
            &expected_updated_at,
            confirmed,
        )
    })
    .await
    .map_err(|_| BookCommandError::unavailable())?;
    if result.is_ok() {
        crate::achievement_commands::signal_committed(&notifier);
    }
    result
}

#[tauri::command]
pub async fn list_books(app: tauri::AppHandle) -> Result<Vec<Book>, BookCommandError> {
    tauri::async_runtime::spawn_blocking(move || list(&app.state::<Database>()))
        .await
        .map_err(|_| BookCommandError::unavailable())?
}

#[tauri::command]
pub async fn get_book(app: tauri::AppHandle, id: String) -> Result<Book, BookCommandError> {
    tauri::async_runtime::spawn_blocking(move || get(&app.state::<Database>(), &id))
        .await
        .map_err(|_| BookCommandError::unavailable())?
}

#[tauri::command]
pub async fn update_book(
    app: tauri::AppHandle,
    id: String,
    expected_updated_at: String,
    details: BookDetails,
) -> Result<Book, BookCommandError> {
    tauri::async_runtime::spawn_blocking(move || {
        update(&app.state::<Database>(), &id, &expected_updated_at, details)
    })
    .await
    .map_err(|_| BookCommandError::unavailable())?
}

#[tauri::command]
pub async fn create_book(
    app: tauri::AppHandle,
    details: BookDetails,
) -> Result<Book, BookCommandError> {
    tauri::async_runtime::spawn_blocking(move || create(&app.state::<Database>(), details))
        .await
        .map_err(|_| BookCommandError::unavailable())?
}

#[cfg(test)]
mod tests {
    use super::*;

    fn details() -> BookDetails {
        BookDetails {
            title: "Selected book".into(),
            target_word_count: None,
            daily_word_goal: None,
            deadline: None,
        }
    }

    #[test]
    fn confirmed_deletion_preserves_unrelated_data_and_survives_reopen() {
        let directory = tempfile::tempdir().unwrap();
        let database = crate::database::open(directory.path()).unwrap();
        let covers = CoverStore::new(directory.path()).unwrap();
        let selected = create(&database, details()).unwrap();
        let other = create(&database, details()).unwrap();
        // Synthetic future relationships only: no chapter/history product schema is introduced.
        database.lock().unwrap().execute_batch("CREATE TABLE owned_fixture (book_id TEXT REFERENCES books(id) ON DELETE CASCADE); CREATE TABLE history_fixture (book_id TEXT REFERENCES books(id) ON DELETE SET NULL, words INTEGER); CREATE TABLE achievement_fixture (name TEXT);").unwrap();
        database
            .lock()
            .unwrap()
            .execute("INSERT INTO owned_fixture VALUES (?1)", [&selected.id])
            .unwrap();
        database
            .lock()
            .unwrap()
            .execute(
                "INSERT INTO history_fixture VALUES (?1, 42)",
                [&selected.id],
            )
            .unwrap();
        database
            .lock()
            .unwrap()
            .execute("INSERT INTO achievement_fixture VALUES ('retained')", [])
            .unwrap();
        assert_eq!(
            delete(
                &database,
                &covers,
                &selected.id,
                &selected.updated_at,
                false
            )
            .unwrap_err()
            .code,
            "confirmation_required"
        );
        assert_eq!(get(&database, &selected.id).unwrap(), selected);
        delete(&database, &covers, &selected.id, &selected.updated_at, true).unwrap();
        drop(database);
        let reopened = crate::database::open(directory.path()).unwrap();
        assert_eq!(get(&reopened, &selected.id).unwrap_err().code, "not_found");
        assert_eq!(get(&reopened, &other.id).unwrap(), other);
        let connection = reopened.lock().unwrap();
        assert_eq!(
            connection
                .query_row("SELECT count(*) FROM owned_fixture", [], |r| r
                    .get::<_, i64>(0))
                .unwrap(),
            0
        );
        assert_eq!(
            connection
                .query_row(
                    "SELECT words FROM history_fixture WHERE book_id IS NULL",
                    [],
                    |r| r.get::<_, i64>(0)
                )
                .unwrap(),
            42
        );
        assert_eq!(
            connection
                .query_row("SELECT name FROM achievement_fixture", [], |r| r
                    .get::<_, String>(0))
                .unwrap(),
            "retained"
        );
    }

    #[test]
    fn deletion_errors_preserve_book_and_files() {
        let directory = tempfile::tempdir().unwrap();
        let database = crate::database::open(directory.path()).unwrap();
        let covers = CoverStore::new(directory.path()).unwrap();
        let original = create(&database, details()).unwrap();
        let changed = update(&database, &original.id, &original.updated_at, details()).unwrap();
        assert_eq!(
            delete(&database, &covers, &original.id, &original.updated_at, true)
                .unwrap_err()
                .code,
            "conflict"
        );
        database.lock().unwrap().execute_batch("CREATE TRIGGER prevent_delete BEFORE DELETE ON books BEGIN SELECT RAISE(ABORT, 'test failure'); END;").unwrap();
        assert_eq!(
            delete(&database, &covers, &changed.id, &changed.updated_at, true)
                .unwrap_err()
                .code,
            "persistence"
        );
        assert_eq!(get(&database, &changed.id).unwrap(), changed);
        database
            .lock()
            .unwrap()
            .execute_batch("DROP TRIGGER prevent_delete;")
            .unwrap();
        let cover = format!("covers/{}.png", original.id);
        std::fs::write(directory.path().join(&cover), b"untouched cover").unwrap();
        database
            .lock()
            .unwrap()
            .execute(
                "UPDATE books SET cover_path = ?1 WHERE id = ?2",
                [&cover, &original.id],
            )
            .unwrap();
        assert!(
            !delete(&database, &covers, &changed.id, &changed.updated_at, true)
                .unwrap()
                .cleanup_pending
        );
        assert!(get(&database, &changed.id).is_err());
        assert!(!directory.path().join(&cover).exists());
    }

    #[test]
    fn command_boundary_commits_and_reports_validation_without_database_details() {
        let directory = tempfile::tempdir().unwrap();
        let database = crate::database::open(directory.path()).unwrap();
        let details = BookDetails {
            title: "  Story  ".into(),
            target_word_count: None,
            daily_word_goal: None,
            deadline: None,
        };
        let book = create(&database, details.clone()).unwrap();
        drop(database);
        let reopened = crate::database::open(directory.path()).unwrap();
        assert_eq!(
            BookRepository::new(&mut reopened.lock().unwrap())
                .get(&book.id)
                .unwrap(),
            book
        );
        let error = create(
            &reopened,
            BookDetails {
                title: " ".into(),
                ..details
            },
        )
        .unwrap_err();
        assert_eq!(error.code, "validation");
        assert_eq!(error.issues[0].field, "title");
        assert_eq!(
            serde_json::to_value(BookCommandError::from(BookError::NotFound)).unwrap(),
            serde_json::json!({"code":"not_found", "issues":[]})
        );
    }

    #[test]
    fn editing_boundary_retains_changes_after_reopen_and_rejects_stale_writes() {
        let directory = tempfile::tempdir().unwrap();
        let database = crate::database::open(directory.path()).unwrap();
        let details = BookDetails {
            title: "Original".into(),
            target_word_count: Some(50000),
            daily_word_goal: Some(500),
            deadline: Some("2027-01-01".into()),
        };
        let original = create(&database, details.clone()).unwrap();
        let changed = update(
            &database,
            &original.id,
            &original.updated_at,
            BookDetails {
                title: "Оновлена книга".into(),
                target_word_count: None,
                daily_word_goal: None,
                deadline: None,
            },
        )
        .unwrap();
        assert_eq!(changed.id, original.id);
        assert_eq!(changed.created_at, original.created_at);
        assert_ne!(changed.updated_at, original.updated_at);
        assert_eq!(
            update(
                &database,
                &original.id,
                &original.updated_at,
                details.clone()
            )
            .unwrap_err()
            .code,
            "conflict"
        );
        assert_eq!(
            update(
                &database,
                &original.id,
                &changed.updated_at,
                BookDetails {
                    title: " ".into(),
                    ..details
                }
            )
            .unwrap_err()
            .code,
            "validation"
        );
        drop(database);
        let reopened = crate::database::open(directory.path()).unwrap();
        assert_eq!(get(&reopened, &changed.id).unwrap(), changed);
        assert_eq!(list(&reopened).unwrap(), vec![changed]);
        assert_eq!(
            get(&reopened, "00000000-0000-4000-8000-000000000001")
                .unwrap_err()
                .code,
            "not_found"
        );
    }
}
