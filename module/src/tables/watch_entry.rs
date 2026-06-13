use spacetimedb::{table, Identity};

#[table(
    name = watch_entry,
    public,
    index(name = watch_entry_item_watcher, btree(columns = [media_item_id, watcher_identity])),
    index(name = watch_entry_board_watcher, btree(columns = [board_id, watcher_identity]))
)]
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
