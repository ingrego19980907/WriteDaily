use crate::{
    books::{Book, BookDetails, BookError, BookRepository, ValidationIssue},
    database::Database,
};
use serde::Serialize;
use tauri::Manager;

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
