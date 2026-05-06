use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),
    #[error("Server error ({status}): {body}")]
    Server { status: u16, body: String },
    #[error("No active session — open a session first")]
    NoSession,
    #[error("SSH tunnel error: {0}")]
    Tunnel(String),
    #[error("{0}")]
    Other(String),
}

impl serde::Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
