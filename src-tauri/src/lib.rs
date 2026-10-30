mod achievement_commands;
mod achievements;
mod activity;
mod activity_commands;
mod backup_commands;
mod backups;
pub mod books;
mod chapter_commands;
pub mod chapters;
mod commands;
mod covers;
mod database;
mod editor_preferences;
mod export_commands;
mod exports;
mod preference_commands;
mod restore_commands;
mod restores;
mod schedule;
mod schedule_commands;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(exports::ExportGate::default())
        .manage(restores::RestoreState::default())
        .invoke_handler(tauri::generate_handler![
            achievement_commands::get_achievement_unlocks,
            achievement_commands::refresh_achievements,
            achievement_commands::claim_achievement_notifications,
            schedule_commands::get_writing_schedule,
            schedule_commands::save_writing_schedule,
            commands::create_book,
            activity_commands::get_daily_statistics,
            activity_commands::get_current_streak,
            activity_commands::get_longest_streak,
            commands::list_books,
            commands::get_book,
            commands::update_book,
            commands::delete_book,
            commands::set_cover,
            commands::read_cover,
            chapter_commands::list_chapters,
            chapter_commands::get_chapter,
            chapter_commands::create_chapter,
            chapter_commands::rename_chapter,
            chapter_commands::save_chapter_content,
            chapter_commands::delete_chapter,
            chapter_commands::reorder_chapters,
            export_commands::export_chapter,
            export_commands::export_book,
            backup_commands::create_library_backup,
            restore_commands::prepare_library_restore,
            restore_commands::cancel_library_restore,
            restore_commands::apply_library_restore,
            restore_commands::get_library_restore_status,
            restore_commands::close_after_library_restore,
            preference_commands::get_editor_preferences,
            preference_commands::save_editor_preferences
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
