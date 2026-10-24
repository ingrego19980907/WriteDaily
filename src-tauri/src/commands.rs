use crate::{
    books::{Book, BookDetails, BookError, BookRepository, ValidationIssue},
    database::Database,
};
use serde::Serialize;
use tauri::Manager;

#[derive(Debug, Serialize)]
pub struct CreateBookError {
    code: &'static str,
    issues: Vec<ValidationIssue>,
}

impl From<BookError> for CreateBookError {
    fn from(error: BookError) -> Self {
        match error {
            BookError::Validation(issues) => Self {
                code: "validation",
                issues,
            },
            _ => Self::unavailable(),
        }
    }
}

impl CreateBookError {
    fn unavailable() -> Self {
        Self {
            code: "persistence",
            issues: vec![],
        }
    }
}

fn create(database: &Database, details: BookDetails) -> Result<Book, CreateBookError> {
    let mut connection = database
        .lock()
        .map_err(|_| CreateBookError::unavailable())?;
    BookRepository::new(&mut connection)
        .create(details)
        .map_err(Into::into)
}

#[tauri::command]
pub async fn create_book(
    app: tauri::AppHandle,
    details: BookDetails,
) -> Result<Book, CreateBookError> {
    tauri::async_runtime::spawn_blocking(move || create(&app.state::<Database>(), details))
        .await
        .map_err(|_| CreateBookError::unavailable())?
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
            serde_json::to_value(CreateBookError::from(BookError::NotFound)).unwrap(),
            serde_json::json!({"code":"persistence", "issues":[]})
        );
    }
}
