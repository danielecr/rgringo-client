use serde::{Deserialize, Serialize};
use tauri::State;
use zeroize::Zeroizing;

use crate::{
    error::{AppError, Result},
    http,
    state::AppState,
};

// ---------------------------------------------------------------------------
// Shared types (mirroring rgringotts JSON shapes)
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EntrySummary {
    pub id: usize,
    pub title: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Entry {
    pub id: usize,
    pub title: String,
    pub body: String,
}

#[derive(Serialize, Deserialize)]
pub struct EntryInput {
    pub title: String,
    pub body: String,
}

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

/// Set the base URL of the server (e.g. "http://127.0.0.1:7979").
/// Call this whenever the user changes the address field.
#[tauri::command]
pub fn set_server_url(url: String, state: State<AppState>) {
    *state.base_url.lock().unwrap() = url;
}

/// Return the current server URL.
#[tauri::command]
pub fn get_server_url(state: State<AppState>) -> String {
    state.base_url.lock().unwrap().clone()
}

// ---------------------------------------------------------------------------
// SSH tunnel
// ---------------------------------------------------------------------------

/// Spawn `ssh -N -L local_port:remote_host:remote_port ssh_host` and store
/// its PID.  Kills any previously running tunnel first.
#[tauri::command]
pub async fn start_tunnel(
    ssh_host: String,
    ssh_user: Option<String>,
    ssh_port: Option<u16>,
    local_port: u16,
    remote_host: String,
    remote_port: u16,
    state: State<'_, AppState>,
) -> Result<()> {
    stop_tunnel(state.clone()).await?;

    let user_host = match &ssh_user {
        Some(u) => format!("{u}@{ssh_host}"),
        None => ssh_host.clone(),
    };
    let port_arg = ssh_port.unwrap_or(22).to_string();
    let fwd = format!("127.0.0.1:{local_port}:{remote_host}:{remote_port}");

    let child = std::process::Command::new("ssh")
        .args(["-N", "-p", &port_arg, "-L", &fwd, &user_host])
        .spawn()
        .map_err(|e| AppError::Tunnel(e.to_string()))?;

    *state.tunnel_pid.lock().unwrap() = Some(child.id());
    Ok(())
}

/// Kill the SSH tunnel if one is running.
#[tauri::command]
pub async fn stop_tunnel(state: State<'_, AppState>) -> Result<()> {
    let mut guard = state.tunnel_pid.lock().unwrap();
    if let Some(pid) = guard.take() {
        // Platform-agnostic: send SIGTERM / TerminateProcess
        #[cfg(unix)]
        unsafe {
            libc::kill(pid as libc::pid_t, libc::SIGTERM);
        }
        #[cfg(windows)]
        {
            use std::os::windows::io::FromRawHandle;
            let handle = unsafe {
                windows::Win32::System::Threading::OpenProcess(
                    windows::Win32::System::Threading::PROCESS_TERMINATE,
                    false,
                    pid,
                )
            };
            if let Ok(h) = handle {
                unsafe { windows::Win32::System::Threading::TerminateProcess(h, 1) }.ok();
            }
        }
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

/// Open a session on the rgringotts server.
/// Stores the returned bearer token in `AppState`.
#[tauri::command]
pub async fn open_session(
    file: String,
    passphrase: String,
    state: State<'_, AppState>,
) -> Result<()> {
    let base = state.base_url.lock().unwrap().clone();
    let client = reqwest::Client::new();
    let url = format!("{base}/api/session/open");

    #[derive(Serialize)]
    struct Req<'a> {
        file: &'a str,
        passphrase: &'a str,
    }
    #[derive(Deserialize)]
    struct Resp {
        token: String,
    }

    let resp: Resp = http::post(&client, &url, None, &Req { file: &file, passphrase: &passphrase }).await?;

    // Zeroize the passphrase immediately after use
    drop(Zeroizing::new(passphrase));

    *state.token.lock().unwrap() = Zeroizing::new(resp.token);
    Ok(())
}

/// Close the session (saves to disk) and wipe the token.
#[tauri::command]
pub async fn close_session(state: State<'_, AppState>) -> Result<()> {
    let base = state.base_url.lock().unwrap().clone();
    let token = state.token.lock().unwrap().clone();
    if token.is_empty() {
        return Ok(());
    }
    let client = reqwest::Client::new();
    let url = format!("{base}/api/session");
    http::delete(&client, &url, &token).await?;
    *state.token.lock().unwrap() = Zeroizing::new(String::new());
    Ok(())
}

/// Reset the inactivity timer.
#[tauri::command]
pub async fn keepalive(state: State<'_, AppState>) -> Result<()> {
    let base = state.base_url.lock().unwrap().clone();
    let token = state.token.lock().unwrap().clone();
    if token.is_empty() {
        return Err(AppError::NoSession);
    }
    let client = reqwest::Client::new();
    let url = format!("{base}/api/session/keepalive");
    http::post_empty(&client, &url, &token).await
}

// ---------------------------------------------------------------------------
// Folder discovery
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn list_folders(state: State<'_, AppState>) -> Result<Vec<String>> {
    let base = state.base_url.lock().unwrap().clone();
    let client = reqwest::Client::new();
    http::get(&client, &format!("{base}/folders"), None).await
}

#[tauri::command]
pub async fn list_folder_files(folder: String, state: State<'_, AppState>) -> Result<Vec<String>> {
    let base = state.base_url.lock().unwrap().clone();
    let client = reqwest::Client::new();
    http::get(&client, &format!("{base}/folders/{folder}"), None).await
}

// ---------------------------------------------------------------------------
// Entries
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn list_entries(state: State<'_, AppState>) -> Result<Vec<EntrySummary>> {
    let base = state.base_url.lock().unwrap().clone();
    let token = state.token.lock().unwrap().clone();
    if token.is_empty() {
        return Err(AppError::NoSession);
    }
    let client = reqwest::Client::new();
    http::get(&client, &format!("{base}/api/entries"), Some(&token)).await
}

#[tauri::command]
pub async fn get_entry(id: usize, state: State<'_, AppState>) -> Result<Entry> {
    let base = state.base_url.lock().unwrap().clone();
    let token = state.token.lock().unwrap().clone();
    if token.is_empty() {
        return Err(AppError::NoSession);
    }
    let client = reqwest::Client::new();
    http::get(&client, &format!("{base}/api/entries/{id}"), Some(&token)).await
}

#[tauri::command]
pub async fn create_entry(title: String, body: String, state: State<'_, AppState>) -> Result<Entry> {
    let base = state.base_url.lock().unwrap().clone();
    let token = state.token.lock().unwrap().clone();
    if token.is_empty() {
        return Err(AppError::NoSession);
    }
    let client = reqwest::Client::new();
    http::post(&client, &format!("{base}/api/entries"), Some(&token), &EntryInput { title, body }).await
}

#[tauri::command]
pub async fn update_entry(
    id: usize,
    title: String,
    body: String,
    state: State<'_, AppState>,
) -> Result<Entry> {
    let base = state.base_url.lock().unwrap().clone();
    let token = state.token.lock().unwrap().clone();
    if token.is_empty() {
        return Err(AppError::NoSession);
    }
    let client = reqwest::Client::new();
    http::put(&client, &format!("{base}/api/entries/{id}"), &token, &EntryInput { title, body }).await
}

#[tauri::command]
pub async fn delete_entry(id: usize, state: State<'_, AppState>) -> Result<()> {
    let base = state.base_url.lock().unwrap().clone();
    let token = state.token.lock().unwrap().clone();
    if token.is_empty() {
        return Err(AppError::NoSession);
    }
    let client = reqwest::Client::new();
    http::delete(&client, &format!("{base}/api/entries/{id}"), &token).await
}

// ---------------------------------------------------------------------------
// Vault file creation
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn create_vault_file(
    folder: String,
    filename: String,
    passphrase: String,
    state: State<'_, AppState>,
) -> Result<()> {
    let base = state.base_url.lock().unwrap().clone();
    let client = reqwest::Client::new();
    #[derive(Serialize)]
    struct Req {
        filename: String,
        passphrase: String,
    }
    http::post_void(&client, &format!("{base}/folders/{folder}"), None, &Req { filename, passphrase }).await
}
