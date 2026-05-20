use spacetimedb::{table, Identity};

#[table(name = account, public)]
pub struct Account {
    #[primary_key]
    pub owner_identity: Identity,
    pub email: String,
    pub display_name: String,
    pub avatar_url: String,
    pub created_at: u64,
}