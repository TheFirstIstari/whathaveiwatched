#[derive(Debug)]
pub enum ReducerError {
    NotAuthenticated,
    NotAuthorized,
    NotFound,
    InvalidToken,
    DuplicateName,
    InvalidState(String),
    ExternalError(String),
}

impl std::fmt::Display for ReducerError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::NotAuthenticated       => write!(f, "NOT_AUTHENTICATED"),
            Self::NotAuthorized          => write!(f, "NOT_AUTHORIZED"),
            Self::NotFound               => write!(f, "NOT_FOUND"),
            Self::InvalidToken           => write!(f, "INVALID_TOKEN"),
            Self::DuplicateName          => write!(f, "DUPLICATE_NAME"),
            Self::InvalidState(msg)      => write!(f, "INVALID_STATE: {msg}"),
            Self::ExternalError(msg)     => write!(f, "EXTERNAL_ERROR: {msg}"),
        }
    }
}

impl From<ReducerError> for String {
    fn from(e: ReducerError) -> Self { e.to_string() }
}