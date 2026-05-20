use spacetimedb::{table, Identity};

#[table(name = board, public)]
pub struct Board {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub owner_identity: Identity,
    pub title: String,
    pub description: String,
    pub sharing_mode: String,
    pub ordering_mode: String,
    #[unique]
    pub invite_token: String,
    pub created_at: u64,
    pub updated_at: u64,
}