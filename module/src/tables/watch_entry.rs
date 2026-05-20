use spacetimedb::{table, Identity};

#[table(name = watch_entry, public)]
pub struct WatchEntry {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub board_id: u64,
    pub media_item_id: u64,
    pub watcher_identity: Identity,
    pub watched: bool,
    pub watched_at: u64,
    pub updated_at: u64,
}