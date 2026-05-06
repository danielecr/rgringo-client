mod commands;
mod error;
mod http;
mod state;

use state::AppState;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::set_server_url,
            commands::get_server_url,
            commands::start_tunnel,
            commands::stop_tunnel,
            commands::open_session,
            commands::close_session,
            commands::keepalive,
            commands::list_folders,
            commands::list_folder_files,
            commands::list_entries,
            commands::get_entry,
            commands::create_entry,
            commands::update_entry,
            commands::delete_entry,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
