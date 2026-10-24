pub mod books;
mod commands;
mod covers;
mod database;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::create_book,
            commands::list_books,
            commands::get_book,
            commands::update_book,
            commands::delete_book,
            commands::set_cover,
            commands::read_cover
        ])
        .setup(|app| {
            let mut data_directory = app.path().app_data_dir()?;
            if cfg!(debug_assertions) {
                data_directory = data_directory.join("development");
            }
            // Fail startup on errors. Never replace/reset a database to make startup succeed.
            let database = database::open(&data_directory)?;
            let covers = covers::CoverStore::new(&data_directory)?;
            let pending_cleanup = { let mut connection = database.lock().map_err(|_| std::io::Error::other("Database lock failed"))?; covers.cleanup(&mut connection).unwrap_or(true) };
            if pending_cleanup {
                eprintln!("Some cover cleanup remains queued; retrying on the next cover operation/startup.");
            }
            app.manage(database);
            app.manage(covers);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to run WriteDaily");
}
