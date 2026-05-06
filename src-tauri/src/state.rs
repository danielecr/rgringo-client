/// Shared application state held by Tauri.
use std::sync::Mutex;
use zeroize::Zeroizing;

pub struct AppState {
    /// Base URL of the rgringotts server, e.g. "http://127.0.0.1:7979"
    pub base_url: Mutex<String>,
    /// Active bearer token (empty when no session is open).
    pub token: Mutex<Zeroizing<String>>,
    /// PID of the SSH tunnel child process, if any.
    pub tunnel_pid: Mutex<Option<u32>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            base_url: Mutex::new("http://127.0.0.1:7979".into()),
            token: Mutex::new(Zeroizing::new(String::new())),
            tunnel_pid: Mutex::new(None),
        }
    }
}
