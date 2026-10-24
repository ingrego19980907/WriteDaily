mod database;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let mut data_directory = app.path().app_data_dir()?;
            if cfg!(debug_assertions) {
                data_directory = data_directory.join("development");
            }
            // Fail startup on errors. Never replace/reset a database to make startup succeed.
            app.manage(database::open(&data_directory)?);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to run WriteDaily");
}
